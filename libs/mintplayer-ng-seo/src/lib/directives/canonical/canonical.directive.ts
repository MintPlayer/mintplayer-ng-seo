import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { Directive, Inject, Input, OnDestroy, Optional, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationExtras, Params, Router } from '@angular/router';
import { IRouter, ROUTER } from '@mintplayer/ng-router-provider';
import { BehaviorSubject, Observable, Subject, combineLatest, map } from 'rxjs';

@Directive({
  selector: '[canonicalUrl]',
})
export class CanonicalUrlDirective implements OnDestroy {
  
  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) document: any,
    router: Router,
    @Optional() @Inject(ROUTER) advancedRouter?: IRouter,
    @Optional() @Inject(APP_BASE_HREF) private baseUrl?: string,
  ) {
    this.router = advancedRouter || router;
    this.document = <Document>document;

    this.extras$ = combineLatest([this.queryParams$, this.fragment$])
      .pipe(map(([queryParams, fragment]) => <NavigationExtras>{ queryParams, fragment }));

    combineLatest([this.commands$, this.extras$])
      .pipe(takeUntilDestroyed())
      .subscribe(([commands, extras]) => {
        this.dispose();
        const link = <HTMLLinkElement>this.renderer.createElement('link');
        link.rel = 'canonical';
        
        const tree = this.router.createUrlTree(commands, extras ?? undefined);
        const canonicalUrl = this.router.serializeUrl(tree);
        if (this.baseUrl) {
          link.href = this.baseUrl + canonicalUrl;
        } else {
          link.href = canonicalUrl;
        }

        this.renderer.appendChild(this.document.head, link);
        this.tags.push(link);
      });
  }

  private router: Router | IRouter;
  private document: Document;
  private tags: HTMLLinkElement[] = [];

  private commands$ = new BehaviorSubject<any[]>([]);
  private queryParams$ = new BehaviorSubject<Params | null>(null);
  private fragment$ = new BehaviorSubject<string | null>(null);
  private extras$: Observable<NavigationExtras | null>;
  private destroyed$ = new Subject();

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
    this.destroyed$.next(true);
    this.dispose();
  }

  private dispose() {
    this.tags.forEach(tag => tag.remove());
  }
}
