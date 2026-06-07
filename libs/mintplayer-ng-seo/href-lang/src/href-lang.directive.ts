import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Directive, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { NavigationExtras, Params, Router } from '@angular/router';
import { ROUTER, IRouter } from '@mintplayer/ng-router-provider';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

@Directive({
  selector: '[hrefLang]',
  standalone: true
})
export class HrefLangDirective implements OnDestroy {
  private renderer = inject(Renderer2);
  private baseUrl = inject(APP_BASE_HREF, { optional: true });


  constructor() {
    const document = inject(DOCUMENT);
    const router = inject(Router);
    const advancedRouter = inject<IRouter>(ROUTER, { optional: true });

    this.document = <Document>document;
    this.router = advancedRouter || router;

    this.extras$ = combineLatest([this.queryParams$, this.fragment$])
      .pipe(map(([queryParams, fragment]) => <NavigationExtras>{ queryParams, fragment }));

    combineLatest([this.language$, this.commands$, this.extras$])
      .pipe(takeUntilDestroyed())
      .subscribe(([language, commands, extras]) => {
        const created = !this.linkElement;
        if (!this.linkElement) {
          this.linkElement = <HTMLLinkElement>this.renderer.createElement('link');
          this.linkElement.rel = 'alternate';
        }
        
        this.linkElement.hreflang = language!;

        const tree = this.router.createUrlTree(commands, extras ?? undefined);
        const href = this.router.serializeUrl(tree);
        this.linkElement.href = this.baseUrl ? this.baseUrl + href : href;

        created && this.renderer.appendChild(this.document.head, this.linkElement);
      });
  }

  private document: Document;
  private router: Router | IRouter;
  private linkElement?: HTMLLinkElement;

  private language$ = new BehaviorSubject<string | null>(null);
  private commands$ = new BehaviorSubject<any[]>([]);
  private queryParams$ = new BehaviorSubject<Params | null>(null);
  private fragment$ = new BehaviorSubject<string | null>(null);
  private extras$: Observable<NavigationExtras | null>;

  @Input() set hrefLang(value: string) {
    this.language$.next(value);
  }
  @Input() set commands(value: any[]) {
    this.commands$.next(value);
  }
  @Input() set queryParams(value: Params | undefined | null) {
    this.queryParams$.next(value ?? null);
  }
  @Input() set fragment(value: string | undefined | null) {
    this.fragment$.next(value ?? null);
  }

  ngOnDestroy() {
    this.linkElement?.remove();
  }

}
