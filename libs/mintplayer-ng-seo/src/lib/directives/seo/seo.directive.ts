import { APP_BASE_HREF } from '@angular/common';
import { Directive, Inject, Input, OnDestroy, Optional } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationExtras, Params, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ROUTER, IRouter } from '@mintplayer/ng-router-provider';
import { BehaviorSubject, combineLatest, filter, map, Observable } from 'rxjs';

@Directive({
  selector: '[seo]',
  standalone: true
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
      .pipe(filter(([title, description, fullStandardUrl]) => !!title && !!description && !!fullStandardUrl))
      .pipe(takeUntilDestroyed())
      .subscribe(([title, description, fullStandardUrl]) => {
        this.createOrUpdateTag(fullStandardUrl ?? undefined, 'og:url', undefined, undefined);
        this.createOrUpdateTag(title, 'og:title', undefined, undefined);
        this.createOrUpdateTag(description, 'og:description', undefined, undefined);

        this.titleService.setTitle(title);

        this.createOrUpdateTag(description, undefined, 'description', 'description');
      });
  }

  private createOrUpdateTag(content?: string, property?: string, name?: string, itemprop?: string) {
    const key = property || name;
    if (!key) {
      throw 'At least the property or name must be specified';
    }

    const existingTag = this.tags[key];
    if (existingTag) {
      content && (existingTag.content = content);
      property && existingTag.setAttribute('property', property);
      name && (existingTag.name = name);
      itemprop && existingTag.setAttribute('itemprop', itemprop);
    } else {
      const tag = {};
      content && Object.assign(tag, { content });
      property && Object.assign(tag, { property });
      name && Object.assign(tag, { name });
      itemprop && Object.assign(tag, { itemprop });

      this.tags[key] = this.metaService.addTag(tag);
    }
  }

  private router: Router | IRouter;
  private tags: Record<string, HTMLMetaElement | null> = {};

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
    Object.values(this.tags).forEach((tag) => {
      tag && tag.remove();
    });
  }

}
