import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { VerifyIdentity } from "./enterpriseIdentity";
import { DocumentUploadCard } from "./DocumentUploadCard";
import { UnifiedSearchCard } from "./UnifiedSearchCard";
import { AgentWorkflowCard } from "./AgentWorkflowCard";

type JobStatus = "queued" | "done" | "failed";
type Segment = { source: string; start: number; end: number; text: string };
type AudioJob = { id: string; status: JobStatus; source: string | null; segments: Segment[] };

const API = "/enterprise-api";
const MAX_WAV_BYTES = 262_144;
const newKey = () => "enterprise-audio-" + crypto.randomUUID();

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function projectAudioJob(value: unknown): AudioJob {
  if (!isRecord(value) || typeof value.id !== "string" ||
    !["queued", "done", "failed"].includes(String(value.status))) {
    throw new Error("API вернул неизвестный формат состояния задачи.");
  }

  const result = isRecord(value.result) ? value.result : null;
  const rawSegments = result && Array.isArray(result.segments) ? result.segments : [];
  const segments: Segment[] = [];
  for (const item of rawSegments) {
    if (!isRecord(item) || typeof item.source !== "string" ||
      typeof item.text !== "string" || typeof item.start !== "number" ||
      typeof item.end !== "number" || !Number.isFinite(item.start) ||
      !Number.isFinite(item.end) || item.start < 0 || item.end < item.start) {
      throw new Error("Транскрипт содержит неверные фрагменты.");
    }
    // Deliberately discard persisted embedding vectors and all other DB fields.
    segments.push({ source: item.source, text: item.text, start: item.start, end: item.end });
  }
  return {
    id: value.id,
    status: value.status as JobStatus,
    source: typeof result?.source === "string" ? result.source : null,
    segments,
  };
}

function errorForStatus(status: number): string {
  if (status === 401) return "Серверная демо-сессия недоступна. Проверьте DEMO_AUTH_SECRET.";
  if (status === 404) return "Задача не найдена или доступ к ней отозван.";
  if (status === 409) return "409 Conflict — этот ключ уже связан с другим содержимым.";
  if (status === 503) return "Сервис или его обязательная зависимость сейчас недоступны.";
  return "API вернул HTTP " + status + ".";
}

function isValidFile(file: File): string | null {
  if (!/^[A-Za-z0-9._-]{1,100}\.wav$/i.test(file.name) || file.name.length < 5) {
    return "Допускается простое имя файла .wav (ASCII, 5–100 символов).";
  }
  if (file.size < 44 || file.size > MAX_WAV_BYTES) {
    return "WAV должен быть не меньше 44 байт и не больше 256 КиБ.";
  }
  return null;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function isWave(bytes: Uint8Array): boolean {
  return bytes.length >= 44 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WAVE";
}

export function EnterpriseAiPage() {
  const [session, setSession] = useState<{ identity: string; epoch: number } | null>(null);
  const [identityError, setIdentityError] = useState("Проверяем демо-идентичность…");
  const principal = useRef<string | null>(null);
  const epoch = useRef(0);
  const pending = useRef<Promise<string> | null>(null);
  const identityController = useRef<AbortController | null>(null);

  const verifyIdentity: VerifyIdentity = useCallback(async (expected?: string) => {
    if (!pending.current) {
      const ctrl = new AbortController();
      identityController.current = ctrl;
      const timer = window.setTimeout(() => ctrl.abort(), 3500);
      pending.current = (async () => {
        try {
          const response = await fetch("/enterprise-search/agent/identity", {
            signal: ctrl.signal, cache: "no-store",
          });
          if (!response.ok) throw new Error("Демо-идентичность не подтверждена.");
          const value = await response.json() as Record<string, unknown>;
          if (value.identity_kind !== "local_demo" || ![value.tenant, value.subject].every(
            x => typeof x === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(x)))
            throw new Error("Некорректная демо-идентичность.");
          if (ctrl.signal.aborted) throw new Error("Проверка демо-идентичности прервана.");
          const identity = value.tenant + " / " + value.subject;
          if (principal.current !== identity) {
            principal.current = identity;
            epoch.current++;
            // Commit the epoch before any old asynchronous operation can resume.
            flushSync(() => setSession({ identity, epoch: epoch.current }));
          }
          setIdentityError("");
          return identity;
        } catch (err) {
          if (identityController.current === ctrl) {
            principal.current = null;
            epoch.current++;
            flushSync(() => {
              setSession(null);
              setIdentityError(err instanceof Error ? err.message : "Демо-идентичность не подтверждена.");
            });
          }
          throw err;
        } finally {
          window.clearTimeout(timer);
        }
      })().finally(() => {
        if (identityController.current === ctrl) {
          pending.current = null;
          identityController.current = null;
        }
      });
    }
    const identity = await pending.current;
    if (expected !== undefined && expected !== identity)
      throw new Error("Демо-идентичность изменилась. Повторите запрос.");
    return identity;
  }, []);

  useEffect(() => {
    const refresh = () => { void verifyIdentity().catch(() => {}); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      identityController.current?.abort();
      identityController.current = null;
      pending.current = null;
    };
  }, [verifyIdentity]);

  return <>
    <p role="status" data-testid="enterprise-identity">
      {session ? "Demo identity (не SSO): " + session.identity : identityError}
    </p>
    {session && <VerifiedEnterprisePage key={session.epoch}
      identity={session.identity} verifyIdentity={verifyIdentity} />}
  </>;
}

function VerifiedEnterprisePage({ identity, verifyIdentity }: {
  identity: string; verifyIdentity: VerifyIdentity;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState(newKey);
  const [job, setJob] = useState<AudioJob | null>(null);
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<"checking" | "ready" | "down">("checking");
  const fileInput = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const activeJob = useRef<string | null>(null);
  const controllers = useRef(new Set<AbortController>());

  const track = useCallback(() => {
    const controller = new AbortController();
    controllers.current.add(controller);
    return controller;
  }, []);
  const clearPending = useCallback(() => {
    generation.current += 1;
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
  }, []);

  useLayoutEffect(() => () => clearPending(), [clearPending]);

  useEffect(() => {
    let mounted = true;
    const checkReady = async () => {
      const controller = track();
      try {
        const response = await fetch(API + "/ready", { cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(3500)]) });
        if (mounted) setReady(response.ok ? "ready" : "down");
      } catch {
        if (mounted && !controller.signal.aborted) setReady("down");
      } finally {
        controllers.current.delete(controller);
      }
    };
    void checkReady();
    const timer = window.setInterval(() => void checkReady(), 3000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [track]);

  const refreshJob = useCallback(async (id: string) => {
    const version = generation.current;
    const controller = track();
    try {
      const response = await fetch(API + "/jobs/" + encodeURIComponent(id),
        { cache: "no-store", signal: controller.signal });
      if (version !== generation.current || activeJob.current !== id) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          // Invalidate rendered evidence immediately after authorization failure.
          setJob(null);
          activeJob.current = null;
          setError(errorForStatus(response.status));
          return;
        }
        throw new Error(errorForStatus(response.status));
      }
      const parsed = projectAudioJob(await response.json() as unknown);
      if (version !== generation.current || activeJob.current !== id) return;
      if (parsed.id !== id) throw new Error("API вернул другой Job ID.");
      setJob(parsed);
      setError(parsed.status === "failed" ? "Worker завершил задачу со статусом failed." : null);
    } catch (caught) {
      if (version !== generation.current || controller.signal.aborted || activeJob.current !== id) return;
      setError(caught instanceof Error ? caught.message : "Ошибка запроса состояния задачи.");
    } finally {
      controllers.current.delete(controller);
    }
  }, [track]);

  useEffect(() => {
    if (!job || job.status !== "queued") return;
    const timer = window.setInterval(() => void refreshJob(job.id), 1600);
    return () => window.clearInterval(timer);
  }, [job, refreshJob]);

  function chooseFile(next: File | null) {
    clearPending();
    activeJob.current = null;
    setFile(next);
    setKey(newKey());
    setJob(null);
    setError(next ? isValidFile(next) : null);
    setLastSubmission(null);
    setBusy(false);
  }

  function reset() {
    chooseFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit() {
    if (!file || busy) return;
    const problem = isValidFile(file);
    if (problem) { setError(problem); return; }
    const version = generation.current;
    const controller = track();
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isWave(bytes)) throw new Error("Файл не содержит RIFF/WAVE заголовок.");
      if (version !== generation.current) return;
      const response = await fetch(API + "/audio-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ filename: file.name, wavBase64: encodeBase64(bytes) }),
        signal: controller.signal,
      });
      if (version !== generation.current) return;
      if (!response.ok) {
        if (response.status === 409) setLastSubmission("409 Conflict · разные данные для одного Idempotency-Key");
        throw new Error(errorForStatus(response.status));
      }
      const body: unknown = await response.json();
      if (version !== generation.current) return;
      if (!isRecord(body) || typeof body.id !== "string" ||
        (response.status !== 200 && response.status !== 202)) {
        throw new Error("Неожиданный ответ на загрузку аудио.");
      }
      if (activeJob.current && activeJob.current !== body.id) {
        throw new Error("Повтор запроса вернул другой идентификатор задачи.");
      }
      activeJob.current = body.id;
      setJob((previous) => previous?.id === body.id ? previous : {
        id: body.id as string, status: "queued", source: null, segments: [],
      });
      setLastSubmission(response.status === 202 ? "202 Accepted · запись сохранена" :
        "200 already-accepted · прежний Job ID");
      void refreshJob(body.id);
    } catch (caught) {
      if (version !== generation.current || controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки WAV.");
    } finally {
      controllers.current.delete(controller);
      if (version === generation.current) setBusy(false);
    }
  }

  return (
    <section className="container-fluid p-0" data-testid="enterprise-ai">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <span className="text-uppercase small fw-bold text-primary">Enterprise AI · audio &amp; document pipeline</span>
          <h1 className="display-6 fw-semibold mt-2 mb-2">Аудио и документы → доказательства</h1>
          <p className="text-secondary mb-0">React · ASP.NET Core · PostgreSQL outbox · Python Whisper · ONNX</p>
        </div>
        <span className={"badge fs-6 " + (ready === "ready" ? "text-bg-success" :
          ready === "down" ? "text-bg-danger" : "text-bg-secondary")} role="status" data-testid="enterprise-ready">
          {ready === "ready" ? "API + PostgreSQL: ready" :
            ready === "down" ? "API / DB / demo auth: unavailable" : "Проверяем API…"}
        </span>
      </div>

      <div className="alert alert-info" role="note">
        <strong>Настоящая цепочка, без подставного результата.</strong> WAV принимается в транзакции до
        распознавания; Python worker обрабатывает его отдельно. Зелёный индикатор подтверждает
        только API + PostgreSQL, а не наличие модели или готовность worker.
        Доступ ограничен фиксированным локальным демо-профилем.
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h2 className="h5 mb-0">1. Загрузить WAV</h2>
                <button className="btn btn-sm btn-outline-secondary" onClick={reset} disabled={busy}>
                  Новый сценарий
                </button>
              </div>
              <label className="form-label mt-3" htmlFor="enterprise-wav">
                WAV-аудио (RIFF/WAVE, 44 байта – 256 КиБ)
              </label>
              <input ref={fileInput} className="form-control" id="enterprise-wav"
                type="file" accept=".wav,audio/wav" disabled={busy}
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              <div className="small text-secondary mt-2">
                {file ? file.name + " · " + file.size + " байт" : "Исходный WAV не загружается в облачный сервис."}
              </div>
              <label className="form-label mt-3" htmlFor="enterprise-key">
                Idempotency-Key — повторная отправка использует тот же ключ
              </label>
              <input id="enterprise-key" className="form-control font-monospace small" readOnly value={key} />
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button className="btn btn-primary" onClick={() => void submit()}
                  disabled={busy || !file || Boolean(isValidFile(file)) || ready !== "ready"}>
                  {busy ? "Отправляем…" : "Отправить WAV"}
                </button>
                <button className="btn btn-outline-primary" onClick={() => void submit()}
                  disabled={busy || !file || !job}>
                  Повторить тот же запрос
                </button>
              </div>
              {lastSubmission && <p className="text-success small mt-3 mb-0" data-testid="enterprise-post">{lastSubmission}</p>}
              {error && <div role="alert" className="alert alert-danger mt-3 mb-0">{error}</div>}
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <h2 className="h5">2. Сохранённый транскрипт</h2>
              {!job ? <p className="text-secondary mb-0">После принятия задачи здесь появятся реальные данные API.</p> : (
                <>
                  <div className="small mb-2">Job ID: <code className="text-break" data-testid="enterprise-job-id">{job.id}</code></div>
                  <div className="mb-3">Статус: <strong data-testid="enterprise-job-status">{job.status}</strong></div>
                  {job.status === "queued" && <p className="text-secondary small">
                    Задача принята; ожидаем фактического результата Python worker.
                  </p>}
                  {job.status === "done" && (
                    <div>
                      <p className="small mb-2">Источник: <strong>{job.source ?? "не указан"}</strong></p>
                      {job.segments.length === 0 && <p className="text-secondary small">
                        Worker завершился, но речевых фрагментов не обнаружено.
                      </p>}
                      <ol className="list-group list-group-numbered">
                        {job.segments.map((segment, index) => (
                          <li key={index} className="list-group-item">
                            <span className="badge text-bg-secondary me-2">
                              {segment.start.toFixed(2)}–{segment.end.toFixed(2)} с
                            </span>
                            <span>{segment.text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <button className="btn btn-sm btn-outline-secondary mt-3"
                    onClick={() => void refreshJob(job.id)}>
                    Перечитать из PostgreSQL
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <h2 className="h5">3. Что здесь доказано</h2>
              <p className="small">Приём WAV, идемпотентность, отдельный Python worker и
                сохранение распознанных фрагментов проверяются по фактическим HTTP-ответам.
                Повтор отправки должен вернуть прежний UUID.</p>
              <p className="small mb-0 text-secondary">
                Авторизованный поиск по аудио и документам доступен ниже; он возвращает только
                фрагменты источников. Ниже доступны локальная генерация Qwen3 и MCP tool calling с подтверждением записей. Цитаты не гарантируют смысловую достоверность ответа.
              </p>
            </div>
          </div>
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="h5">Границы безопасности</h2>
              <p className="small">Токен формируется только локальным Vite proxy из серверного секрета.
                Браузер не выбирает tenant и не получает bearer. Это демонстрационный,
                а не production-вход.</p>
              <p className="small mb-0 text-secondary">
                Источник отображается как обычный текст. Векторы embeddings не передаются из API в браузер.
                Отзыв доступа проверяется на каждом серверном чтении.
              </p>
            </div>
          </div>
        </div>
      </div>
      <DocumentUploadCard />
      <UnifiedSearchCard />
      <AgentWorkflowCard identity={identity} verifyIdentity={verifyIdentity} />
    </section>
  );
}
