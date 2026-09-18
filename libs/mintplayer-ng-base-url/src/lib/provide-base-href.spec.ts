import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_BASE_HREF_RAW, applyOptions, provideBaseHref } from './provide-base-href';
import { BASE_URL_OPTIONS } from './providers/base-url-options.provider';
import { BOOT_FUNC_PARAMS } from './providers/boot-func-params.provider';

/**
 * `getRawBaseUrl` only ever calls `getElementsByTagName`, so a duck-typed
 * stub is more deterministic than a real <base> tag: jsdom resolves a real
 * tag's `.href` against the test page URL.
 */
const docWithBase = (href: string) => ({
  getElementsByTagName: () => [{ href }],
});
const docWithoutBase = () => ({ getElementsByTagName: () => [] });

describe('applyOptions', () => {
  it('passes null straight through', () => {
    expect(applyOptions(null)).toBeNull();
    expect(applyOptions(null, { dropScheme: true })).toBeNull();
  });

  it('strips a single trailing slash when given no options', () => {
    expect(applyOptions('https://mintplayer.com/')).toBe('https://mintplayer.com');
    expect(applyOptions('https://mintplayer.com/app/')).toBe('https://mintplayer.com/app');
  });

  it('leaves an already-trimmed url alone', () => {
    expect(applyOptions('https://mintplayer.com')).toBe('https://mintplayer.com');
  });

  it('strips only one trailing slash, not all of them', () => {
    expect(applyOptions('https://mintplayer.com//')).toBe('https://mintplayer.com/');
  });

  describe('dropScheme', () => {
    it('replaces https with a protocol-relative prefix', () => {
      expect(applyOptions('https://mintplayer.com/', { dropScheme: true })).toBe('//mintplayer.com');
    });

    it('replaces http too', () => {
      expect(applyOptions('http://mintplayer.com/', { dropScheme: true })).toBe('//mintplayer.com');
    });

    it('is case-insensitive', () => {
      expect(applyOptions('HTTPS://mintplayer.com/', { dropScheme: true })).toBe('//mintplayer.com');
    });

    it('does nothing when the option is false', () => {
      expect(applyOptions('https://mintplayer.com/', { dropScheme: false })).toBe('https://mintplayer.com');
    });
  });

  describe('subdomain', () => {
    it('splices the subdomain in front of the host', () => {
      expect(applyOptions('https://mintplayer.com/', { dropScheme: false, subdomain: 'api' }))
        .toBe('https://api.mintplayer.com');
    });

    it('keeps the path intact', () => {
      expect(applyOptions('https://mintplayer.com/app/', { dropScheme: false, subdomain: 'api' }))
        .toBe('https://api.mintplayer.com/app');
    });

    it('is skipped for localhost', () => {
      expect(applyOptions('http://localhost:4200/', { dropScheme: false, subdomain: 'api' }))
        .toBe('http://localhost:4200');
    });

    it('is skipped for a dotted-quad IP address', () => {
      expect(applyOptions('http://192.168.0.1/', { dropScheme: false, subdomain: 'api' }))
        .toBe('http://192.168.0.1');
    });

    it('is skipped when there is no scheme+host to match', () => {
      expect(applyOptions('/base/', { dropScheme: false, subdomain: 'api' })).toBe('/base');
    });

    it('applies the subdomain before dropping the scheme', () => {
      expect(applyOptions('https://mintplayer.com/', { dropScheme: true, subdomain: 'api' }))
        .toBe('//api.mintplayer.com');
    });
  });
});

describe('provideBaseHref', () => {
  describe('given an explicit href string', () => {
    it('provides the raw value and the trimmed APP_BASE_HREF', () => {
      TestBed.configureTestingModule({
        providers: [...provideBaseHref('https://mintplayer.com/')],
      });

      expect(TestBed.inject(APP_BASE_HREF_RAW)).toBe('https://mintplayer.com/');
      expect(TestBed.inject(APP_BASE_HREF)).toBe('https://mintplayer.com');
    });

    it('honours BASE_URL_OPTIONS when the token is present', () => {
      TestBed.configureTestingModule({
        providers: [
          ...provideBaseHref('https://mintplayer.com/'),
          { provide: BASE_URL_OPTIONS, useValue: { dropScheme: true } },
        ],
      });

      expect(TestBed.inject(APP_BASE_HREF)).toBe('//mintplayer.com');
    });
  });

  describe('given BootFuncParams', () => {
    it('joins origin and baseUrl on the server, dropping baseUrl trailing slash', () => {
      TestBed.configureTestingModule({
        providers: [
          ...provideBaseHref({ origin: 'https://mintplayer.com', baseUrl: '/' }),
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });

      expect(TestBed.inject(APP_BASE_HREF_RAW)).toBe('https://mintplayer.com');
    });

    it('keeps a nested baseUrl path on the server', () => {
      TestBed.configureTestingModule({
        providers: [
          ...provideBaseHref({ origin: 'https://mintplayer.com', baseUrl: '/app/' }),
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });

      expect(TestBed.inject(APP_BASE_HREF_RAW)).toBe('https://mintplayer.com/app');
    });

    it('exposes the params under BOOT_FUNC_PARAMS', () => {
      const params = { origin: 'https://mintplayer.com', baseUrl: '/' };
      TestBed.configureTestingModule({
        providers: [...provideBaseHref(params), { provide: PLATFORM_ID, useValue: 'server' }],
      });

      expect(TestBed.inject(BOOT_FUNC_PARAMS)).toBe(params);
    });

    it('ignores the params in the browser and reads the base tag instead', () => {
      TestBed.configureTestingModule({
        providers: [
          ...provideBaseHref({ origin: 'https://ignored.example', baseUrl: '/nope/' }),
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: DOCUMENT, useValue: docWithBase('https://from-base-tag.com/') },
        ],
      });

      expect(TestBed.inject(APP_BASE_HREF_RAW)).toBe('https://from-base-tag.com/');
    });
  });

  describe('given nothing', () => {
    it('reads the href off the document base tag', () => {
      TestBed.configureTestingModule({
        providers: [
          ...provideBaseHref(),
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: DOCUMENT, useValue: docWithBase('https://mintplayer.com/') },
        ],
      });

      expect(TestBed.inject(APP_BASE_HREF_RAW)).toBe('https://mintplayer.com/');
      expect(TestBed.inject(APP_BASE_HREF)).toBe('https://mintplayer.com');
    });

    it('yields null when the document has no base tag', () => {
      TestBed.configureTestingModule({
        providers: [
          ...provideBaseHref(),
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: DOCUMENT, useValue: docWithoutBase() },
        ],
      });

      expect(TestBed.inject(APP_BASE_HREF_RAW)).toBeNull();
      expect(TestBed.inject(APP_BASE_HREF)).toBeNull();
    });

    it('throws on the server, where there are no boot params to fall back on', () => {
      TestBed.configureTestingModule({
        providers: [
          ...provideBaseHref(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: DOCUMENT, useValue: docWithoutBase() },
        ],
      });

      // A bare string is thrown rather than an Error, so the caught value is
      // asserted directly instead of via toThrowError.
      let caught: unknown;
      try {
        TestBed.inject(APP_BASE_HREF_RAW);
      } catch (e) {
        caught = e;
      }

      expect(String(caught)).toContain('During SSR you need to provide BOOT_FUNC_PARAMS');
    });
  });
});
