import { EMITEN_EXCHANGE } from "@/lib/constants";
import type { MarketPriceSnapshot } from "@/lib/types";

function decodeBasicEntities(input: string) {
  return input
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&bull;|&#8226;/gi, "•");
}

function htmlToText(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeBasicEntities(text);
}

function parseLocalizedNumber(raw: string) {
  const normalized = raw.replace(/[^0-9.,]/g, "").trim();

  if (!normalized) {
    return null;
  }

  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");

  if (hasDot && hasComma) {
    return Number(normalized.replace(/\./g, "").replace(/,/g, "."));
  }

  if (hasComma) {
    return Number(normalized.replace(/,/g, "."));
  }

  return Number(normalized);
}

function parsePriceFromText(text: string, emiten: string) {
  const quoteMarkerPattern = new RegExp(`${emiten}\\s*•\\s*${EMITEN_EXCHANGE}`, "i");
  const markerMatch = quoteMarkerPattern.exec(text);

  const searchArea = markerMatch
    ? text.slice(markerMatch.index, markerMatch.index + 1200)
    : text;

  const candidates = [
    /\bRp\s*([0-9.,]+)/i,
    /\bIDR\s*([0-9.,]+)/i,
    /([0-9.,]+)\s*IDR\b/i
  ];

  for (const pattern of candidates) {
    const match = searchArea.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const parsed = parseLocalizedNumber(match[1]);
    if (parsed !== null && Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parsePriceFromHtml(html: string) {
  const metaMatch = html.match(/itemprop="price"\s+content="([0-9.]+)"/i);
  if (metaMatch?.[1]) {
    const parsed = Number(metaMatch[1]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const jsonLdMatch = html.match(/"price"\s*:\s*"([0-9.]+)"/i);
  if (jsonLdMatch?.[1]) {
    const parsed = Number(jsonLdMatch[1]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseAsOfFromText(text: string) {
  const match = text.match(/\b([A-Z][a-z]{2}\s+\d{1,2},\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)\s*GMT[+-]\d+)\b/);
  return match?.[1] ?? null;
}

export async function getLatestEmitenPrice(emiten: string): Promise<MarketPriceSnapshot> {
  const quoteUrl = `https://www.google.com/finance/quote/${encodeURIComponent(`${emiten}:${EMITEN_EXCHANGE}`)}`;

  try {
    const response = await fetch(quoteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LeaderboardHolder/1.0)",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      throw new Error(`Google Finance request failed: ${response.status}`);
    }

    const html = await response.text();
    const text = htmlToText(html);
    const parsedPrice = parsePriceFromHtml(html) ?? parsePriceFromText(text, emiten);

    if (parsedPrice === null) {
      return {
        emiten,
        exchange: EMITEN_EXCHANGE,
        price: null,
        currency: "IDR",
        asOf: parseAsOfFromText(text),
        source: "unavailable",
        quoteUrl
      };
    }

    return {
      emiten,
      exchange: EMITEN_EXCHANGE,
      price: parsedPrice,
      currency: "IDR",
      asOf: parseAsOfFromText(text),
      source: "google-finance",
      quoteUrl
    };
  } catch (error) {
    console.error("Failed fetching market price", error);

    return {
      emiten,
      exchange: EMITEN_EXCHANGE,
      price: null,
      currency: "IDR",
      asOf: null,
      source: "unavailable",
      quoteUrl
    };
  }
}
