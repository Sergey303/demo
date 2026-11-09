import { useEffect, useRef, useState } from "react";

type Evidence = {
  job_id: string;
  kind: "audio" | "document";
  source: string;
  text: string;
  score: number;
  start?: number;
  end?: number;
  char_start?: number;
  char_end?: number;
  chunk_index?: number;
};

function validateSearch(value: unknown): { hits: Evidence[]; abstained: boolean } {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Неверный ответ сервиса поиска");
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.hits) || typeof payload.abstained !== "boolean")
    throw new Error("Неверная схема ответа поиска");
  const hits: Evidence[] = payload.hits.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error("Неверный фрагмент поиска");
    const row = item as Record<string, unknown>;
    if (typeof row.job_id !== "string" || typeof row.source !== "string" ||
      typeof row.text !== "string" || typeof row.score !== "number" ||
      !Number.isFinite(row.score) || !["audio", "document"].includes(String(row.kind))) {
      throw new Error("Неверные метаданные доказательства");
    }
    const base = {
      job_id: row.job_id, source: row.source, text: row.text,
      score: row.score, kind: row.kind as "audio" | "document",
    };
    if (row.kind === "audio" && typeof row.start === "number" && typeof row.end === "number")
      return { ...base, start: row.start, end: row.end };
    if (row.kind === "document" && typeof row.char_start === "number" && typeof row.char_end === "number")
      return { ...base, char_start: row.char_start, char_end: row.char_end };
    throw new Error("Неверный диапазон фрагмента");
  });
  return { hits, abstained: payload.abstained };
}

type ExactCitation = Omit<Evidence, "text"> & { quote: string };
type EvidenceAnswer = {
  mode: "evidence" | "generated";
  model?: string;
  answer: string;
  abstained: boolean;
  reason: string;
  citations: ExactCitation[];
};

function validateAnswer(value: unknown, expectedMode: "evidence" | "generated" = "evidence"): EvidenceAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Некорректный доказательный ответ");
  const row = value as Record<string, unknown>;
  if (row.mode !== expectedMode || row.semantic_verified !== false ||
      (expectedMode === "generated" && row.model !== "qwen3:8b") ||
      typeof row.answer !== "string" || typeof row.abstained !== "boolean" ||
      typeof row.reason !== "string" || !Array.isArray(row.citations) ||
      row.citations.length > 2) throw new Error("Некорректный контракт ответа");
  if (row.abstained) {
    if (row.citations.length !== 0) throw new Error("Цитаты при отказе запрещены");
    return { mode: expectedMode, model: expectedMode === "generated" ? "qwen3:8b" : undefined,
      answer: row.answer, abstained: true, reason: row.reason, citations: [] };
  }
  if (row.citations.length === 0) throw new Error("Ответ без проверяемых цитат");
  const citations = row.citations.map((raw: unknown): ExactCitation => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error("Некорректная цитата");
    const item = raw as Record<string, unknown>;
    if (typeof item.job_id !== "string" || !/^[a-f\d-]{36}$/i.test(item.job_id) ||
        typeof item.source !== "string" || !item.source ||
        typeof item.quote !== "string" || !item.quote.trim() ||
        typeof item.score !== "number" || !Number.isFinite(item.score) ||
        (item.kind !== "audio" && item.kind !== "document")) throw new Error("Некорректный источник цитаты");
    const base = { job_id: item.job_id, kind: item.kind, source: item.source,
      score: item.score, quote: item.quote } as ExactCitation;
    if (item.kind === "audio") {
      if (typeof item.start !== "number" || typeof item.end !== "number" ||
          item.start < 0 || item.end < item.start) throw new Error("Нет таймкода");
      return { ...base, start: item.start, end: item.end };
    }
    if (typeof item.char_start !== "number" || typeof item.char_end !== "number" ||
        item.char_start < 0 || item.char_end <= item.char_start) throw new Error("Нет диапазона символов");
    return { ...base, char_start: item.char_start, char_end: item.char_end };
  });
  if (expectedMode === "evidence" && row.answer !== citations.map(c => c.quote).join("\n"))
    throw new Error("Ответ не совпадает с цитатами");
  if (expectedMode === "generated" && (!row.answer.trim() || row.answer.length > 1000))
    throw new Error("Неправильный сгенерированный ответ");
  return { mode: expectedMode, model: expectedMode === "generated" ? "qwen3:8b" : undefined,
    answer: row.answer, abstained: false, reason: row.reason, citations };
}

export function UnifiedSearchCard() {
  const [question, setQuestion] = useState("");
  const [hits, setHits] = useState<Evidence[]>([]);
  const [abstained, setAbstained] = useState(false);
  const [exactAnswer, setExactAnswer] = useState<EvidenceAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  const generation = useRef(0);

  useEffect(() => () => {
    generation.current++;
    active.current?.abort();
  }, []);

  function change(value: string) {
    generation.current++;
    active.current?.abort();
    active.current = null;
    setQuestion(value);
    setHits([]);
    setAbstained(false);
    setExactAnswer(null);
    setError(null);
    setLoading(false);
  }

  async function search(mode: "search" | "answer" | "generated" = "search") {
    const query = question.trim();
    if (!query || query.length > 500 || loading) return;
    generation.current++;
    const version = generation.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setHits([]);
    setAbstained(false);
    setExactAnswer(null);
    setError(null);
    try {
      const response = await fetch("/enterprise-search/" + (mode === "generated" ? "answer" : mode), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "generated"
          ? { question: query, top_k: 5, mode: "generated" }
          : { question: query, top_k: 5 }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (version !== generation.current) return;
      if (!response.ok) {
        if (response.status === 401) throw new Error("Демо-идентичность не подтверждена (401).");
        if (response.status === 503) throw new Error(mode === "generated"
          ? "Локальная модель Ollama временно недоступна или занята (503). Дословный поиск остаётся доступен."
          : "Сервис поиска временно недоступен (503).");
        throw new Error("Ошибка поиска: HTTP " + response.status);
      }
      const payload = await response.json() as unknown;
      if (version !== generation.current) return;
      if (mode === "answer" || mode === "generated") {
        setExactAnswer(validateAnswer(payload, mode === "generated" ? "generated" : "evidence"));
      } else {
        const result = validateSearch(payload);
        setHits(result.hits);
        setAbstained(result.abstained);
      }
    } catch (caught) {
      if (version !== generation.current || controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "Ошибка соединения с поиском");
      setHits([]);
      setExactAnswer(null);
    } finally {
      if (active.current === controller) active.current = null;
      if (version === generation.current) setLoading(false);
    }
  }

  return <section className="card shadow-sm mt-4" data-testid="enterprise-unified-search">
    <div className="card-body p-4">
      <h2 className="h5">Единый поиск доказательств · аудио и документы</h2>
      <p className="text-secondary small">
        Один авторизованный SQL-отбор по tenant и грантам → один ONNX-эмбеддинг вопроса →
        точный косинусный top-5 по уже сохранённым фрагментам. Никаких выдуманных ответов:
        режим дословных цитат работает без LLM, а генеративный ответ Qwen3 — опционален.
      </p>
      <form onSubmit={event => { event.preventDefault(); void search(); }} className="d-flex flex-wrap gap-2 align-items-end">
        <div className="flex-grow-1">
          <label htmlFor="enterprise-search-question" className="form-label">Вопрос к доступным источникам</label>
          <input id="enterprise-search-question" type="text" className="form-control"
            placeholder="Например, какие сроки возврата или утверждения расходов?"
            value={question} maxLength={500}
            onChange={event => change(event.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !question.trim()}>
          {loading ? "Ищем…" : "Найти доказательства"}
        </button>
        <button type="button" className="btn btn-outline-primary"
          disabled={loading || !question.trim()} onClick={() => void search("answer")}>
          Ответить дословными цитатами
        </button>
        <button type="button" className="btn btn-outline-secondary"
          disabled={loading || !question.trim()} onClick={() => void search("generated")}>
          Сформировать ответ Qwen3 (локально)
        </button>
      </form>
      {error && <div role="alert" className="alert alert-danger mt-3 mb-0">{error}</div>}
      {exactAnswer && <div className="mt-3" data-testid="enterprise-evidence-answer">
        {exactAnswer.abstained
          ? <div className="alert alert-secondary" data-testid="answer-abstained">
              {exactAnswer.mode === "generated" && exactAnswer.reason === "model_abstained"
                ? "Qwen3 отказалась отвечать по предоставленным источникам."
                : exactAnswer.mode === "generated" && exactAnswer.reason === "invalid_model_output"
                ? "Ответ модели не прошёл проверку формата или цитат."
                : "Недостаточно разрешённых доказательств для ответа."}
            </div>
          : <div data-testid="answer-result">
              <h3 className="h6">{exactAnswer.mode === "generated"
                ? "Ответ локальной Qwen3 с авторизованными цитатами"
                : "Дословный ответ из разрешённых источников"}</h3>
              <p className="small text-secondary">
                {exactAnswer.mode === "generated"
                  ? "Qwen3 формирует текст по разрешённым выдержкам. Сервер проверяет ID цитат и повторно проверяет права. Это НЕ доказывает истинность или логическую обоснованность ответа."
                  : "Только точные выдержки, без генерации LLM. Цитирование подтверждает происхождение текста, но не гарантирует, что он логически отвечает на вопрос."}
              </p>
              <blockquote className="border-start border-3 ps-3" style={{ whiteSpace: "pre-wrap" }}
                data-testid="answer-text">{exactAnswer.answer}</blockquote>
              <ol className="list-group list-group-numbered">
                {exactAnswer.citations.map((item, index) =>
                  <li className="list-group-item" key={item.job_id + ":" + index}>
                    <strong>{item.source}</strong> ({item.kind === "audio" ? "аудио" : "документ"}){" "}
                    {item.kind === "audio"
                      ? item.start?.toFixed(2) + "–" + item.end?.toFixed(2) + " с"
                      : "символы " + item.char_start + "–" + item.char_end}
                    <div className="small text-secondary">Job ID: {item.job_id} · cosine {item.score.toFixed(3)}</div>
                    <div className="small" style={{ whiteSpace: "pre-wrap" }}>{item.quote}</div>
                  </li>)}
              </ol>
            </div>}
      </div>}
      {abstained && <div className="alert alert-secondary mt-3 mb-0" data-testid="search-abstained">
        Нет доступных доказательств. Ответ не сформирован.
      </div>}
      {hits.length > 0 && <div className="mt-3" data-testid="search-evidence">
        <p className="small text-secondary mb-2">Получено {hits.length} фрагм. Сходство не доказывает истинность ответа.</p>
        <ol className="list-group list-group-numbered">
          {hits.map((hit, i) => <li key={hit.job_id + ":" + i} className="list-group-item">
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <span className="badge text-bg-secondary">{hit.kind === "audio" ? "Аудио" : "Документ"}</span>
              <strong className="small">{hit.source}</strong>
              <span className="text-secondary small">
                {hit.kind === "audio"
                  ? hit.start?.toFixed(2) + "–" + hit.end?.toFixed(2) + " с"
                  : "символы " + hit.char_start + "–" + hit.char_end}
              </span>
              <span className="text-secondary small">cosine {hit.score.toFixed(3)}</span>
            </div>
            <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{hit.text}</p>
          </li>)}
        </ol>
      </div>}
    </div>
  </section>;
}
