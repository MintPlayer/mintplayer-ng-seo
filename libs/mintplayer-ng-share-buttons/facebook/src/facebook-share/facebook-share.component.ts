import { AfterViewInit, Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Params } from '@angular/router';
import { ExternalUrlService } from '@mintplayer/ng-share-buttons';
import { loadScript } from '@mintplayer/script-loader';

const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v3.0';

@Component({
  selector: 'facebook-share',
  templateUrl: './facebook-share.component.html',
  styleUrls: ['./facebook-share.component.scss'],
  standalone: true,
})
export class FacebookShareComponent implements AfterViewInit {
  private externalUrlService = inject(ExternalUrlService);

  readonly shareRouterLink = input<string | any[] | null | undefined>(undefined);
  readonly queryParams = input<Params | null>(null);
  readonly size = input<'large' | 'small'>('large');
  readonly layout = input<'icon_link' | 'box_count' | 'button_count' | 'button'>('button_count');

  readonly wrapper = viewChild<ElementRef<HTMLDivElement>>('wrapper');

  private readonly isViewInited = signal(false);
  private readonly sdkReady = signal(false);

  /** `null` while the input has never been bound; the SDK is not loaded until then. */
  private readonly commands = computed(() => {
    const value = this.shareRouterLink();
    if (value === undefined) {
      return null;
    }
    if (value === null) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  });

  private readonly href = computed(() => {
    if (!this.sdkReady()) {
      return null;
    }
    const commands = this.commands();
    if (!commands) {
      return null;
    }
    return this.externalUrlService.buildUrl(commands, this.queryParams() ?? {});
  });

  constructor() {
    effect(() => {
      if (!this.isViewInited() || !this.commands()) {
        return;
      }
      loadScript(SDK_URL, { windowCallback: 'fbAsyncInit' }).then(() => this.sdkReady.set(true));
    });

    effect(() => {
      const href = this.href();
      const wrapper = this.wrapper()?.nativeElement;
      if (!href || !wrapper || typeof window === 'undefined') {
        return;
      }

      // Read the presentational inputs here rather than inside the timeout, so
      // that changing them re-renders the widget.
      const size = this.size();
      const layout = this.layout();

      setTimeout(() => {
        wrapper.innerHTML = `<div class="fb-share-button" data-href="${href}" data-size="${size}" data-layout="${layout}"></div>`;
        (<any>window)['FB'] && (<any>window)['FB'].XFBML.parse(wrapper);
      }, 20);
    });
  }

  ngAfterViewInit() {
    this.isViewInited.set(true);
  }
}
