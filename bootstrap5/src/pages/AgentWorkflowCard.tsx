import { useEffect, useRef, useState } from "react";

type Citation = {
  job_id: string; source: string; quote: string;
  kind: "audio" | "document"; start?: number; end?: number;
  char_start?: number; char_end?: number;
};
type Trace = { tool: "search_evidence" | "propose_review_note"; status: string; citations?: number };
type Pending = { approval_token: string; approval_id: string; job_id: string; note: string };
type Gateway = {
  version: "demo-gateway-v1";
  identity: "server_bound";
  tools: "allowlisted";
  output: "validated";
};
type AgentResult = {
  status: "answered" | "abstained" | "approval_required";
  answer: string; citations: Citation[];
  tool_trace: Trace[]; pending?: Pending; reason?: string; gateway?: Gateway;
};

function validUuid(text: unknown): text is string {
  return typeof text === "string" && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(text);
}

function project(value: unknown): AgentResult {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Неверный ответ MCP-агента");
  const v = value as Record<string, unknown>;
  if (v.mode !== "mcp_agent" || v.model !== "qwen3:8b" ||
      v.semantic_verified !== false || typeof v.answer !== "string" ||
      !["answered", "abstained", "approval_required"].includes(String(v.status)) ||
      !Array.isArray(v.citations) || v.citations.length > 2 ||
      !Array.isArray(v.tool_trace) || v.tool_trace.length > 2)
    throw new Error("Нарушен контракт MCP-агента");
  const citations = v.citations.map((raw: unknown): Citation => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error("Неверная цитата агента");
    const c = raw as Record<string, unknown>;
    if (!validUuid(c.job_id) || typeof c.source !== "string" ||
        typeof c.quote !== "string" || !c.quote.trim() ||
        !["audio", "document"].includes(String(c.kind)))
      throw new Error("Источник агента не подтверждён");
    return { job_id: c.job_id, source: c.source, quote: c.quote,
      kind: c.kind as "audio" | "document",
      ...(typeof c.start === "number" ? { start:c.start } : {}),
      ...(typeof c.end === "number" ? { end:c.end } : {}),
      ...(typeof c.char_start === "number" ? { char_start:c.char_start } : {}),
      ...(typeof c.char_end === "number" ? { char_end:c.char_end } : {}),
    };
  });
  const tool_trace= v.tool_trace.map((raw: unknown): Trace => {
    const t = raw as Record<string, unknown>;
    if (!t || !["search_evidence", "propose_review_note"].includes(String(t.tool)) ||
        typeof t.status !== "string") throw new Error("Неверный журнал инструментов");
    return {tool:t.tool as Trace["tool"],status:t.status,
      ...(typeof t.citations === "number" ? {citations:t.citations} : {})};
  });
  let pending: Pending | undefined;
  if (v.status === "approval_required") {
    const p=v.pending as Record<string, unknown> | null;
    if (!p || !validUuid(p.approval_id) || !validUuid(p.job_id) ||
        typeof p.note !== "string" || !p.note.trim() || p.note.length > 500 ||
        typeof p.approval_token !== "string" || p.approval_token.length > 100)
      throw new Error("Некорректное подтверждение действия");
    pending={approval_id:p.approval_id,job_id:p.job_id,note:p.note,
      approval_token:p.approval_token};
    if (!citations.some(c => c.job_id === pending?.job_id))
      throw new Error("Запись предложена без разрешённого источника");
  }
  if (v.status === "answered" && (!v.answer.trim() || citations.length===0))
    throw new Error("Ответ агента без цитаты");
  if (v.status === "abstained" && citations.length) throw new Error("Цитаты при отказе");
  const g = v.gateway as Record<string, unknown> | undefined;
  const gateway: Gateway | undefined = g?.version === "demo-gateway-v1" &&
    g.identity === "server_bound" && g.tools === "allowlisted" &&
    g.output === "validated"
    ? {version:"demo-gateway-v1",identity:"server_bound",
       tools:"allowlisted",output:"validated"} : undefined;
  return {status:v.status as AgentResult["status"],answer:v.answer,
          citations,tool_trace,pending,gateway,
          reason:typeof v.reason === "string" ? v.reason : undefined};
}

export function AgentWorkflowCard() {
  const [question,setQuestion]=useState("");
  const [result,setResult]=useState<AgentResult|null>(null);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const current=useRef<AbortController|null>(null);

  useEffect(()=>()=>{current.current?.abort();},[]);

  function change(text:string) {
    current.current?.abort();
    setQuestion(text);setResult(null);setStatus("");setError("");setBusy(false);
  }

  async function run(task:"answer"|"note") {
    if (!question.trim() || question.length>500 || busy)return;
    const ctrl=new AbortController();
    current.current?.abort();current.current=ctrl;
    setBusy(true);setResult(null);setStatus("");setError("");
    try {
      const response=await fetch("/enterprise-search/agent/run",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question:question.trim(),task}),
        signal:ctrl.signal,cache:"no-store",
      });
      if (!response.ok) throw new Error(response.status===503
        ? "MCP/Ollama недоступны или заняты (503)."
        : response.status===422 ? "AI Gateway отклонил входной запрос до обращения к модели."
        : response.status===401 ? "Демо-идентичность не подтверждена (401)."
        : "Ошибка агента HTTP "+response.status);
      const value=project(await response.json());
      if (current.current===ctrl)setResult(value);
    } catch(err) {
      if (!ctrl.signal.aborted)setError(err instanceof Error?err.message:"Ошибка агента");
    } finally {
      if(current.current===ctrl){current.current=null;setBusy(false);}
    }
  }

  async function decide(decision:"approve"|"reject") {
    const pending=result?.pending;
    if(!pending||busy)return;
    setBusy(true);setError("");
    try {
      const response=await fetch("/enterprise-search/agent/confirm",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({approval_token:pending.approval_token,decision}),cache:"no-store",
      });
      if(!response.ok)throw new Error(response.status===404
        ? "Разрешение уже использовано, истекло или доступ отозван."
        : "Запись не подтверждена: HTTP "+response.status);
      const v=await response.json() as {status?:unknown;note_id?:unknown};
      if(v.status!==(decision==="approve"?"written":"rejected"))
        throw new Error("Некорректный результат подтверждения");
      setStatus(decision==="approve"?"Заметка сохранена в PostgreSQL.":"Действие отклонено без записи.");
    }catch(err){
      setError(err instanceof Error?err.message:"Подтверждение не удалось");
      // Any confirmation failure can mean that source access has been
      // revoked while the user was reading. Remove all stale excerpts.
      setResult(null);
    }finally{
      // Never replay this approval capability, even after a transient error.
      setResult(prev=>prev?{...prev,pending:undefined}:null);
      setBusy(false);
    }
  }

  return <section className="card shadow-sm mt-4" data-testid="mcp-agent">
    <div className="card-body p-4">
      <h2 className="h5">MCP · настоящий Qwen3 tool calling</h2>
      <p className="small text-secondary">
        Локальная модель выбирает вызов инструмента. Официальный MCP-клиент по stdio
        обращается к серверу с текущими PostgreSQL-грантами. Записывающая операция
        создаёт только предложение, пока вы не подтвердите его.
      </p>
      <label htmlFor="mcp-task" className="form-label">Запрос агенту</label>
      <textarea id="mcp-task" className="form-control" rows={2} maxLength={500}
        disabled={busy} value={question} onChange={e=>change(e.target.value)}
        placeholder="Найди срок возврата и предложи заметку: обновить политику возвратов" />
      <div className="d-flex flex-wrap gap-2 mt-2">
        <button type="button" className="btn btn-outline-primary"
          onClick={()=>void run("answer")} disabled={busy||!question.trim()}>
          {busy?"MCP/Ollama…":"Спросить через MCP"}
        </button>
        <button type="button" className="btn btn-outline-secondary"
          onClick={()=>void run("note")} disabled={busy||!question.trim()}>
          Подготовить заметку для подтверждения
        </button>
      </div>
      {error && <div role="alert" className="alert alert-danger mt-3">{error}</div>}
      {status && <div role="status" className="alert alert-success mt-3">{status}</div>}
      {result && <div className="mt-3" data-testid="mcp-result">
        <h3 className="h6">Результат MCP-инструментов</h3>
        {result.gateway && <div className="small border rounded p-2 mb-2" data-testid="mcp-gateway">
          <strong>AI Gateway · {result.gateway.version}</strong>
          <div>Identity: server-bound · Tools: allowlist · Output: validated</div>
          <div className="text-secondary">Авторизация выполняется в PostgreSQL;
            это правила фильтрации, а не гарантия отсутствия prompt injection.</div>
        </div>}
        {result.reason?.startsWith("gateway_") &&
          <p className="small text-warning-emphasis" data-testid="gateway-rejection">
            AI Gateway остановил небезопасный этап. Исходные данные не раскрыты.
          </p>}
        <div className="small text-secondary" data-testid="mcp-trace">
          {result.tool_trace.map((t,i)=>
            <div key={i}>{t.tool}: {t.status}{t.citations!==undefined?" · "+t.citations+" цитат":""}</div>)}
        </div>
        <p className="mt-2" style={{whiteSpace:"pre-wrap"}} data-testid="mcp-answer">{result.answer}</p>
        {result.pending&&<div className="border rounded p-3" data-testid="mcp-approval">
          <strong>Только предложение — запись ещё не создана</strong>
          <p className="my-2">{result.pending.note}</p>
          <p className="small text-warning-emphasis">
            Это неподтверждённое предложение LLM. Сравните каждое утверждение
            с точной цитатой ниже: модель может придумать детали, которых
            нет в документе. Нажатие «Подтвердить» сохраняет текст без
            автоматической проверки его истинности.
          </p>
          <p className="small text-secondary">Job: {result.pending.job_id}</p>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-primary" onClick={()=>void decide("approve")} disabled={busy}>
              Подтвердить запись
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={()=>void decide("reject")} disabled={busy}>
              Отклонить
            </button>
          </div>
        </div>}
        {result.citations.length>0&&<ol className="mt-2">
          {result.citations.map((c,i)=><li key={c.job_id+":"+i}>
            <strong>{c.source}</strong> ({c.kind}) · {c.job_id}
            <div className="small" style={{whiteSpace:"pre-wrap"}}>{c.quote}</div>
          </li>)}
        </ol>}
        <p className="small text-secondary mb-0">Цитаты подтверждают происхождение источника, а не истинность рассуждения модели. Нет production IAM.</p>
      </div>}
    </div>
  </section>;
}
