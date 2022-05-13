import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { Directive, Inject, Input, OnDestroy, Optional, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { ROUTER, IRouter } from '@mintplayer/ng-router-provider';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { CommandsAndExtras } from '../../interfaces/commands-and-extras';

@Directive({
  selector: '[hrefLang]'
})
export class HrefLangDirective implements OnDestroy {

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) document: any,
    router: Router,
    @Optional() @Inject(ROUTER) advancedRouter?: IRouter,
    @Optional() @Inject(APP_BASE_HREF) private baseUrl?: string) {
    this.document = <Document>document;
    this.router = advancedRouter || router;

    this.hreflang$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((hreflang) => {
        this.dispose();
        Object.entries(hreflang).forEach(([propKey, propValue]) => {
          const link = <HTMLLinkElement>this.renderer.createElement('link');
          link.rel = 'alternate';

          const tree = this.router.createUrlTree(propValue.commands, propValue.extras);
          if (this.baseUrl) {
            link.href = this.baseUrl + this.router.serializeUrl(tree);
          } else {
            link.href = this.router.serializeUrl(tree);
          }

          link.hreflang = propKey;
          this.renderer.appendChild(this.document.head, link);
          this.tags.push(link);
        });
      });
  }

  private document: Document;
  private router: Router | IRouter;
  private tags: HTMLLinkElement[] = [];

  private hreflang$ = new BehaviorSubject<Record<string, CommandsAndExtras>>({});
  private destroyed$ = new Subject();

  @Input() set hrefLang(value: Record<string, CommandsAndExtras>) {
    this.hreflang$.next(value);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.dispose();
  }

  private dispose() {
    this.tags.forEach((tag) => {
      tag.remove();
    });
  }
}
