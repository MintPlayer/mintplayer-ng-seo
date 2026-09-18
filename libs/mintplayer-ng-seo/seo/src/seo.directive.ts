import { APP_BASE_HREF } from '@angular/common';
import { Directive, OnDestroy, computed, effect, inject, input } from '@angular/core';
import { NavigationExtras, Params, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ROUTER, IRouter } from '@mintplayer/ng-router-provider';

@Directive({
  selector: '[seo]',
  standalone: true
})
export class SeoDirective implements OnDestroy {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private baseUrl = inject(APP_BASE_HREF, { optional: true });

  readonly title = input('');
  readonly description = input('');
  readonly commands = input<any[]>([]);
  readonly queryParams = input<Params | undefined | null>(null);
  readonly fragment = input<string | undefined | null>(null);

  private readonly fullStandardUrl = computed(() => {
    const extras = <NavigationExtras>{
      queryParams: this.queryParams() ?? null,
      fragment: this.fragment() ?? null,
    };

    const standardTree = this.router.createUrlTree(this.commands(), extras);
    const standardUrl = this.router.serializeUrl(standardTree);

    return this.baseUrl ? this.baseUrl + standardUrl : standardUrl;
  });

  constructor() {
    const router = inject(Router);
    const advancedRouter = inject<IRouter>(ROUTER, { optional: true });

    this.router = advancedRouter || router;

    effect(() => {
      const title = this.title();
      const description = this.description();
      const fullStandardUrl = this.fullStandardUrl();

      // Title and description are both required before anything is published;
      // a half-filled set of tags is worse than none.
      if (!title || !description || !fullStandardUrl) {
        return;
      }

      this.createOrUpdateTag(fullStandardUrl, 'og:url', undefined, undefined);
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

  ngOnDestroy() {
    Object.values(this.tags).forEach((tag) => {
      tag && tag.remove();
    });
  }

}
