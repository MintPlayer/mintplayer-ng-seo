import { TestBed } from '@angular/core/testing';
import { BaseUrlService } from './base-url.service';
import { APP_BASE_HREF_RAW, provideBaseHref } from './provide-base-href';
import { BASE_URL_OPTIONS } from './providers/base-url-options.provider';

const configure = (providers: unknown[] = []) =>
  TestBed.configureTestingModule({
    providers: [...provideBaseHref('https://mintplayer.com/'), ...providers] as never,
  });

describe('BaseUrlService', () => {
  it('trims the trailing slash by default', () => {
    configure();

    expect(TestBed.inject(BaseUrlService).getBaseUrl()).toBe('https://mintplayer.com');
  });

  it('drops the scheme when asked per call', () => {
    configure();

    expect(TestBed.inject(BaseUrlService).getBaseUrl({ dropScheme: true })).toBe('//mintplayer.com');
  });

  it('inserts a subdomain when asked per call', () => {
    configure();

    expect(TestBed.inject(BaseUrlService).getBaseUrl({ subdomain: 'api' }))
      .toBe('https://api.mintplayer.com');
  });

  it('uses the injected BASE_URL_OPTIONS when no argument is given', () => {
    configure([{ provide: BASE_URL_OPTIONS, useValue: { dropScheme: true } }]);

    expect(TestBed.inject(BaseUrlService).getBaseUrl()).toBe('//mintplayer.com');
  });

  it('lets a per-call argument override the injected options', () => {
    configure([{ provide: BASE_URL_OPTIONS, useValue: { dropScheme: true } }]);

    expect(TestBed.inject(BaseUrlService).getBaseUrl({ dropScheme: false }))
      .toBe('https://mintplayer.com');
  });

  it('returns null when there is no base href to work from', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: APP_BASE_HREF_RAW, useValue: null }],
    });

    expect(TestBed.inject(BaseUrlService).getBaseUrl()).toBeNull();
  });

  /**
   * Characterises a real defect. `getBaseUrl` does
   * `Object.assign(combinedBaseUrlOptions, baseUrlOptions)` where
   * `combinedBaseUrlOptions` IS the injected BASE_URL_OPTIONS object when that
   * token is provided — so a one-off per-call override permanently rewrites
   * the shared singleton, and every later call inherits it.
   *
   * Only reproducible when the token is provided; without it a fresh literal
   * is built per call.
   */
  it('leaks a per-call override into the injected options object', () => {
    const injected = { dropScheme: false };
    configure([{ provide: BASE_URL_OPTIONS, useValue: injected }]);
    const service = TestBed.inject(BaseUrlService);

    expect(service.getBaseUrl()).toBe('https://mintplayer.com');
    expect(service.getBaseUrl({ dropScheme: true })).toBe('//mintplayer.com');

    // The one-off override has persisted; this call passes no arguments.
    expect(service.getBaseUrl()).toBe('//mintplayer.com');
    expect(injected.dropScheme).toBe(true);
  });
});
