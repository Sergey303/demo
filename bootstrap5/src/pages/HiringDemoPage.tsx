import { useCallback, useEffect, useRef, useState } from "react";

type Job = { id: string; status: string; result?: { WordCount?: number; Sha256?: string } | null };
type EventItem = { time: string; label: string; kind: "ok" | "error" | "info" };
const API = "/demo-api";
const SAMPLE = "alpha beta gamma";
const initialKey = () => "hiring-demo-" + crypto.randomUUID();

function toError(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

export function HiringDemoPage() {
  const [key, setKey] = useState(initialKey);
  const [input, setInput] = useState(SAMPLE);
  const [job, setJob] = useState<Job | null>(null);
  const [ready, setReady] = useState<"checking" | "ready" | "down">("checking");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<EventItem[]>([]);
  const mounted = useRef(true);
  const lastStatus = useRef<Record<string, string>>({});
  const activeJobId = useRef<string | null>(null);
  const addEvent = useCallback((label: string, kind: EventItem["kind"] = "info") => {
    setHistory((previous) => [{ time: new Date().toLocaleTimeString(), label, kind }, ...previous].slice(0, 16));
  }, []);

  const checkReady = useCallback(async () => {
    try {
      const response = await fetch(API + "/ready", { cache: "no-store", signal: AbortSignal.timeout(3500) });
      if (!mounted.current) return;
      setReady(response.ok ? "ready" : "down");
    } catch {
      if (mounted.current) setReady("down");
    }
  }, []);

  const checkJob = useCallback(async (id: string) => {
    try {
      const response = await fetch(API + "/jobs/" + encodeURIComponent(id), { cache: "no-store", signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error("GET /jobs/" + id + " → HTTP " + response.status);
      const value = (await response.json()) as Job;
      if (!mounted.current || activeJobId.current !== id || value.id !== id) return;
      const previousStatus = lastStatus.current[value.id];
      if (previousStatus && previousStatus !== value.status) {
        addEvent("Job " + value.id.slice(0, 8) + " → " + value.status, value.status === "done" ? "ok" : "info");
      }
      lastStatus.current[value.id] = value.status;
      setJob(value);
    } catch {
      // The current request may fail during the intentionally stopped API.
      // Keep the last real job state visible; never fabricate a transition.
    }
  }, [addEvent]);

  useEffect(() => {
    mounted.current = true;
    void checkReady();
    const interval = window.setInterval(() => {
      void checkReady();
    }, 3000);
    return () => { mounted.current = false; window.clearInterval(interval); };
  }, [checkReady]);

  useEffect(() => {
    if (!job?.id || job.status === "done" || job.status === "failed") return;
    const id = job.id;
    const interval = window.setInterval(() => { void checkJob(id); }, 1300);
    return () => window.clearInterval(interval);
  }, [job?.id, job?.status, checkJob]);

  async function submit(mode: "same" | "conflict") {
    if (busy) return;
    setBusy(true);
    const message = mode === "conflict" ? input + " deliberately changed" : input;
    const start = performance.now();
    try {
      const response = await fetch(API + "/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ text: message }),
        signal: AbortSignal.timeout(7000),
      });
      const value: unknown = await response.json();
      const latency = Math.round(performance.now() - start);
      if (response.status === 409) {
        addEvent("409 Conflict · same key, different payload · " + latency + " ms", "ok");
      } else if (response.ok && typeof value === "object" && value !== null && "id" in value && typeof value.id === "string") {
        const data = value as Job;
        if (job && job.id !== data.id) addEvent("WARNING: retry returned different ID", "error");
        activeJobId.current = data.id;
        lastStatus.current[data.id] = data.status;
        setJob(data);
        addEvent(response.status + " · " + data.status + " · job " + data.id.slice(0, 8) + " · " + latency + " ms", "ok");
        void checkJob(data.id);
      } else {
        addEvent("Unexpected HTTP " + response.status, "error");
      }
    } catch (error) {
      addEvent("Request failed: " + toError(error) + ". No success was assumed.", "error");
    } finally {
      setBusy(false);
    }
  }

  function newScenario() {
    setKey(initialKey());
    setInput(SAMPLE);
    activeJobId.current = null;
    setJob(null);
    setHistory([]);
    addEvent("New scenario · new idempotency key");
  }

  return (
    <section className="container-fluid p-0" data-testid="hiring-demo">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <span className="text-uppercase small fw-bold text-primary">Engineering portfolio · live infrastructure</span>
          <h1 className="display-6 fw-semibold mt-2 mb-2">Reliable Jobs — интерактивная демонстрация</h1>
          <p className="text-secondary mb-0">ASP.NET Core · PostgreSQL · transactional outbox · идемпотентность · восстановление после перезапуска</p>
        </div>
        <span className={"badge fs-6 " + (ready === "ready" ? "text-bg-success" : ready === "down" ? "text-bg-danger" : "text-bg-secondary")}
          role="status" data-testid="api-status">
          {ready === "ready" ? "API + PostgreSQL: ready" : ready === "down" ? "API / DB: unavailable" : "Checking…"}
        </span>
      </div>

      <div className="alert alert-info" role="note">
        <strong>Все действия реальные.</strong> Эта страница обращается к локальному .NET API через Vite proxy.
        Если API недоступен, показывается отказ, а не имитация результата. Внешние сервисы и секреты не используются.
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center gap-2">
                <h2 className="h5 mb-0">1. Принять задачу атомарно</h2>
                <button className="btn btn-sm btn-outline-secondary" onClick={newScenario} disabled={busy}>Новый сценарий</button>
              </div>
              <label htmlFor="demo-payload" className="form-label mt-3">Текст задачи (1–2000 символов)</label>
              <textarea id="demo-payload" className="form-control" value={input} rows={2} maxLength={2000}
                onChange={(event) => setInput(event.target.value)} disabled={busy || Boolean(job)} />
              <label htmlFor="demo-key" className="form-label mt-3">Idempotency-Key (сохраняется при повторе)</label>
              <input id="demo-key" className="form-control font-monospace small" value={key} readOnly />
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button className="btn btn-primary" disabled={busy || ready !== "ready" || !input.trim()} onClick={() => void submit("same")}>POST /jobs</button>
                <button className="btn btn-outline-primary" disabled={busy || !job} onClick={() => void submit("same")}>Повторить тот же запрос</button>
                <button className="btn btn-outline-danger" disabled={busy || !job} onClick={() => void submit("conflict")}>Попробовать другой payload → 409</button>
              </div>
            </div>
          </div>
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <h2 className="h5">2. Проверить сохранённый результат</h2>
              {job ? (
                <>
                  <div className="mb-2"><span className="text-secondary">Job ID:</span> <code className="text-break">{job.id}</code></div>
                  <div className="mb-2"><span className="text-secondary">Статус:</span> <strong data-testid="job-status">{job.status}</strong></div>
                  {job.result ? <pre className="p-3 bg-body-tertiary rounded small overflow-auto">{JSON.stringify(job.result, null, 2)}</pre>
                    : <p className="text-secondary small mb-0">Ожидание worker или последнего успешного чтения из БД.</p>}
                  <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => void checkJob(job.id)}>Обновить из PostgreSQL</button>
                </>
              ) : <p className="text-secondary mb-0">Отправьте задачу. Здесь появится только фактически полученный ответ API.</p>}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-5">
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <h2 className="h5">3. Восстановление после сбоя</h2>
              <p className="small">После завершения задачи остановите и снова запустите <strong>весь API-процесс</strong> в терминале launcher. Статус переключится в unavailable, затем в ready.</p>
              <p className="small">Нажмите «Повторить тот же запрос»: API должен вернуть прежний Job ID без создания второй задачи. Проверьте также сохранённый результат.</p>
              <p className="text-secondary small mb-0">Это проверка сохранности данных при перезапуске API, а <strong>не</strong> отдельный crash-test worker. Успех фиксируется только по фактическим ответам.</p>
            </div>
          </div>
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="h5">Журнал действий</h2>
              <ol className="list-unstyled d-flex flex-column gap-2 mb-0" aria-live="polite">
                {history.length ? history.map((item, index) => (
                  <li key={index} className="border-bottom pb-2 small">
                    <span className="text-secondary me-2">{item.time}</span>
                    <span className={item.kind === "error" ? "text-danger" : item.kind === "ok" ? "text-success" : ""}>{item.label}</span>
                  </li>
                )) : <li className="text-secondary small">Здесь появятся реальные HTTP-события.</li>}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
