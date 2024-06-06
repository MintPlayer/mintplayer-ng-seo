import { LocationStrategy } from '@angular/common';
import { Inject, Injectable, Optional } from '@angular/core';
import { Params, Router } from '@angular/router';
import { IRouter, ROUTER } from '@mintplayer/ng-router-provider';

@Injectable({
  providedIn: 'root'
})
export class ExternalUrlService {

  constructor(
    private router: Router,
    private locationStrategy: LocationStrategy,
    @Optional() @Inject(ROUTER) private advancedRouter?: IRouter,
  ) {}

  buildUrl(commands: any[], queryParams: Params | null) {
    const router = this.advancedRouter || this.router;
    if ((commands.length === 1) && (/https?:\/\//.test(commands[0]))) {
      const href = commands[0];
      return href;
    } else {
      const urlTree = router.createUrlTree(commands, { queryParams });
      const urlSerialized = router.serializeUrl(urlTree);
      const href = this.locationStrategy.prepareExternalUrl(urlSerialized);
      return href;
    }
  }
}
