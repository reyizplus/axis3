import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAuthRateLimiter,
  createGenericRateLimiter,
} from './rate-limit-configs';

// Limitler process belleğinde tutulduğu için testler birbirinin sayacına
// dokunmasın diye her test kendi benzersiz anahtarını üretir.
let keyCounter = 0;
function uniqueKey(label: string): string {
  keyCounter += 1;
  return `${label}-${keyCounter}-${Math.random().toString(36).slice(2)}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('rate-limit-configs (in-memory)', () => {
  it('limitsiz görünen ilk istekleri sayar ve limit dolunca engeller', async () => {
    const limiter = createGenericRateLimiter(); // 10 istek / 10 sn
    const key = uniqueKey('generic');

    for (let i = 0; i < 10; i++) {
      const result = await limiter.limit(key);
      expect(result.success).toBe(true);
    }

    const blocked = await limiter.limit(key);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.limit).toBe(10);
  });

  it('farklı anahtarları birbirinden bağımsız sayar', async () => {
    const limiter = createGenericRateLimiter();
    const first = uniqueKey('a');
    const second = uniqueKey('b');

    for (let i = 0; i < 10; i++) {
      await limiter.limit(first);
    }

    expect((await limiter.limit(first)).success).toBe(false);
    expect((await limiter.limit(second)).success).toBe(true);
  });

  it('aynı prefix için oluşturulan yeni limiter örneği sayacı paylaşır', async () => {
    const first = createGenericRateLimiter();
    const key = uniqueKey('shared');

    await first.limit(key);

    const second = createGenericRateLimiter();
    const result = await second.limit(key);

    expect(result.remaining).toBe(8);
  });

  it('pencere dolduğunda sayacı sıfırlar', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createAuthRateLimiter(); // 5 istek / 10 sn
    const key = uniqueKey('window');

    for (let i = 0; i < 5; i++) {
      expect((await limiter.limit(key)).success).toBe(true);
    }
    expect((await limiter.limit(key)).success).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:00:11.000Z'));

    const afterWindow = await limiter.limit(key);
    expect(afterWindow.success).toBe(true);
    expect(afterWindow.remaining).toBe(4);
  });
});
