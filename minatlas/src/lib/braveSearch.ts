export type BraveResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
};

export type ApiSummaryResponse = {
  sources: BraveResult[];
};

type BraveSearchPayload = {
  results?: unknown;
  error?: unknown;
};

type ApiSummaryPayload = {
  sources?: unknown;
  error?: unknown;
};

function isBraveResult(value: unknown): value is BraveResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;
  return (
    typeof result.title === "string" &&
    typeof result.url === "string" &&
    typeof result.description === "string" &&
    (result.age === undefined || typeof result.age === "string")
  );
}

export async function searchWeb(query: string): Promise<BraveResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const response = await fetch(`/api/brave-search?q=${encodeURIComponent(trimmedQuery)}`);
  const payload = (await response.json().catch(() => ({}))) as BraveSearchPayload;

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Unable to search the web right now");
  }

  return Array.isArray(payload.results) ? payload.results.filter(isBraveResult) : [];
}

export async function fetchApiSummary(
  siteName: string,
  options?: { operator?: string | null },
): Promise<ApiSummaryResponse> {
  const trimmedSiteName = siteName.trim();
  if (!trimmedSiteName) {
    return { sources: [] };
  }

  const operator =
    typeof options?.operator === "string" && options.operator.trim().length > 0
      ? options.operator.trim()
      : undefined;

  const response = await fetch("/api/api-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ siteName: trimmedSiteName, ...(operator ? { operator } : {}) }),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiSummaryPayload;

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load live sources right now");
  }

  return {
    sources: Array.isArray(payload.sources) ? payload.sources.filter(isBraveResult) : [],
  };
}
