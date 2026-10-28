import { afterEach, describe, expect, it, vi } from 'vitest';

// Something below the CLI throwing what is not an Error still ends the run
// with its text and exit 1, rather than an unhandled rejection.
vi.mock('../src/catalog.js', () => ({
  loadKnowledgeBase: () => Promise.reject('the disk is gone'),
}));

const { main } = await import('../src/cli.js');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a failure that is not an Error', () => {
  it('prints it and exits 1', async () => {
    const err: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      err.push(String(chunk));
      return true;
    });
    expect(await main(['catalog'])).toBe(1);
    expect(err.join('')).toBe('the disk is gone\n');
  });
});
