import { TestBed } from '@angular/core/testing';
// Imported through the public barrel so the entry points are covered too.
import { ROUTER } from '../../index';

describe('ROUTER token', () => {
  it('has a descriptive name', () => {
    expect(ROUTER.toString()).toContain('Router');
  });

  it('resolves to whatever router implementation is provided', () => {
    const router = { createUrlTree: () => undefined, serializeUrl: () => '' };
    TestBed.configureTestingModule({
      providers: [{ provide: ROUTER, useValue: router }],
    });

    expect(TestBed.inject(ROUTER)).toBe(router);
  });

  it('is optional, so a consumer can fall back to the native Router', () => {
    TestBed.configureTestingModule({ providers: [] });

    expect(TestBed.inject(ROUTER, null, { optional: true })).toBeNull();
  });
});
