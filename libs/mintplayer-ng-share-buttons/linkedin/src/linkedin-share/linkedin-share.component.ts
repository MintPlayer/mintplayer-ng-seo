import { AfterViewInit, Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Params } from '@angular/router';
import { ExternalUrlService } from '@mintplayer/ng-share-buttons';
import { loadScript } from '@mintplayer/script-loader';

const SDK_URL = 'https://platform.linkedin.com/in.js';

@Component({
  selector: 'linkedin-share',
  templateUrl: './linkedin-share.component.html',
  styleUrls: ['./linkedin-share.component.scss'],
  standalone: true,
})
export class LinkedinShareComponent implements AfterViewInit {
  private externalUrlService = inject(ExternalUrlService);

  readonly shareRouterLink = input<string | any[] | null>([]);
  readonly queryParams = input<Params | null>(null);
  readonly size = input<'large' | 'small'>('large');
  readonly text = input('');

  readonly wrapper = viewChild<ElementRef<HTMLDivElement>>('wrapper');

  private readonly isViewInited = signal(false);
  private readonly sdkReady = signal(false);

  private readonly commands = computed(() => {
    const value = this.shareRouterLink();
    if (value == null) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  });

  private readonly href = computed(() => {
    if (!this.sdkReady()) {
      return null;
    }
    return this.externalUrlService.buildUrl(this.commands(), this.queryParams() ?? {});
  });

  constructor() {
    effect(() => {
      if (!this.isViewInited() || !this.commands()) {
        return;
      }
      loadScript(SDK_URL).then(() => this.sdkReady.set(true));
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
      const text = this.text();

      setTimeout(() => {
        wrapper.innerHTML = `<script type="IN/Share" data-url="${href}" data-size="${size}" data-text="${text}"></script>`;
        (<any>window)['IN'] && (<any>window)['IN'].parse();
      }, 20);
    });
  }

  ngAfterViewInit() {
    this.isViewInited.set(true);
  }
}
