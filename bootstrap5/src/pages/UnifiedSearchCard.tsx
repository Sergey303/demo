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

export function UnifiedSearchCard() {
  const [question, setQuestion] = useState("");
  const [hits, setHits] = useState<Evidence[]>([]);
  const [abstained, setAbstained] = useState(false);
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
    setError(null);
    setLoading(false);
  }

  async function search() {
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
    setError(null);
    try {
      const response = await fetch("/enterprise-search/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, top_k: 5 }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (version !== generation.current) return;
      if (!response.ok) {
        if (response.status === 401) throw new Error("Демо-идентичность не подтверждена (401).");
        if (response.status === 503) throw new Error("Сервис поиска временно недоступен (503).");
        throw new Error("Ошибка поиска: HTTP " + response.status);
      }
      const result = validateSearch(await response.json() as unknown);
      if (version !== generation.current) return;
      setHits(result.hits);
      setAbstained(result.abstained);
    } catch (caught) {
      if (version !== generation.current || controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "Ошибка соединения с поиском");
      setHits([]);
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
        это поиск цитат, а не генерация текста.
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
      </form>
      {error && <div role="alert" className="alert alert-danger mt-3 mb-0">{error}</div>}
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
