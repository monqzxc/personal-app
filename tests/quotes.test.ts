/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDailyQuoteService, fallbackQuote, quoteContent, QUOTE_CACHE_KEY, ZENQUOTES_URL } from '../src/features/home/quotes.ts';

const today = '2026-10-10';
function memoryStorage(initial: string | null = null) {
  let value = initial;
  return { getItem: async (key: string) => { assert.equal(key, QUOTE_CACHE_KEY); return value; },
    setItem: async (key: string, next: string) => { assert.equal(key, QUOTE_CACHE_KEY); value = next; }, read: () => value };
}
const response = (body: unknown = [{ q: ' A small step is still a step. ', a: ' Test author ' }]) => ({ ok: true, json: async () => body });

test('daily quotes share simultaneous requests and persist one result per local day', async () => {
  const storage = memoryStorage();
  let calls = 0;
  const fetchQuote = async (url: string, options: { signal: AbortSignal }) => {
    calls++; assert.equal(url, 'https://zenquotes.io/api/today'); assert.equal(options.signal.aborted, false); return response();
  };
  const service = createDailyQuoteService({ storage, fetchQuote });
  const [first, second] = await Promise.all([service.load(today), service.load(today)]);
  assert.equal(calls, 1); assert.deepEqual(first, second);
  assert.deepEqual(first, { text: 'A small step is still a step.', author: 'Test author', source: 'ZenQuotes', day: today });
  assert.deepEqual(await service.load(today), first);
  assert.deepEqual(await createDailyQuoteService({ storage, fetchQuote }).load(today), first);
  assert.equal(calls, 1);
  await service.load('2026-10-11'); assert.equal(calls, 2);
});

test('offline days retain the last downloaded quote and persist the daily attempt', async () => {
  const quote = { text: 'Cached thought', author: 'Test author', source: 'ZenQuotes', day: '2026-10-09' };
  const storage = memoryStorage(JSON.stringify({ quote, attemptedDay: quote.day }));
  let calls = 0;
  const fetchQuote = async () => { calls++; throw new Error('Offline'); };
  assert.deepEqual(await createDailyQuoteService({ storage, fetchQuote }).load(today), quote);
  assert.deepEqual(await createDailyQuoteService({ storage, fetchQuote }).load(today), quote);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(storage.read()!).attemptedDay, today);
});

test('invalid responses and failed HTTP requests fall back without trusting remote fields', async () => {
  for (const body of [null, {}, [], [{ q: '', a: 'Author' }], [{ q: 'x'.repeat(801), a: 'Author' }], [{ q: 'Thought', a: 'x'.repeat(121) }], [{ q: 42, a: 'Author' }], [{ q: 'Thought', a: '   ' }]]) {
    const service = createDailyQuoteService({ storage: memoryStorage(), fetchQuote: async () => response(body) });
    assert.deepEqual(await service.load(today), fallbackQuote(today));
  }
  const service = createDailyQuoteService({ storage: memoryStorage(), fetchQuote: async () => ({ ok: false, json: async () => { throw new Error('Must not parse'); } }) });
  assert.deepEqual(await service.load(today), fallbackQuote(today));
});

test('corrupt caches and storage failures never prevent a usable quote', async () => {
  for (const cache of ['invalid JSON', 'x'.repeat(6001), JSON.stringify({ attemptedDay: today, quote: { text: 'Untrusted', author: 'Author', source: 'Unknown', day: today } })]) {
    assert.deepEqual(await createDailyQuoteService({ storage: memoryStorage(cache) }).load(today), fallbackQuote(today));
  }
  let calls = 0;
  const service = createDailyQuoteService({ storage: { getItem: async () => { throw new Error('Read failed'); }, setItem: async () => { throw new Error('Write failed'); } }, fetchQuote: async () => { calls++; return response(); } });
  assert.equal((await service.load(today)).source, 'ZenQuotes');
  assert.equal((await service.load(today)).source, 'ZenQuotes');
  assert.equal(calls, 1);
});

test('a stalled request times out and aborts even if fetch ignores cancellation', async () => {
  let signal: AbortSignal | undefined;
  const service = createDailyQuoteService({ storage: memoryStorage(), timeoutMs: 5, fetchQuote: async (_, options) => {
    signal = options.signal; return await new Promise<never>(() => {});
  } });
  assert.deepEqual(await service.load(today), fallbackQuote(today));
  assert.equal(signal?.aborted, true);
});

test('web needs no request and bundled thoughts rotate while remaining stable each day', async () => {
  const storage = memoryStorage(JSON.stringify({ quote: fallbackQuote('2026-10-09'), attemptedDay: '2026-10-09' }));
  const service = createDailyQuoteService({ storage });
  assert.deepEqual(await service.load(today), fallbackQuote(today));
  assert.notEqual(fallbackQuote(today).text, fallbackQuote('2026-10-11').text);
  assert.equal(fallbackQuote(today).author, 'MONAPp');
});

test('saved and shared text preserves authorship and ZenQuotes attribution', () => {
  const quote = { text: 'A thought', author: 'Test author', source: 'ZenQuotes' as const, day: today };
  assert.equal(quoteContent(quote), `A thought\n\n- Test author\nInspiration provided by ZenQuotes: ${ZENQUOTES_URL}`);
  assert.equal(quoteContent(fallbackQuote(today)).includes('ZenQuotes'), false);
});

test('crossing midnight during a request leaves the new day cached without duplicate requests', async () => {
  const storage = memoryStorage();
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const service = createDailyQuoteService({ storage, fetchQuote: async () => {
    calls++;
    if (calls === 1) await gate;
    return response([{ q: `Day ${calls}`, a: 'Test author' }]);
  } });
  const first = service.load(today);
  const next = service.load('2026-10-11');
  release();
  assert.equal((await first).day, today);
  assert.equal((await next).day, '2026-10-11');
  assert.equal((await service.load('2026-10-11')).text, 'Day 2');
  assert.equal(calls, 2);
  assert.equal(JSON.parse(storage.read()!).attemptedDay, '2026-10-11');
});
