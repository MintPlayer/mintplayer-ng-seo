import { Inject, Injectable, Optional } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, NavigationBehaviorOptions, NavigationExtras, Params, Router, UrlCreationOptions, UrlTree } from '@angular/router';
import { IRouter } from '@mintplayer/ng-router-provider';
import { ADVANCED_ROUTER_CONFIG } from '../advanced-router-config.provider';
import { AdvancedRouterConfig } from '../interfaces/advanced-router-config';
import { UrlWithQueryParams } from '../interfaces/url-with-query-params';

@Injectable({
  providedIn: 'root'
})
export class AdvancedRouter implements IRouter {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Optional() @Inject(ADVANCED_ROUTER_CONFIG) private advancedRouterConfig?: AdvancedRouterConfig) {
  }

  /**
   * Navigate based on the provided array of commands and a starting point.
   * If no starting route is provided, the navigation is absolute.
   *
   * @param commands An array of URL fragments with which to construct the target URL.
   * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
   * segments, followed by the parameters for each segment.
   * The fragments are applied to the current URL or the one provided  in the `relativeTo` property
   * of the options object, if supplied.
   * @param extras An options object that determines how the URL should be constructed or
   *     interpreted.
   *
   * @returns A Promise that resolves to `true` when navigation succeeds, to `false` when navigation
   *     fails,
   * or is rejected on error.
   *
   * @usageNotes
   *
   * The following calls request navigation to a dynamic route path relative to the current URL.
   *
   * ```
   * router.navigate(['team', 33, 'user', 11], {relativeTo: route});
   *
   * // Navigate without updating the URL, overriding the default behavior
   * router.navigate(['team', 33, 'user', 11], {relativeTo: route, skipLocationChange: true});
   * ```
   *
   * @see [Routing and Navigation guide](guide/router)
   *
   */
  public async navigate(commands: any[], extras?: NavigationExtras) {
    const newParams = this.computeQueryParameters(this.route.snapshot.queryParams, extras?.queryParams);

    const delay = this.advancedRouterConfig?.navigationDelay ?? 0;
    await new Promise(resolve => setTimeout(resolve, delay));

    return this.router.navigate(commands, { ...extras, queryParams: newParams });
  }

  /**
   * Navigates to a view using an absolute route path.
   *
   * @param url An absolute path for a defined route. The function does not apply any delta to the
   *     current URL.
   * @param extras An object containing properties that modify the navigation strategy.
   *
   * @returns A Promise that resolves to 'true' when navigation succeeds,
   * to 'false' when navigation fails, or is rejected on error.
   *
   * @usageNotes
   *
   * The following calls request navigation to an absolute path.
   *
   * ```
   * router.navigateByUrl("/team/33/user/11");
   *
   * // Navigate without updating the URL
   * router.navigateByUrl("/team/33/user/11", { skipLocationChange: true });
   * ```
   *
   * @see [Routing and Navigation guide](guide/router)
   *
   */
  public async navigateByUrl(url: string | UrlTree, extras?: NavigationBehaviorOptions) {
    // The requested url.
    const urlValue = url instanceof UrlTree
      ? this.router.serializeUrl(url)
      : url;

    // The requested query parameters.
    const requestedParams = this.extractQueryParametersFromUrl(urlValue);

    // Use the current queryparams and requested queryparams
    // to compute the new parameters according to the configuration.
    const newParams = this.computeQueryParameters(this.route.snapshot.queryParams, requestedParams.queryParams);
    const newParamKeys = Object.keys(newParams).filter(key => !['encoder', 'map'].includes(key));
    const newQueryString = newParamKeys.map(key => `${key}=${newParams[key]}`).join('&');

    const newUrl = newParamKeys.length === 0
      ? requestedParams.url
      : `${requestedParams.url}?${newQueryString}`;

    const delay = this.advancedRouterConfig?.navigationDelay ?? 0;
    await new Promise(resolve => setTimeout(resolve, delay));

    return this.router.navigateByUrl(newUrl, extras);
  }

  /**
   * Appends URL segments to the current URL tree to create a new URL tree.
   *
   * @param commands An array of URL fragments with which to construct the new URL tree.
   * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
   * segments, followed by the parameters for each segment.
   * The fragments are applied to the current URL tree or the one provided  in the `relativeTo`
   * property of the options object, if supplied.
   * @param navigationExtras Options that control the navigation strategy.
   * @returns The new URL tree.
   *
   * @usageNotes
   *
   * ```
   * // create /team/33/user/11
   * router.createUrlTree(['/team', 33, 'user', 11]);
   *
   * // create /team/33;expand=true/user/11
   * router.createUrlTree(['/team', 33, {expand: true}, 'user', 11]);
   *
   * // you can collapse static segments like this (this works only with the first passed-in value):
   * router.createUrlTree(['/team/33/user', userId]);
   *
   * // If the first segment can contain slashes, and you do not want the router to split it,
   * // you can do the following:
   * router.createUrlTree([{segmentPath: '/one/two'}]);
   *
   * // create /team/33/(user/11//right:chat)
   * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: 'chat'}}]);
   *
   * // remove the right secondary node
   * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
   *
   * // assuming the current url is `/team/33/user/11` and the route points to `user/11`
   *
   * // navigate to /team/33/user/11/details
   * router.createUrlTree(['details'], {relativeTo: route});
   *
   * // navigate to /team/33/user/22
   * router.createUrlTree(['../22'], {relativeTo: route});
   *
   * // navigate to /team/44/user/22
   * router.createUrlTree(['../../team/44/user/22'], {relativeTo: route});
   *
   * Note that a value of `null` or `undefined` for `relativeTo` indicates that the
   * tree should be created relative to the root.
   * ```
   */
  public createUrlTree(commands: any[], extras?: UrlCreationOptions) {
    const newParams = this.computeQueryParameters(this.route.snapshot.queryParams, extras?.queryParams);
    return this.router.createUrlTree(commands, { ...extras, queryParams: newParams });
  }

  /** Serializes a `UrlTree` into a string */
  public serializeUrl(url: UrlTree) {
    return this.router.serializeUrl(url);
  }

  /**
   * Extracts the query parameters from the given url.
   * @param url Any url.
   * @returns An object containing the url and query parameters.
   */
  private extractQueryParametersFromUrl(url: string) : UrlWithQueryParams {
    if (url.includes('?')) {
      const parts = url.split('?');
      return {
        url: parts[0],
        queryParams: new HttpParams({ fromString: parts[1] })
      };
    } else {
      return {
        url: url,
        queryParams: new HttpParams()
      };
    }
  }

  /**
   * Checks if a key is present in the Params object.
   * @param params Parameters object.
   * @param key Key to find.
   * @returns true if the key is present in params.
   */
  private containsKey(params: Params, key: string) {
    return Object.keys(params).indexOf(key) > -1;
  }

  /**
   * Computes the new set of query parameters to use after navigation.
   * @param currentParams List of current query parameters, retrieved from the ActivatedRoute.
   * @param requestedParams Query parameters requested by the navigation event.
   * @returns The new set of query parameters.
   */
  private computeQueryParameters(currentParams: Params, requestedParams: Params | null | undefined) {
    // Allow a null object to be passed to this method.
    const newRequestedParams = requestedParams ?? { };

    // Merge the set of keys.
    const allParamKeys = Object.keys({
      ...currentParams,
      ...newRequestedParams
    });

    return <Params>Object.assign({}, ...allParamKeys.map(k => {
        // Compute new value for each Query parameter.
        return {
          key: k,
          value: this.getQueryParameterValue(currentParams, newRequestedParams, k)
        };
      })
      // Remove query parameters to drop.
      .filter(p => p.value !== null)
      // ToDictionary
      .map(p => {
        return { [p.key] : p.value };
      })
    );
  }

  /**
   * Computes the new value for a specific query parameter, based on the configuration for this parameter.
   * @param currentParams List of current query parameters, retrieved from the ActivatedRoute.
   * @param requestedParams Query parameters requested by the navigation event.
   * @param key Name of the query parameter for which the new value must be computed.
   * @returns The new value for the specified query parameter.
   */
  private getQueryParameterValue(currentParams: Params, requestedParams: Params, key: string) {
    if (this.advancedRouterConfig && this.advancedRouterConfig.queryParams) {
      switch (this.advancedRouterConfig.queryParams[key]) {
        case 'preserve':
          // Take requested value if present, else take current.

          // Must use containsKey since one may want to explicitly pass a null value for a specific parameter,
          // in order to drop the query parameter specified.
          return Object.keys(requestedParams).indexOf(key) === -1
            ? currentParams[key]
            : requestedParams[key];
        case 'merge':
          if (this.containsKey(currentParams, key)) {
            if (this.containsKey(requestedParams, key)) {
              // Query parameter present in both. Merge both values.
              return `${currentParams[key]},${requestedParams[key]}`;
            } else {
              // Query parameter only present in activated route.
              return currentParams[key];
            }
          } else {
            if (this.containsKey(requestedParams, key)) {
              // Query parameter only present in requested list.
              return requestedParams[key];
            } else {
              // Never occurs
            }
          }
          break;
        default:
          // Default is drop query parameter.
          if (this.containsKey(requestedParams, key)) {
            // If still present in requested list, return this value.
            return requestedParams[key];
          } else {
            // Drop query parameter.
            return null;
          }
      }
    } else {
      return requestedParams[key];
    }
  }
}
