import type { BraveResult } from "@/lib/braveSearch";

type SerperOrganicResult = {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
};

type SerperSearchPayload = {
  organic?: SerperOrganicResult[];
  error?: unknown;
  message?: unknown;
};

const SERPER_SEARCH_URL = "https://google.serper.dev/search";
const RESULT_LIMIT = 5;
/** Request extra organics so we can drop PDFs / noise and still return five useful links. */
const SERPER_FETCH_LIMIT = 20;

/** Weak title/snippet match for mining context — used to rank, not to block everything. */
const MINING_CONTEXT = /\b(mine|mining|mineral|deposit|ore|gold|silver|copper|lithium|nickel|lead|zinc|operation|asx|oz|koz|g\/t|open\s*pit|underground|reserve|resource|geoscience|dmirs|tenement|drilling|exploration|producer|plant)\b/i;

function isBraveResult(value: unknown): value is BraveResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.description === "string" &&
    (candidate.age === undefined || typeof candidate.age === "string")
  );
}

function getValidatedSiteName(body: unknown): string | Response {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const siteNameRaw = record?.siteName;
  const siteName = typeof siteNameRaw === "string" ? siteNameRaw.trim() : "";

  if (!siteName) {
    return Response.json({ error: "Missing required field: siteName" }, { status: 400 });
  }

  if (siteName.length > 120) {
    return Response.json({ error: "siteName must be 120 characters or less" }, { status: 400 });
  }

  return siteName;
}

function sanitizeSiteNameForQuery(siteName: string): string {
  return siteName.replace(/"/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Google matches many surface forms of a name (town, dog breed, café). MinAtlas is WA mining —
 * pin the query to WA + mining and exclude PDFs; `gl`/`hl` below bias toward Australia.
 */
function buildSerperQuery(siteName: string): string {
  const safe = sanitizeSiteNameForQuery(siteName);
  return `"${safe}" mining site "Western Australia" Australia -filetype:pdf`;
}

function isLikelyPdfResult(url: string, title: string): boolean {
  if (/^\s*\[pdf\]/i.test(title)) return true;
  const u = url.toLowerCase();
  if (/\.pdf([?#]|$)/i.test(url)) return true;
  if (u.includes("application/pdf")) return true;
  if (/\bfiletype=pdf\b/i.test(u)) return true;
  return false;
}

/** e.g. CWA postcode lists that mention the town name but are not mining intel. */
function isLikelyPostcodeOrDirectoryNoise(title: string, description: string): boolean {
  const t = title.toLowerCase();
  const d = description;
  if (/\bpostcode|postcodes|post\s*codes\b/i.test(t)) return true;
  if (/(?:,\s*\d{4},\s*CWA\b[.\s]*){3,}/i.test(d)) return true;
  if (/\bCWA\b.*\bpostcode/i.test(`${t} ${d}`)) return true;
  return false;
}

function foldForMatch(s: string): string {
  return s.toLowerCase().replace(/'/g, "").replace(/\s+/g, " ").trim();
}

function liveSourceScore(siteName: string, result: BraveResult): number {
  const needle = foldForMatch(siteName);
  const hay = foldForMatch(`${result.title}\n${result.description}`);
  let score = 0;
  if (needle.length >= 3 && hay.includes(needle)) score += 5;
  if (MINING_CONTEXT.test(hay)) score += 2;
  return score;
}

function normalizeSerperResult(result: SerperOrganicResult): BraveResult | null {
  const title = typeof result.title === "string" ? result.title.trim() : "";
  const url = typeof result.link === "string" ? result.link.trim() : "";
  const snippet = typeof result.snippet === "string" ? result.snippet.trim() : "";

  if (!title || !url) return null;
  return {
    title,
    url,
    description: snippet,
  };
}

async function fetchSerperResults(siteName: string): Promise<BraveResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("Serper is not configured");
  }

  const q = buildSerperQuery(siteName);

  const response = await fetch(SERPER_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q,
      num: SERPER_FETCH_LIMIT,
      gl: "au",
      hl: "en",
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as SerperSearchPayload;
  if (!response.ok) {
    const apiError =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : "Unable to fetch live web sources";
    throw new Error(apiError);
  }

  if (!Array.isArray(payload.organic)) return [];

  const normalized = payload.organic
    .map(normalizeSerperResult)
    .filter((result): result is BraveResult => isBraveResult(result))
    .filter((result) => !isLikelyPdfResult(result.url, result.title))
    .filter((result) => !isLikelyPostcodeOrDirectoryNoise(result.title, result.description));

  const scored = normalized.map((result, index) => ({
    result,
    score: liveSourceScore(siteName, result),
    index,
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.slice(0, RESULT_LIMIT).map((row) => row.result);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  const siteName = getValidatedSiteName(body);
  if (siteName instanceof Response) return siteName;

  try {
    const sources = await fetchSerperResults(siteName);
    return Response.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load live sources right now";
    const status = message === "Serper is not configured" ? 500 : 502;
    return Response.json({ error: message }, { status });
  }
}
