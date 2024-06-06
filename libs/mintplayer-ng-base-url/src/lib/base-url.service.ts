import { Inject, Injectable, Optional } from '@angular/core';
import { APP_BASE_HREF_RAW, applyOptions } from './provide-base-href';
import { BASE_URL_OPTIONS } from './providers/base-url-options.provider';
import { BaseUrlOptions } from './interfaces/base-url-options';

@Injectable({
  providedIn: 'root'
})
export class BaseUrlService {

  constructor(
    @Inject(APP_BASE_HREF_RAW) private rawBaseHref: string,
    @Optional() @Inject(BASE_URL_OPTIONS) private baseUrlOptions?: BaseUrlOptions,
  ) {
  }

  public getBaseUrl(baseUrlOptions?: Partial<BaseUrlOptions>) {
    const combinedBaseUrlOptions: BaseUrlOptions = this.baseUrlOptions ?? { dropScheme: false };
    if (baseUrlOptions) {
      Object.assign(combinedBaseUrlOptions, baseUrlOptions);
    }
    
    const trimmed = applyOptions(this.rawBaseHref, combinedBaseUrlOptions);
    return trimmed;
  }
}
