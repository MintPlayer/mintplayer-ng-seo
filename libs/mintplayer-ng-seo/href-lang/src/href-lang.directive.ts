import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { Directive, OnDestroy, Renderer2, effect, inject, input } from '@angular/core';
import { NavigationExtras, Params, Router } from '@angular/router';
import { ROUTER, IRouter } from '@mintplayer/ng-router-provider';

@Directive({
  selector: '[hrefLang]',
  standalone: true
})
export class HrefLangDirective implements OnDestroy {
  private renderer = inject(Renderer2);
  private baseUrl = inject(APP_BASE_HREF, { optional: true });

  readonly hrefLang = input<string | null>(null);
  readonly commands = input<any[]>([]);
  readonly queryParams = input<Params | undefined | null>(null);
  readonly fragment = input<string | undefined | null>(null);

  constructor() {
    const document = inject(DOCUMENT);
    const router = inject(Router);
    const advancedRouter = inject<IRouter>(ROUTER, { optional: true });

    this.document = <Document>document;
    this.router = advancedRouter || router;

    effect(() => {
      const extras = <NavigationExtras>{
        queryParams: this.queryParams() ?? null,
        fragment: this.fragment() ?? null,
      };

      const created = !this.linkElement;
      if (!this.linkElement) {
        this.linkElement = <HTMLLinkElement>this.renderer.createElement('link');
        this.linkElement.rel = 'alternate';
      }

      this.linkElement.hreflang = this.hrefLang()!;

      const tree = this.router.createUrlTree(this.commands(), extras);
      const href = this.router.serializeUrl(tree);
      this.linkElement.href = this.baseUrl ? this.baseUrl + href : href;

      created && this.renderer.appendChild(this.document.head, this.linkElement);
    });
  }

  private document: Document;
  private router: Router | IRouter;
  private linkElement?: HTMLLinkElement;

  ngOnDestroy() {
    this.linkElement?.remove();
  }

}
