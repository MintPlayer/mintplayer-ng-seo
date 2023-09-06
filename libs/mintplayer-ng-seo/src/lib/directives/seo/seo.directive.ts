import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { Directive, Inject, Input, OnDestroy, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ROUTER, IRouter } from '@mintplayer/ng-router-provider';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subject, takeUntil } from 'rxjs';
import { SeoTags } from '../../interfaces/seo-tags';
// import { SeoInformation } from '../../interfaces/seo-information';
import { CommandsAndExtras } from '../../interfaces/commands-and-extras';

@Directive({
  selector: '[seo]'
})
export class SeoDirective implements OnDestroy {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) document: any,
    router: Router,
    @Optional() @Inject(ROUTER) advancedRouter?: IRouter,
    @Optional() @Inject(APP_BASE_HREF) private baseUrl?: string) {
    this.document = <Document>document;
    this.router = advancedRouter || router;

    this.fullStandardUrl$ = this.standardUrl$
      .pipe(map((standardUrl) => {
        if (this.baseUrl) {
          return this.baseUrl + standardUrl;
        } else {
          return standardUrl;
        }
      }));

    // this.fullCanonicalUrl$ = this.canonicalUrl$
    //   .pipe(map((canonicalUrl) => {
    //     if (this.baseUrl) {
    //       return this.baseUrl + canonicalUrl;
    //     } else {
    //       return canonicalUrl;
    //     }
    //   }));
    
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

  private document: Document;
  private router: Router | IRouter;
  private tags: SeoTags | null = null;

  private destroyed$ = new Subject();
  // private information$ = new BehaviorSubject<SeoInformation | null>(null);
  private title$ = new BehaviorSubject<string>('');
  private description$ = new BehaviorSubject<string>('');
  private standardUrl$ = new BehaviorSubject<string | null>(null);
  //private canonicalUrl$ = new BehaviorSubject<string | null>(null);
  private fullStandardUrl$: Observable<string | null>;
  //private fullCanonicalUrl$: Observable<string | null>;

  // @Input() public set seo(value: SeoInformation) {
  //   this.information$.next(value);
  // }
  @Input() public set title(value: string) {
    this.title$.next(value);
  }
  @Input() public set description(value: string) {
    this.description$.next(value);
  }

  @Input() public set standardUrl(value: CommandsAndExtras) {
    const standardTree = this.router.createUrlTree(value.commands, value.extras);
    const standardUrl = this.router.serializeUrl(standardTree);
    this.standardUrl$.next(standardUrl);
  }

  // @Input() public set canonicalUrl(value: CommandsAndExtras) {
  //   const canonicalTree = this.router.createUrlTree(value.commands, value.extras);
  //   const canonicalUrl = this.router.serializeUrl(canonicalTree);
  //   this.canonicalUrl$.next(canonicalUrl);
  // }

  ngOnDestroy() {
    this.removeTags(this.tags);
  }

  //#region All tags
  private addTags(url: string, title: string, description: string) {
    const ogTags = this.addOpenGraphTags(url, title, description);
    const basicTags = this.addBasicTags(url, title, description);
    // const canonicalTag = this.addCanonicalTag(canonical);

    return <SeoTags>{ ogTags, basicTags };
  }
  private removeTags(seoTags: SeoTags | null) {
    if (seoTags) {
      this.removeBasicTags(seoTags);
      this.removeOpenGraphTags(seoTags);
      // this.removeCanonicalTag(seoTags);
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
  // //#region Canonical url
  // private addCanonicalTag(url: string) {
  //   const link = this.document.createElement('link');
  //   link.setAttribute('rel', 'canonical');
  //   link.setAttribute('href', url);
  //   this.document.head.appendChild(link);

  //   return link;
  // }
  // private removeCanonicalTag(seoTags: SeoTags) {
  //   this.document.querySelectorAll('link[rel=canonical]').forEach((link) => {
  //     link.remove();
  //   });
  // }
  // //#endregion
}
