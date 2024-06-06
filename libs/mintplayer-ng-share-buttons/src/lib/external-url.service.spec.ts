import { APP_BASE_HREF } from '@angular/common';
import { Component, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlCreationOptions, UrlSegment, UrlSegmentGroup, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ADVANCED_ROUTER_CONFIG, AdvancedRouterConfig } from '@mintplayer/ng-router';
import { ROUTER } from '@mintplayer/ng-router-provider';

import { ExternalUrlService } from './external-url.service';

describe('ExternalUrlService', () => {
  let service: ExternalUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: '', component: HomeComponent }
        ])
      ],
      declarations: [
        HomeComponent
      ],
      providers: [{
        provide: ROUTER,
        useClass: MockAdvancedRouter
      }, {
        provide: APP_BASE_HREF,
        useValue: 'http://localhost/'
      }, {
        provide: ADVANCED_ROUTER_CONFIG,
        useValue: <AdvancedRouterConfig>{ }
      }]
    });
    service = TestBed.inject(ExternalUrlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

@Injectable({
  providedIn: 'root'
})
class MockAdvancedRouter {

  constructor(private router: Router) {
  }

  createUrlTree(commands: any[], extras?: UrlCreationOptions) : UrlTree {
    const urlTree = new UrlTree();

    // Segments
    urlTree.root = new UrlSegmentGroup(
      commands.map(c => new UrlSegment(
        (<string>c).startsWith('/')
          ? (<string>c).substring(1)
          : <string>c,
        { }
      )),
      { }
    );

    // QueryParams
    if ((typeof extras !== 'undefined') && (typeof extras.queryParams !== 'undefined') && (extras.queryParams !== null)) {
      urlTree.queryParams = extras.queryParams;
    } else {
      urlTree.queryParams = { };
    }

    return urlTree;
  }

  serializeUrl(url: UrlTree) {
    return this.router.serializeUrl(url);
  }
}

@Component({
  selector: 'test-home-component',
  template: `<h2>Home</h2>`
})
class HomeComponent {
}
