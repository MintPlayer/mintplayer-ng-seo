import { APP_BASE_HREF } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LinkedinShareComponent } from './linkedin-share.component';

// jsdom never fetches an external <script>, so the real loadScript would hang
// forever and every render path below would be dead. Mocking it also lets the
// SDK url and options be asserted.
const loadScript = vi.hoisted(() => vi.fn());
vi.mock('@mintplayer/script-loader', () => ({ loadScript }));

@Component({
  standalone: true,
  imports: [LinkedinShareComponent],
  template: `<linkedin-share [shareRouterLink]="link()" [queryParams]="queryParams()" [size]="size()" [text]="text()"></linkedin-share>`,
})
class HostComponent {
  readonly link = signal<string | unknown[] | null | undefined>(undefined);
  readonly queryParams = signal<Record<string, unknown> | null>(null);
  readonly size = signal<'large' | 'small'>('large');
  readonly text = signal('');
}

describe('LinkedinShareComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const wrapperEl = () => fixture.nativeElement.querySelector('div');
  const rendered = () => fixture.nativeElement.querySelector('script[type="IN/Share"]');

  /** Bind a link, let the mocked SDK resolve, then clear the 20ms render timer. */
  const render = async (link?: unknown) => {
    if (link !== undefined) {
      fixture.componentInstance.link.set(link as never);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  beforeEach(() => {
    loadScript.mockReset();
    loadScript.mockResolvedValue([]);

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), { provide: APP_BASE_HREF, useValue: 'http://localhost/' }],
    });
    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    delete (window as Record<string, unknown>)['IN'];
  });

  describe('loading the SDK', () => {
    it('requests the vendor SDK once a link is bound', async () => {
      await render(['/about']);

      expect(loadScript).toHaveBeenCalledWith('https://platform.linkedin.com/in.js');
    });

    it('renders nothing until the SDK resolves', async () => {
      let resolveSdk: (v: unknown) => void = () => undefined;
      loadScript.mockReturnValue(new Promise((r) => (resolveSdk = r)));

      await render(['/about']);
      expect(wrapperEl().innerHTML).toBe('');

      resolveSdk([]);
      await render();

      expect(rendered()).not.toBeNull();
    });
  });

  describe('rendering', () => {
    it('renders the share url built from the bound commands', async () => {
      await render(['/people', 42]);

      expect(rendered()!.getAttribute('data-url')).toBe('http://localhost/people/42');
    });

    it('includes the bound query params', async () => {
      fixture.componentInstance.queryParams.set({ tab: 'reviews' });
      await render(['/people', 42]);

      expect(rendered()!.getAttribute('data-url')).toBe('http://localhost/people/42?tab=reviews');
    });

    it('accepts a bare string as a single command', async () => {
      await render('/about');

      expect(rendered()!.getAttribute('data-url')).toBe('http://localhost/about');
    });

    it('passes an absolute url straight through', async () => {
      await render('https://mintplayer.com/x');

      expect(rendered()!.getAttribute('data-url')).toBe('https://mintplayer.com/x');
    });

    it('renders the default size', async () => {
      await render(['/about']);

      expect(rendered()!.getAttribute('data-size')).toBe('large');
    });

    it('re-renders when the link changes', async () => {
      await render(['/about']);
      expect(rendered()!.getAttribute('data-url')).toBe('http://localhost/about');

      await render(['/contact']);

      expect(rendered()!.getAttribute('data-url')).toBe('http://localhost/contact');
    });

    it('renders the bound text', async () => {
      fixture.componentInstance.text.set('Look at this');
      await render(['/about']);
      expect(rendered()!.getAttribute('data-text')).toBe('Look at this');
    });
  });

  describe('the vendor global', () => {
    it('asks the SDK to re-parse the widget', async () => {
      (window as Record<string, unknown>)['IN'] = { parse: vi.fn() };

      await render(['/about']);

      expect((window as any)['IN'].parse).toHaveBeenCalled();
    });

    it('renders without throwing when the global is absent', async () => {
      await render(['/about']);

      expect(rendered()).not.toBeNull();
    });
  });
});
