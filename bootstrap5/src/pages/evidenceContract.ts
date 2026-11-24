export type Evidence = {
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

function validAudioRange(start: unknown, end: unknown): boolean {
  return typeof start === "number" && typeof end === "number" &&
    Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start;
}

function validDocumentRange(start: unknown, end: unknown): boolean {
  return typeof start === "number" && typeof end === "number" &&
    Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end > start;
}

export function validateSearch(value: unknown): { hits: Evidence[]; abstained: boolean } {
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
    if (row.kind === "audio" && typeof row.start === "number" && typeof row.end === "number" && validAudioRange(row.start, row.end))
      return { ...base, start: row.start, end: row.end };
    if (row.kind === "document" && typeof row.char_start === "number" && typeof row.char_end === "number" && validDocumentRange(row.char_start, row.char_end))
      return { ...base, char_start: row.char_start, char_end: row.char_end };
    throw new Error("Неверный диапазон фрагмента");
  });
  return { hits, abstained: payload.abstained };
}

type ExactCitation = Omit<Evidence, "text"> & { quote: string };
export type EvidenceAnswer = {
  mode: "evidence" | "generated";
  model?: string;
  answer: string;
  abstained: boolean;
  reason: string;
  citations: ExactCitation[];
};

export function validateAnswer(value: unknown, expectedMode: "evidence" | "generated" = "evidence"): EvidenceAnswer {
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
          !validAudioRange(item.start, item.end)) throw new Error("Нет таймкода");
      return { ...base, start: item.start, end: item.end };
    }
    if (typeof item.char_start !== "number" || typeof item.char_end !== "number" ||
        !validDocumentRange(item.char_start, item.char_end)) throw new Error("Нет диапазона символов");
    return { ...base, char_start: item.char_start, char_end: item.char_end };
  });
  if (expectedMode === "evidence" && row.answer !== citations.map(c => c.quote).join("\n"))
    throw new Error("Ответ не совпадает с цитатами");
  if (expectedMode === "generated" && (!row.answer.trim() || row.answer.length > 1000))
    throw new Error("Неправильный сгенерированный ответ");
  return { mode: expectedMode, model: expectedMode === "generated" ? "qwen3:8b" : undefined,
    answer: row.answer, abstained: false, reason: row.reason, citations };
}
