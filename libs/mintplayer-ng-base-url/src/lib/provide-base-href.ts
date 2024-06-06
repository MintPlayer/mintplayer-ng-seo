import { APP_BASE_HREF, DOCUMENT, isPlatformServer } from '@angular/common';
import { InjectionToken, Optional, PLATFORM_ID, Provider } from '@angular/core';
import { BaseUrlOptions } from './interfaces/base-url-options';
import { BootFuncParams } from './interfaces/boot-func-params';
import { BOOT_FUNC_PARAMS } from './providers/boot-func-params.provider';
import { BASE_URL_OPTIONS } from './providers/base-url-options.provider';

// // ALL PARAMETERS ARE BEING EVALUATED HERE RIGHTAWAY, NOT JUST AT THE TIME THEY'RE NEEDED
// export function getBaseUrl(baseUrlService: BaseUrlService, platformId?: any) {
//   return baseUrlService.getBaseUrl({ dropScheme: false });
// };

export const APP_BASE_HREF_RAW = new InjectionToken<string>('AppBaseHrefRaw');

function getRawBaseUrl(doc: any, platformId: any, bootFuncParams?: BootFuncParams) {
  const docAsDocument = <Document>doc;
  if (isPlatformServer(platformId)) {
    if (!bootFuncParams) {
      throw 'During SSR you need to provide BOOT_FUNC_PARAMS';
    }
    return bootFuncParams.origin + bootFuncParams.baseUrl.slice(0, -1);
  } else {
    const baseTags = docAsDocument.getElementsByTagName('base');
    if (baseTags.length === 0) {
      return null;
    } else {
      return baseTags[0].href;
    }
  }
}

export function applyOptions(rawBaseUrl: string | null, options?: BaseUrlOptions) {
  if (rawBaseUrl === null) {
    return null;
  }
  
  if (!!options) {
    // Insert the subdomain
    if (options.subdomain) {
      if (!(/^https?:\/\/localhost\b/.test(rawBaseUrl) || /https?:\/\/[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}\b/.test(rawBaseUrl))) {
        const rgxSchemeHost = new RegExp(/^(?<scheme>https?):\/\/(?<host>[^\/]+)/);
        const match = rawBaseUrl.match(rgxSchemeHost);
        if (match) {
          rawBaseUrl = rawBaseUrl.replace(rgxSchemeHost, `$1://${options.subdomain}.$2`);
        }
      }
    }

    // Trim the scheme
    if (options.dropScheme) {
      rawBaseUrl = rawBaseUrl.replace(/^https?:\/\//gi, '//');
    }
  }

  // Slice the trailing /
  if (rawBaseUrl.endsWith('/')) {
    rawBaseUrl = rawBaseUrl.slice(0, -1);
  }

  return rawBaseUrl;
}

export function provideBaseHref(useHref?: string | BootFuncParams): Provider[] {
  // TODO: apply options
  if (typeof useHref === 'string') {
    return [
      { provide: APP_BASE_HREF_RAW, useValue: useHref },
      { provide: APP_BASE_HREF, useFactory: applyOptions, deps: [APP_BASE_HREF_RAW, [new Optional(), BASE_URL_OPTIONS]] },
    ]
  } else if (useHref) {
    return [
      { provide: BOOT_FUNC_PARAMS, useValue: useHref },
      { provide: APP_BASE_HREF_RAW, useFactory: getRawBaseUrl, deps: [DOCUMENT, PLATFORM_ID, BOOT_FUNC_PARAMS] },
      { provide: APP_BASE_HREF, useFactory: applyOptions, deps: [APP_BASE_HREF_RAW, [new Optional(), BASE_URL_OPTIONS]] },
    ];
  } else {
    return [
      { provide: APP_BASE_HREF_RAW, useFactory: getRawBaseUrl, deps: [DOCUMENT, PLATFORM_ID] },
      { provide: APP_BASE_HREF, useFactory: applyOptions, deps: [APP_BASE_HREF_RAW, [new Optional(), BASE_URL_OPTIONS]] },
    ];
  }
}