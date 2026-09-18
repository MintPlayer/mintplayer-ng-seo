import { APP_BASE_HREF } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ROUTER } from '@mintplayer/ng-router-provider';
import { ExternalUrlService } from './external-url.service';

const configure = (providers: unknown[] = []) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: APP_BASE_HREF, useValue: 'http://localhost/' },
      ...providers,
    ] as never,
  });
  return TestBed.inject(ExternalUrlService);
};

describe('ExternalUrlService', () => {
  describe('buildUrl through the router', () => {
    it('builds a url from commands', () => {
      expect(configure().buildUrl(['/about'], null)).toBe('http://localhost/about');
    });

    it('includes query params', () => {
      expect(configure().buildUrl(['/people', 42], { tab: 'reviews' }))
        .toBe('http://localhost/people/42?tab=reviews');
    });

    it('handles empty commands', () => {
      expect(configure().buildUrl([], {})).toBe('http://localhost/');
    });

    it('encodes query param values', () => {
      expect(configure().buildUrl(['/s'], { q: 'a b&c' }))
        .toBe('http://localhost/s?q=a%20b%26c');
    });
  });

  describe('absolute url short-circuit', () => {
    it('returns a single https command verbatim', () => {
      expect(configure().buildUrl(['https://example.com/page'], null))
        .toBe('https://example.com/page');
    });

    it('returns a single http command verbatim', () => {
      expect(configure().buildUrl(['http://example.com/p'], null))
        .toBe('http://example.com/p');
    });

    it('drops the query params on the absolute path', () => {
      expect(configure().buildUrl(['https://example.com/page'], { a: '1' }))
        .toBe('https://example.com/page');
    });

    it('does not short-circuit when there is more than one command', () => {
      const result = configure().buildUrl(['https://example.com', 'x'], null);

      expect(result).not.toBe('https://example.com');
      expect(result.startsWith('http://localhost/')).toBe(true);
    });

    /**
     * The regex is unanchored, so a command that merely contains a scheme
     * somewhere is treated as absolute. Pinned as current behaviour.
     */
    it('treats any embedded scheme as absolute', () => {
      expect(configure().buildUrl(['a/https://b'], null)).toBe('a/https://b');
    });
  });

  describe('the optional advanced ROUTER', () => {
    it('is preferred over the native Router', () => {
      const advanced = {
        createUrlTree: vi.fn().mockReturnValue({ tree: true }),
        serializeUrl: vi.fn().mockReturnValue('/from-advanced'),
        navigate: vi.fn(),
        navigateByUrl: vi.fn(),
      };

      const result = configure([{ provide: ROUTER, useValue: advanced }])
        .buildUrl(['/x'], { a: 1 });

      expect(advanced.createUrlTree).toHaveBeenCalledWith(['/x'], { queryParams: { a: 1 } });
      expect(advanced.serializeUrl).toHaveBeenCalledWith({ tree: true });
      expect(result).toBe('http://localhost/from-advanced');
    });

    it('is bypassed by the absolute-url short-circuit', () => {
      const advanced = {
        createUrlTree: vi.fn(),
        serializeUrl: vi.fn(),
        navigate: vi.fn(),
        navigateByUrl: vi.fn(),
      };

      const result = configure([{ provide: ROUTER, useValue: advanced }])
        .buildUrl(['https://example.com/x'], null);

      expect(result).toBe('https://example.com/x');
      expect(advanced.createUrlTree).not.toHaveBeenCalled();
    });
  });
});
