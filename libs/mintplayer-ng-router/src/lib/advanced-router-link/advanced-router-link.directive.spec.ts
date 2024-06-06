import { CommonModule } from '@angular/common';
import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, UrlCreationOptions, UrlSegment, UrlSegmentGroup, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { AdvancedRouter } from '../advanced-router/advanced-router.service';
import { AdvancedRouterLinkDirective } from './advanced-router-link.directive';

@Component({
  selector: 'advanced-router-link-test-component',
  template: `
    <a [advRouterLink]='["/test", "home"]'>
      Home
    </a>
    <a [advRouterLink]='["/test", "about"]'>
      About
    </a>
    <router-outlet></router-outlet>`
})
class AdvancedRouterLinkTestComponent { }

describe('AdvancedRouterLinkDirective', () => {
  let fixture: ComponentFixture<AdvancedRouterLinkTestComponent>;
  let debugElements: DebugElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        AdvancedRouterLinkDirective,
        RouterTestingModule.withRoutes([
          { path: '', pathMatch: 'full', redirectTo: '/test' },
          {
            path: 'test',
            children: [
              { path: '', pathMatch: 'full', redirectTo: '/test/home' },
              { path: 'home', pathMatch: 'full', component: MockHomePageComponent },
              { path: 'about', pathMatch: 'full', component: MockAboutPageComponent },
            ]
          }
        ])
      ],
      declarations: [
        AdvancedRouterLinkTestComponent,

        MockHomePageComponent,
        MockAboutPageComponent
      ],
      providers: [
        {
          provide: AdvancedRouter,
          useClass: MockAdvancedRouter
        },
        MockProvider(Location),
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdvancedRouterLinkTestComponent);

    // Get all elements with an attached AdvancedRouterLinkDirective
    debugElements = fixture.debugElement.queryAll(By.directive(AdvancedRouterLinkDirective));

    // Initial binding
    fixture.detectChanges();
  });

  // Get element test
  it('should discover two elements', () => {
    expect(debugElements.length).toEqual(2);
  });

  // Anchor test
  it('should contain an anchor tag', () => {
    expect(debugElements[0].nativeElement).toBeInstanceOf(HTMLAnchorElement);
    expect(debugElements[1].nativeElement).toBeInstanceOf(HTMLAnchorElement);
  });

  // href test
  it('should have a href', () => {
    const anchor0 = <HTMLAnchorElement>debugElements[0].nativeElement;
    const anchor1 = <HTMLAnchorElement>debugElements[1].nativeElement;

    console.log('Anchor 0', anchor0.getAttribute('href'));
    expect(anchor0.href).toBeDefined();

    console.log('Anchor 1', anchor1.getAttribute('href'));
    expect(anchor1.href).toBeDefined();
  });

  // href values test
  it('should have the correct hrefs', (inject(
    [Router, Location],
    (router: Router, location: Location) => {
      const anchor0 = <HTMLAnchorElement>debugElements[0].nativeElement;
      const anchor1 = <HTMLAnchorElement>debugElements[1].nativeElement;

      fixture.whenStable().then(() => {
        expect(anchor0.getAttribute('href')).toEqual('/test/home');
        expect(anchor1.getAttribute('href')).toEqual('/test/about');
      });
    }
  )));
});

class MockAdvancedRouter {
  createUrlTree(commands: any[], extras?: UrlCreationOptions) {
    return new UrlTree(
      new UrlSegmentGroup([], {
        '': new UrlSegmentGroup(commands.map(String).map(c => new UrlSegment(c.startsWith('/') ? c.substring(1) : c, {})), {}),
      }),
      extras?.queryParams || {}
    );
  }
}

@Component({
  selector: 'mock-home-page-component',
  template: `<h1>Home</h1>`
})
class MockHomePageComponent {}

@Component({
  selector: 'mock-about-page-component',
  template: `<h1>About</h1>`
})
class MockAboutPageComponent {}