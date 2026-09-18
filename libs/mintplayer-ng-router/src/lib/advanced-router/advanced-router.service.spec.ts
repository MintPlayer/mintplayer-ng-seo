import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { ADVANCED_ROUTER_CONFIG } from '../advanced-router-config.provider';
import { AdvancedRouter } from './advanced-router.service';

/** Query params the "current" route is sitting on for every test below. */
const CURRENT = { lang: 'nl', 'return-url': '/back', options: 'a' };

const CONFIG = {
  navigationDelay: 0,
  queryParams: {
    lang: 'preserve',
    'return-url': '',
    options: 'merge',
  },
};

function configure(config: unknown = CONFIG, current: unknown = CURRENT) {
  const providers: unknown[] = [
    provideRouter([{ path: '**', children: [] }]),
    { provide: ActivatedRoute, useValue: { snapshot: { queryParams: current } } },
  ];
  if (config !== null) {
    providers.push({ provide: ADVANCED_ROUTER_CONFIG, useValue: config });
  }
  TestBed.configureTestingModule({ providers: providers as never });
  return TestBed.inject(AdvancedRouter);
}

/** createUrlTree + serializeUrl, which is how the directive consumes it. */
const urlFor = (router: AdvancedRouter, commands: unknown[], extras?: unknown) =>
  router.serializeUrl(router.createUrlTree(commands as never, extras as never));

describe('AdvancedRouter', () => {
  it('is created', () => {
    expect(configure()).toBeTruthy();
  });

  describe('createUrlTree with a config', () => {
    it("preserves a 'preserve' param and merges a 'merge' param from the current route", () => {
      const router = configure();

      // lang: preserved from current. return-url: configured '' so dropped.
      // options: merge with nothing requested, so current survives.
      expect(urlFor(router, ['/test', 'home'])).toBe('/test/home?lang=nl&options=a');
    });

    it('drops a preserved param when null is explicitly requested', () => {
      const router = configure();

      expect(urlFor(router, ['/test'], { queryParams: { lang: null } })).toBe('/test?options=a');
    });

    it('comma-joins a merge param present on both sides', () => {
      const router = configure();

      expect(urlFor(router, ['/test'], { queryParams: { options: 'b' } }))
        .toBe('/test?lang=nl&options=a,b');
    });

    it('takes the requested value for a merge param absent from the current route', () => {
      const router = configure(CONFIG, { lang: 'nl' });

      expect(urlFor(router, ['/test'], { queryParams: { options: 'b' } }))
        .toBe('/test?lang=nl&options=b');
    });

    it('keeps a default-handled param only when it is explicitly requested', () => {
      const router = configure();
      const tree = router.createUrlTree(['/test'], { queryParams: { 'return-url': '/x' } });

      expect(tree.queryParams).toEqual({ lang: 'nl', 'return-url': '/x', options: 'a' });
    });
  });

  describe('createUrlTree without a config', () => {
    it('ignores the current route params entirely', () => {
      const router = configure(null);
      const tree = router.createUrlTree(['/test'], { queryParams: { a: '1' } });

      expect(tree.queryParams['a']).toBe('1');
      expect(tree.queryParams['lang']).toBeUndefined();
    });
  });

  describe('serializeUrl', () => {
    it('delegates to the native router', () => {
      const router = configure();
      const spy = vi.spyOn(TestBed.inject(Router), 'serializeUrl');
      const tree = router.createUrlTree(['/test']);

      router.serializeUrl(tree);

      expect(spy).toHaveBeenCalledWith(tree);
    });
  });

  describe('navigate', () => {
    it('applies the computed query params', async () => {
      const router = configure();
      const spy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await router.navigate(['/test', 'home']);

      expect(spy).toHaveBeenCalledWith(
        ['/test', 'home'],
        expect.objectContaining({ queryParams: { lang: 'nl', options: 'a' } })
      );
    });

    it('passes the caller extras through', async () => {
      const router = configure();
      const spy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await router.navigate(['/test'], { skipLocationChange: true });

      expect(spy).toHaveBeenCalledWith(
        ['/test'],
        expect.objectContaining({ skipLocationChange: true })
      );
    });

    it('returns whatever the native router resolves to', async () => {
      const router = configure();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(false);

      await expect(router.navigate(['/test'])).resolves.toBe(false);
    });
  });

  describe('navigateByUrl', () => {
    it('rebuilds the url from the computed params', async () => {
      const router = configure();
      const spy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      await router.navigateByUrl('/target');

      expect(spy).toHaveBeenCalledWith('/target?lang=nl&options=a', undefined);
    });

    it('accepts a UrlTree and serialises it first', async () => {
      const router = configure();
      const spy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      await router.navigateByUrl(TestBed.inject(Router).parseUrl('/target'));

      expect(spy).toHaveBeenCalledWith('/target?lang=nl&options=a', undefined);
    });

    it('emits no query string when every param is dropped', async () => {
      const router = configure({ navigationDelay: 0, queryParams: { lang: '', 'return-url': '', options: '' } });
      const spy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      await router.navigateByUrl('/target');

      expect(spy).toHaveBeenCalledWith('/target', undefined);
    });

    /**
     * Characterises a real defect. `extractQueryParametersFromUrl` hands
     * `computeQueryParameters` an HttpParams instance rather than a plain
     * object. HttpParams keeps its values in a private Map, so
     * `Object.keys(requestedParams)` never contains the actual query keys.
     * Every 'preserve' and 'merge' lookup therefore takes the
     * key-is-absent branch, and query parameters written into the URL are
     * silently discarded in favour of the current route's values.
     *
     * The `['encoder', 'map']` filter in navigateByUrl is a workaround for
     * the same root cause: those are HttpParams' own enumerable fields
     * leaking into the computed params.
     */
    it('silently discards query params supplied in the url', async () => {
      const router = configure();
      const spy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      await router.navigateByUrl('/target?lang=fr&foo=1');

      // lang=fr and foo=1 are both lost; the current route's lang wins.
      expect(spy).toHaveBeenCalledWith('/target?lang=nl&options=a', undefined);
    });
  });

  describe('navigationDelay', () => {
    it('defers navigation by the configured delay', async () => {
      vi.useFakeTimers();
      try {
        const router = configure({ ...CONFIG, navigationDelay: 50 });
        const spy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        const pending = router.navigate(['/test']);
        expect(spy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(50);
        await pending;

        expect(spy).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
