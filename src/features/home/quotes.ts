export interface DailyQuote {
  text: string;
  author: string;
  source: 'ZenQuotes' | 'MONAPp';
  day: string;
}
export const QUOTE_CACHE_KEY = 'monapp.dailyQuote';
export const ZENQUOTES_URL = 'https://zenquotes.io';
const thoughts = [
  'A little progress and a little rest can belong to the same day.',
  'Make room for one small thing that matters to you today.',
  'You can begin again without waiting for a perfect day.',
  'A quiet moment can be part of moving forward.',
  'Take the next step at a pace you can keep.',
];
export function fallbackQuote(day: string): DailyQuote {
  return { text: thoughts[Number(day.replaceAll('-', '')) % thoughts.length] ?? thoughts[0]!, author: 'MONAPp', source: 'MONAPp', day };
}
export function quoteContent(quote: DailyQuote): string {
  return `${quote.text}\n\n- ${quote.author}${quote.source === 'ZenQuotes' ? `\nInspiration provided by ZenQuotes: ${ZENQUOTES_URL}` : ''}`;
}
const shortText = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function isQuote(value: unknown): value is DailyQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Partial<DailyQuote>;
  return shortText(quote.text, 800) && shortText(quote.author, 120) && typeof quote.day === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(quote.day) && (quote.source === 'ZenQuotes' || quote.source === 'MONAPp');
}
type QuoteCache = { attemptedDay: string; quote: DailyQuote };
interface QuoteOptions {
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
  fetchQuote?: (url: string, options: { signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
  timeoutMs?: number;
}
export function createDailyQuoteService({ storage, fetchQuote, timeoutMs = 5000 }: QuoteOptions) {
  let cache: QuoteCache | undefined;
  let pending: { day: string; result: Promise<DailyQuote> } | undefined;
  async function persist() {
    try { await storage.setItem(QUOTE_CACHE_KEY, JSON.stringify(cache)); } catch { /* An optional quote cache must not stop Home. */ }
  }
  async function load(day: string): Promise<DailyQuote> {
    if (!cache) {
      try {
        const raw = await storage.getItem(QUOTE_CACHE_KEY);
        const value: unknown = raw && raw.length <= 6000 ? JSON.parse(raw) : null;
        if (value && typeof value === 'object' && 'quote' in value && isQuote(value.quote)
          && 'attemptedDay' in value && typeof value.attemptedDay === 'string') cache = { quote: value.quote, attemptedDay: value.attemptedDay };
      } catch { /* Use the bundled thought if storage is unavailable or corrupt. */ }
    }
    if (cache?.attemptedDay === day) return cache.quote;
    const quote = cache?.quote.source === 'ZenQuotes' ? cache.quote : fallbackQuote(day);
    if (!fetchQuote) return quote;
    cache = { attemptedDay: day, quote };
    await persist();
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const request = (async () => {
        const response = await fetchQuote('https://zenquotes.io/api/today', { signal: controller.signal });
        if (!response.ok) throw new Error('Quote request failed');
        const body: unknown = await response.json();
        const value = Array.isArray(body) && body.length === 1 ? body[0] : null;
        if (!value || !shortText(value.q, 800) || !shortText(value.a, 120)) throw new Error('Invalid quote');
        return { text: value.q.trim(), author: value.a.trim(), source: 'ZenQuotes' as const, day };
      })();
      const result = await Promise.race([request, new Promise<never>((_, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(new Error('Quote request timed out')); }, timeoutMs);
      })]);
      cache = { attemptedDay: day, quote: result };
      await persist();
      return result;
    } catch { return quote; }
    finally { if (timeout) clearTimeout(timeout); }
  }
  return {
    load(day: string): Promise<DailyQuote> {
      if (pending?.day === day) return pending.result;
      const result = pending ? pending.result.then(() => load(day)) : load(day);
      pending = { day, result };
      void result.finally(() => { if (pending?.result === result) pending = undefined; });
      return result;
    },
  };
}
