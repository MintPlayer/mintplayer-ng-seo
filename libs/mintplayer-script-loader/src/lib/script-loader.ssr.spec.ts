/**
 * @vitest-environment node
 *
 * The SSR guard is the one branch that cannot be reached under jsdom, where
 * `window` always exists. Vitest 3 removed `environmentMatchGlobs`, so the
 * per-file docblock above is the mechanism for opting this file out.
 */
import { loadScript } from './script-loader';

describe('loadScript under SSR (no window)', () => {
  it('resolves with an empty array instead of touching the DOM', async () => {
    expect(typeof window).toBe('undefined');

    await expect(loadScript('https://cdn.example.com/anything.js')).resolves.toEqual([]);
  });

  it('resolves empty even when options are supplied', async () => {
    await expect(
      loadScript('https://cdn.example.com/anything.js', { windowCallback: 'onReady', async: true })
    ).resolves.toEqual([]);
  });
});
