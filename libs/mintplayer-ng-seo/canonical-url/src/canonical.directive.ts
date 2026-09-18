import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { Directive, OnDestroy, Renderer2, effect, inject, input } from '@angular/core';
import { NavigationExtras, Params, Router } from '@angular/router';
import { IRouter, ROUTER } from '@mintplayer/ng-router-provider';

@Directive({
  selector: '[canonicalUrl]',
  standalone: true
})
export class CanonicalUrlDirective implements OnDestroy {
  private renderer = inject(Renderer2);
  private baseUrl = inject(APP_BASE_HREF, { optional: true });

  readonly commands = input<any[]>([]);
  readonly queryParams = input<Params | undefined | null>(null);
  readonly fragment = input<string | undefined | null>(null);

  constructor() {
    const document = inject(DOCUMENT);
    const router = inject(Router);
    const advancedRouter = inject<IRouter>(ROUTER, { optional: true });

    this.router = advancedRouter || router;
    this.document = <Document>document;

    effect(() => {
      const extras = <NavigationExtras>{
        queryParams: this.queryParams() ?? null,
        fragment: this.fragment() ?? null,
      };

      const created = !this.linkElement;
      if (!this.linkElement) {
        this.linkElement = <HTMLLinkElement>this.renderer.createElement('link');
        this.linkElement.rel = 'canonical';
      }

      const tree = this.router.createUrlTree(this.commands(), extras);
      const canonicalUrl = this.router.serializeUrl(tree);
      this.linkElement.href = this.baseUrl ? this.baseUrl + canonicalUrl : canonicalUrl;

      created && this.renderer.appendChild(this.document.head, this.linkElement);
    });
  }

  private router: Router | IRouter;
  private document: Document;
  private linkElement?: HTMLLinkElement;

  ngOnDestroy() {
    this.linkElement?.remove();
  }
}
