import { useEffect, useRef, useState } from "react";

type DocSegment = { source: string; text: string; chunk_index: number; char_start: number; char_end: number };
type DocJob = { id: string; status: "queued" | "done" | "failed"; source: string | null; segments: DocSegment[] };
const MAX_BYTES = 24_576;
const API = "/enterprise-api";

function parseDocument(value: unknown, expectedId: string): DocJob {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid job response");
  const obj = value as Record<string, unknown>;
  if (obj.id !== expectedId || !["queued", "done", "failed"].includes(String(obj.status))) {
    throw new Error("Unexpected job ID or status");
  }
  const result = obj.result && typeof obj.result === "object" && !Array.isArray(obj.result)
    ? obj.result as Record<string, unknown> : null;
  const raw = result && Array.isArray(result.segments) ? result.segments : [];
  const segments: DocSegment[] = raw.map((row: unknown) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Bad document segment");
    const part = row as Record<string, unknown>;
    if (typeof part.source !== "string" || typeof part.text !== "string" ||
      !Number.isInteger(part.chunk_index) || !Number.isInteger(part.char_start) ||
      !Number.isInteger(part.char_end) || Number(part.char_start) < 0 ||
      Number(part.char_end) <= Number(part.char_start)) {
      throw new Error("Invalid document evidence");
    }
    return { source: part.source, text: part.text, chunk_index: Number(part.chunk_index),
      char_start: Number(part.char_start), char_end: Number(part.char_end) };
  });
  return { id: expectedId, status: obj.status as DocJob["status"],
    source: typeof result?.source === "string" ? result.source : null, segments };
}

function filenameValid(name: string): boolean {
  return name.length >= 5 && name.length <= 100 && /^[A-Za-z0-9._-]+\.(txt|md)$/i.test(name);
}

export function DocumentUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState(() => "enterprise-doc-" + crypto.randomUUID());
  const [job, setJob] = useState<DocJob | null>(null);
  const [ack, setAck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const revision = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const input = useRef<HTMLInputElement>(null);
  const activeId = useRef<string | null>(null);
  const abortAll = () => {
    revision.current++;
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
  };
  useEffect(() => () => {
    revision.current++;
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
  }, []);

  function choose(next: File | null) {
    abortAll();
    activeId.current = null;
    setFile(next);
    setJob(null);
    setAck(null);
    setError(next && (!filenameValid(next.name) || next.size < 1 || next.size > MAX_BYTES)
      ? "Требуется .txt/.md с ASCII-именем, размером от 1 байта до 24 КиБ." : null);
    setKey("enterprise-doc-" + crypto.randomUUID());
    setSubmitting(false);
  }
  function reset() {
    choose(null);
    if (input.current) input.current.value = "";
  }

  async function readJob(id: string) {
    const expected = revision.current;
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      const response = await fetch(API + "/jobs/" + encodeURIComponent(id),
        { signal: controller.signal, cache: "no-store" });
      if (revision.current !== expected || activeId.current !== id) return;
      if (!response.ok) {
        if (response.status === 404 || response.status === 401) {
          activeId.current = null;
          setJob(null);
          setError("Документ не найден или доступ отозван (404/401).");
          return;
        }
        throw new Error("Ошибка чтения документа HTTP " + response.status);
      }
      const next = parseDocument(await response.json() as unknown, id);
      if (revision.current !== expected || activeId.current !== id) return;
      setJob(next);
      setError(next.status === "failed" ? "Индексация завершилась ошибкой; проверьте журнал worker." : null);
    } catch (caught) {
      if (!controller.signal.aborted && revision.current === expected) {
        setError(caught instanceof Error ? caught.message : "Сетевая ошибка при чтении");
      }
    } finally {
      controllers.current.delete(controller);
    }
  }

  useEffect(() => {
    if (job?.status !== "queued") return;
    const id = job.id;
    const interval = window.setInterval(() => void readJob(id), 1600);
    return () => window.clearInterval(interval);
  }, [job?.id, job?.status]);

  async function submit() {
    if (!file || submitting || !filenameValid(file.name) || file.size < 1 || file.size > MAX_BYTES) return;
    const expected = revision.current;
    const controller = new AbortController();
    controllers.current.add(controller);
    setSubmitting(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { throw new Error("Файл не является корректным UTF-8."); }
      if (!text.trim() || text.includes("\0")) throw new Error("Документ должен содержать непустой UTF-8 текст.");
      if (revision.current !== expected) return;
      const response = await fetch(API + "/document-jobs", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ filename: file.name, text }), signal: controller.signal,
      });
      if (revision.current !== expected) return;
      if (!response.ok) {
        throw new Error(response.status === 409
          ? "409 Conflict — ключ уже использован для другого документа."
          : "Не удалось принять документ: HTTP " + response.status);
      }
      if (response.status !== 200 && response.status !== 202) throw new Error("Unexpected HTTP status");
      const payload = await response.json() as { id?: unknown };
      if (revision.current !== expected) return;
      if (typeof payload.id !== "string" || !/^[\da-f-]{36}$/i.test(payload.id) ||
          (activeId.current && activeId.current !== payload.id)) throw new Error("Unexpected Job ID");
      activeId.current = payload.id;
      setJob(previous => previous?.id === payload.id ? previous : {
        id: payload.id as string, status: "queued", source: null, segments: [],
      });
      setAck(response.status === 202 ? "202 Accepted · документ сохранён" : "200 already-accepted · тот же Job ID");
      void readJob(payload.id);
    } catch (caught) {
      if (!controller.signal.aborted && revision.current === expected) {
        setError(caught instanceof Error ? caught.message : "Ошибка загрузки документа");
      }
    } finally {
      controllers.current.delete(controller);
      if (revision.current === expected) setSubmitting(false);
    }
  }

  return <section className="card shadow-sm mt-4" data-testid="enterprise-document">
    <div className="card-body p-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h5 mb-0">Документы · долговременная индексация</h2>
        <button className="btn btn-sm btn-outline-secondary" onClick={reset} disabled={submitting}>
          Новый документ
        </button>
      </div>
      <p className="text-secondary small mt-2 mb-3">
        Реальный UTF-8 .txt/.md → общий PostgreSQL outbox → Python ONNX → сохранённые фрагменты.
        Пока без PDF, облака и полнотекстового вопроса к документу.
      </p>
      <label htmlFor="enterprise-document-file" className="form-label">Документ (до 24 КиБ)</label>
      <input ref={input} type="file" id="enterprise-document-file"
        className="form-control" accept=".txt,.md,text/plain,text/markdown" disabled={submitting}
        onChange={event => choose(event.target.files?.[0] ?? null)} />
      <p className="small text-secondary mt-2">{file ? file.name + " · " + file.size + " байт" : "Выберите текстовый документ"}</p>
      <div className="d-flex gap-2 flex-wrap">
        <button className="btn btn-primary" onClick={() => void submit()}
          disabled={submitting || !file || !filenameValid(file.name) || file.size < 1 || file.size > MAX_BYTES}>
          {submitting ? "Отправляем…" : "Индексировать документ"}
        </button>
        <button className="btn btn-outline-primary" onClick={() => void submit()} disabled={submitting || !job}>
          Повторить тот же запрос
        </button>
      </div>
      {ack && <p className="small text-success mt-3 mb-0" data-testid="document-ack">{ack}</p>}
      {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
      {job && <div className="mt-3" data-testid="document-result">
        <p className="small mb-1">Job ID: <code data-testid="document-job-id">{job.id}</code></p>
        <p className="small mb-2">Статус: <strong data-testid="document-job-status">{job.status}</strong></p>
        {job.status === "done" && <div>
          <p className="small mb-2">Источник: {job.source ?? "не указан"} · {job.segments.length} фрагм.</p>
          <ol className="list-group list-group-numbered">
            {job.segments.map(part => <li className="list-group-item" key={part.chunk_index}>
              <span className="small text-secondary">Символы {part.char_start}–{part.char_end}</span>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{part.text}</p>
            </li>)}
          </ol>
        </div>}
        <button className="btn btn-sm btn-outline-secondary mt-3" onClick={() => void readJob(job.id)}>
          Перечитать из PostgreSQL
        </button>
      </div>}
    </div>
  </section>;
}
