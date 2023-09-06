import { APP_BASE_HREF } from '@angular/common';
import { Directive, Inject, Input, OnDestroy, Optional } from '@angular/core';
import { NavigationExtras, Params, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ROUTER, IRouter } from '@mintplayer/ng-router-provider';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subject, takeUntil } from 'rxjs';
import { SeoTags } from '../../interfaces/seo-tags';

@Directive({
  selector: '[seo]'
})
export class SeoDirective implements OnDestroy {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    router: Router,
    @Optional() @Inject(ROUTER) advancedRouter?: IRouter,
    @Optional() @Inject(APP_BASE_HREF) private baseUrl?: string) {
    this.router = advancedRouter || router;

    this.extras$ = combineLatest([this.queryParams$, this.fragment$])
      .pipe(map(([queryParams, fragment]) => <NavigationExtras>{ queryParams, fragment }));

    this.standardUrl$ = combineLatest([this.commands$, this.extras$])
      .pipe(map(([commands, extras]) => {
        const standardTree = this.router.createUrlTree(commands, extras ?? undefined);
        const standardUrl = this.router.serializeUrl(standardTree);
        return standardUrl;
      }));

    this.fullStandardUrl$ = this.standardUrl$
      .pipe(map((standardUrl) => {
        if (this.baseUrl) {
          return this.baseUrl + standardUrl;
        } else {
          return standardUrl;
        }
      }));

    combineLatest([this.title$, this.description$, this.fullStandardUrl$])
      .pipe(filter(([title, description, fullStandardUrl]) => {
        return !!title && !!description && !!fullStandardUrl;
      }))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([title, description, fullStandardUrl]) => {
        this.removeTags(this.tags);
        this.tags = this.addTags(fullStandardUrl!, title, description);
      });
  }

  private router: Router | IRouter;
  private tags: SeoTags | null = null;

  private destroyed$ = new Subject();
  private title$ = new BehaviorSubject<string>('');
  private description$ = new BehaviorSubject<string>('');
  private commands$ = new BehaviorSubject<any[]>([]);
  private queryParams$ = new BehaviorSubject<Params | null>(null);
  private fragment$ = new BehaviorSubject<string | null>(null);
  private extras$: Observable<NavigationExtras | null>;
  private standardUrl$: Observable<string | null>;
  private fullStandardUrl$: Observable<string | null>;

  @Input() public set title(value: string) {
    this.title$.next(value);
  }
  @Input() public set description(value: string) {
    this.description$.next(value);
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
    this.removeTags(this.tags);
  }

  //#region All tags
  private addTags(url: string, title: string, description: string) {
    const ogTags = this.addOpenGraphTags(url, title, description);
    const basicTags = this.addBasicTags(url, title, description);

    return <SeoTags>{ ogTags, basicTags };
  }
  private removeTags(seoTags: SeoTags | null) {
    if (seoTags) {
      this.removeBasicTags(seoTags);
      this.removeOpenGraphTags(seoTags);
    }
  }
  //#endregion

  //#region Basic tags
  private addBasicTags(url: string, title: string, description: string) {
    this.titleService.setTitle(title);
    return this.metaService.addTags([
      { name: 'description', itemprop: 'description', content: description },
    ]);
  }
  private removeBasicTags(seoTags: SeoTags) {
    seoTags.basicTags.forEach((tag) => {
      this.metaService.removeTagElement(tag);
    });
  }
  //#endregion
  //#region Open-graph tags
  private addOpenGraphTags(url: string, title: string, description: string) {
    return this.metaService.addTags([
      { property: 'og:url', content: url },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
    ]);
  }
  private removeOpenGraphTags(seoTags: SeoTags) {
    seoTags.ogTags.forEach((tag) => {
      this.metaService.removeTagElement(tag);
    });
  }
  //#endregion
}
