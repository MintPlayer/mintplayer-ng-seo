import { LocationStrategy } from '@angular/common';
import { Directive, ElementRef, Renderer2, computed, effect, inject, input, HostAttributeToken } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdvancedRouter } from '../advanced-router/advanced-router.service';
import { ADVANCED_ROUTER_CONFIG } from '../advanced-router-config.provider';
import { AdvancedRouterConfig } from '../interfaces/advanced-router-config';

// See https://github.com/angular/angular/blob/master/packages/router/src/directives/router_link.ts#L256

@Directive({
  selector: 'a[advRouterLink],area[advRouterLink]',
  standalone: true
})
export class AdvancedRouterLinkDirective extends RouterLink {
  private advancedRouter: AdvancedRouter;
  private nativeRoute: ActivatedRoute;
  private advancedRouterConfig = inject<AdvancedRouterConfig>(ADVANCED_ROUTER_CONFIG, { optional: true });

  /**
   * Commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
   *   - **array**: commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
   *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
   *   - **null|undefined**: shorthand for an empty array of commands, i.e. `[]`
   * @see {@link Router#createUrlTree Router#createUrlTree}
   */
  readonly advRouterLink = input<any[] | string | null | undefined>(undefined);

  readonly navigationDelay = input<number | undefined>(undefined);

  private readonly nativeCommands = computed(() => {
    const commands = this.advRouterLink();
    if (commands == null) {
      return [];
    }
    return Array.isArray(commands) ? commands : [commands];
  });

  constructor() {
    const nativeRoute = inject(ActivatedRoute);
    const tabIndexAttribute = inject(new HostAttributeToken('tabindex'), { optional: true });
    const advancedRouter = inject(AdvancedRouter);
    const renderer = inject(Renderer2);
    const element = inject(ElementRef);
    const nativeLocationStrategy = inject(LocationStrategy);

    // RouterLink only ever calls createUrlTree, serializeUrl and navigateByUrl
    // on its router, and AdvancedRouter implements all three (IRouter). Handing
    // it the AdvancedRouter is what routes href generation and navigation
    // through the advanced query-parameter handling.
    super(
      advancedRouter as unknown as Router,
      nativeRoute,
      tabIndexAttribute,
      renderer,
      element,
      nativeLocationStrategy
    );

    this.nativeRoute = nativeRoute;
    this.advancedRouter = advancedRouter;

    // Drop query params here and let AdvancedRouter do all the work.
    this.queryParamsHandling = '';

    // Angular 22's RouterLink derives the rendered href, and its click
    // handling, from a private `_urlTree` computed that reads the `routerLink`
    // signal input -- not from the public `urlTree` getter, which a subclass
    // used to be able to override. Leaving `routerLink` unset leaves
    // `_urlTree()` null, which strips the href attribute entirely and makes
    // onClick a no-op.
    effect(() => {
      this.routerLink = this.nativeCommands();
    });
  }

  override onClick(button: number, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean) {
    // clone the checks being made in super()
    if (button !== 0 || ctrlKey || metaKey || shiftKey) {
        return true;
    }

    if (typeof this.target === 'string' && this.target !== '_self') {
        return true;
    }

    const delay = this.navigationDelay() ?? this.advancedRouterConfig?.navigationDelay ?? 0;
    setTimeout(() => super.onClick(button, ctrlKey, shiftKey, altKey, metaKey), delay);

    return false;
  }
}
