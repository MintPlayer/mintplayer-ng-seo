import { APP_BASE_HREF } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { ROUTER } from '@mintplayer/ng-router-provider';
import { CanonicalUrlDirective } from './canonical.directive';

@Component({
  standalone: true,
  imports: [CanonicalUrlDirective],
  template: `<div canonicalUrl [commands]="commands()" [queryParams]="queryParams()" [fragment]="fragment()"></div>`,
})
class HostComponent {
  readonly commands = signal<unknown[]>([]);
  readonly queryParams = signal<Record<string, unknown> | null>(null);
  readonly fragment = signal<string | null>(null);
}

const canonicalLinks = () =>
  document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');
const canonicalLink = () => canonicalLinks()[0];

/** The directive writes .href, so read the attribute: jsdom absolutises the property. */
const canonicalHref = () => canonicalLink()?.getAttribute('href');

describe('CanonicalUrlDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  const setup = (providers: unknown[] = []) => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), ...providers] as never,
    });
    fixture = TestBed.createComponent(HostComponent);
    return fixture;
  };

  afterEach(() => {
    // The directive appends to the real document.head, which is shared
    // across tests in this file.
    canonicalLinks().forEach((l) => l.remove());
  });

  it('appends a single canonical link to the head', () => {
    setup();
    fixture.detectChanges();

    expect(canonicalLinks()).toHaveLength(1);
    expect(canonicalLink().rel).toBe('canonical');
    expect(canonicalLink().parentNode).toBe(document.head);
  });

  it('emits the root url before any commands are bound', () => {
    setup();
    fixture.detectChanges();

    expect(canonicalHref()).toBe('/');
  });

  it('serialises the bound commands', () => {
    setup();
    fixture.componentInstance.commands.set(['/test', 'home']);
    fixture.detectChanges();

    expect(canonicalHref()).toBe('/test/home');
  });

  it('includes query params and fragment', () => {
    setup();
    fixture.componentInstance.commands.set(['/test', 'home']);
    fixture.componentInstance.queryParams.set({ a: 1, b: 'x' });
    fixture.componentInstance.fragment.set('top');
    fixture.detectChanges();

    expect(canonicalHref()).toBe('/test/home?a=1&b=x#top');
  });

  it('omits query params and fragment when they are null', () => {
    setup();
    fixture.componentInstance.commands.set(['/test']);
    fixture.detectChanges();

    expect(canonicalHref()).toBe('/test');
  });

  it('updates the existing link in place rather than appending another', () => {
    setup();
    fixture.componentInstance.commands.set(['/test', 'home']);
    fixture.detectChanges();
    const first = canonicalLink();

    fixture.componentInstance.commands.set(['/test', 'about']);
    fixture.detectChanges();

    expect(canonicalLinks()).toHaveLength(1);
    expect(canonicalLink()).toBe(first);
    expect(canonicalHref()).toBe('/test/about');
  });

  it('removes the link when the host is destroyed', () => {
    setup();
    fixture.detectChanges();
    expect(canonicalLinks()).toHaveLength(1);

    fixture.destroy();

    expect(canonicalLinks()).toHaveLength(0);
  });

  describe('APP_BASE_HREF', () => {
    it('prefixes the serialised url with the base href', () => {
      setup([{ provide: APP_BASE_HREF, useValue: 'https://mintplayer.com' }]);
      fixture.componentInstance.commands.set(['/test', 'home']);
      fixture.detectChanges();

      expect(canonicalHref()).toBe('https://mintplayer.com/test/home');
    });

    /**
     * The base href is concatenated raw, with no slash normalisation, so a
     * trailing slash on the base produces a doubled separator. Pinned as
     * current behaviour rather than endorsed.
     */
    it('concatenates without normalising a trailing slash', () => {
      setup([{ provide: APP_BASE_HREF, useValue: 'https://mintplayer.com/' }]);
      fixture.componentInstance.commands.set(['/test']);
      fixture.detectChanges();

      expect(canonicalHref()).toBe('https://mintplayer.com//test');
    });
  });

  it('prefers the advanced ROUTER over the native Router when provided', () => {
    const advanced = {
      createUrlTree: vi.fn().mockReturnValue({} as UrlTree),
      serializeUrl: vi.fn().mockReturnValue('/from-advanced-router'),
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
    };
    setup([{ provide: ROUTER, useValue: advanced }]);
    const nativeCreate = vi.spyOn(TestBed.inject(Router), 'createUrlTree');

    fixture.componentInstance.commands.set(['/test', 'home']);
    fixture.detectChanges();

    expect(canonicalHref()).toBe('/from-advanced-router');
    expect(advanced.createUrlTree).toHaveBeenCalled();
    expect(nativeCreate).not.toHaveBeenCalled();
  });
});
