// Imported through the public barrel so the entry point is covered too.
import { loadScript } from '../index';

/**
 * `allScripts` is a module-level Map keyed by src, so state leaks between
 * tests in this file. Every test uses a unique src rather than resetting
 * modules, which would also re-run the `document.onreadystatechange`
 * assignment at import time.
 */
let n = 0;
const uniqueSrc = () => `https://cdn.example.com/lib-${++n}.js`;

/** The tag `loadScript` just inserted; it is appended synchronously. */
const tagFor = (src: string) =>
  document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

describe('loadScript', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('inserting the tag', () => {
    it('appends exactly one script tag with the requested src', () => {
      const src = uniqueSrc();
      loadScript(src);

      expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
    });

    it('appends to head when the document has no other script tag', () => {
      const src = uniqueSrc();
      loadScript(src);

      expect(tagFor(src)!.parentNode).toBe(document.head);
    });

    it('inserts before the first existing script tag rather than into head', () => {
      const existing = document.createElement('script');
      existing.src = 'https://cdn.example.com/already-here.js';
      document.body.appendChild(existing);

      const src = uniqueSrc();
      loadScript(src);

      expect(existing.previousSibling).toBe(tagFor(src));
      expect(tagFor(src)!.parentNode).toBe(document.body);
    });

    /**
     * jsdom 27 does not implement the `async` IDL property on
     * HTMLScriptElement: reading it gives `undefined`, and assigning it
     * creates a plain expando instead of reflecting to the attribute.
     * `defer` is implemented properly. So `async` is asserted through the
     * attribute (the environment-independent fact) plus the value the
     * library actually assigned.
     */
    it('leaves async and defer off by default', () => {
      const src = uniqueSrc();
      loadScript(src);

      expect(tagFor(src)!.hasAttribute('async')).toBe(false);
      expect(tagFor(src)!.defer).toBe(false);
    });

    it('sets async and defer when asked', () => {
      const src = uniqueSrc();
      loadScript(src, { async: true, defer: true });

      expect(tagFor(src)!.async).toBe(true);
      expect(tagFor(src)!.defer).toBe(true);
      expect(tagFor(src)!.hasAttribute('defer')).toBe(true);
    });
  });

  describe('resolving', () => {
    it('resolves with the load event once the tag fires load', async () => {
      const src = uniqueSrc();
      const pending = loadScript(src);

      tagFor(src)!.dispatchEvent(new Event('load'));

      const args = await pending;
      expect(args[0]).toBeInstanceOf(Event);
      expect(args[0].type).toBe('load');
    });

    it('stays pending until the tag actually loads', async () => {
      const src = uniqueSrc();
      const pending = loadScript(src);
      const sentinel = Symbol('still-pending');

      const outcome = await Promise.race([
        pending,
        Promise.resolve(sentinel),
      ]);

      expect(outcome).toBe(sentinel);
    });
  });

  describe('windowCallback mode', () => {
    afterEach(() => {
      delete (window as unknown as Record<string, unknown>)['onVendorReady'];
    });

    it('installs the named callback on window', () => {
      loadScript(uniqueSrc(), { windowCallback: 'onVendorReady' });

      expect(typeof (window as unknown as Record<string, unknown>)['onVendorReady']).toBe('function');
    });

    it('resolves with the arguments the vendor passes to the callback', async () => {
      const pending = loadScript(uniqueSrc(), { windowCallback: 'onVendorReady' });

      (window as unknown as { onVendorReady: (...a: unknown[]) => void })
        .onVendorReady('ready', 42);

      await expect(pending).resolves.toEqual(['ready', 42]);
    });

    it('does not resolve on the load event, because no load listener is attached', async () => {
      const src = uniqueSrc();
      const pending = loadScript(src, { windowCallback: 'onVendorReady' });
      const sentinel = Symbol('still-pending');

      tagFor(src)!.dispatchEvent(new Event('load'));

      await expect(Promise.race([pending, Promise.resolve(sentinel)])).resolves.toBe(sentinel);
    });
  });

  describe('de-duplication', () => {
    it('appends only one tag for concurrent calls and resolves both', async () => {
      const src = uniqueSrc();
      const first = loadScript(src);
      const second = loadScript(src);

      expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);

      tagFor(src)!.dispatchEvent(new Event('load'));

      const [a, b] = await Promise.all([first, second]);
      expect(a).toBe(b);
    });

    it('resolves from cache without appending a second tag once loaded', async () => {
      const src = uniqueSrc();
      const first = loadScript(src);
      tagFor(src)!.dispatchEvent(new Event('load'));
      const firstArgs = await first;

      document.head.innerHTML = '';
      document.body.innerHTML = '';

      await expect(loadScript(src)).resolves.toBe(firstArgs);
      expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(0);
    });
  });

  describe('failure', () => {
    it('rejects with a plain string, not an Error', async () => {
      const src = uniqueSrc();
      const pending = loadScript(src);

      tagFor(src)!.dispatchEvent(new Event('error'));

      await expect(pending).rejects.toBe(`${src} failed to load`);
    });

    /**
     * Characterises a real defect: the failed entry is left in `allScripts`
     * marked not-fully-loaded, so every later call for that src parks its
     * resolver on a script that will never load again. Retrying is impossible
     * for the lifetime of the module.
     */
    it('never settles a retry after a failure, and appends no new tag', async () => {
      const src = uniqueSrc();
      const failed = loadScript(src);
      tagFor(src)!.dispatchEvent(new Event('error'));
      await expect(failed).rejects.toBeDefined();

      document.head.innerHTML = '';
      const retry = loadScript(src);
      const sentinel = Symbol('never-settles');

      await expect(Promise.race([retry, Promise.resolve(sentinel)])).resolves.toBe(sentinel);
      expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(0);
    });

    it('rejects when the first script tag has no parent to insert before', async () => {
      const orphan = document.createElement('script');
      vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
        [orphan] as unknown as HTMLCollectionOf<Element>
      );

      await expect(loadScript(uniqueSrc())).rejects.toBe('First script tag has no parent node');

      vi.restoreAllMocks();
    });
  });

  /**
   * `src.replace('"', '')` passes a string, not a regex, so only the FIRST
   * double quote is stripped. Pinned deliberately: the intent was clearly to
   * strip all of them.
   */
  describe('quote stripping', () => {
    it('strips a single embedded double quote', () => {
      const src = `https://cdn.example.com/q"${++n}.js`;
      loadScript(src);

      const cleaned = src.replace('"', '');
      expect(document.querySelector(`script[src="${cleaned}"]`)).not.toBeNull();
    });

    it('strips only the first of several double quotes', () => {
      const raw = `https://cdn.example.com/a"b"c-${++n}.js`;
      loadScript(raw);

      const inserted = Array.from(document.querySelectorAll('script'))
        .map((s) => s.getAttribute('src'))
        .find((s) => s?.includes('a'));

      expect(inserted).toBe(`https://cdn.example.com/ab"c-${n}.js`);
    });
  });
});
