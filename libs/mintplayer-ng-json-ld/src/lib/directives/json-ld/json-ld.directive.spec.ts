import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { JsonLdDirective } from './json-ld.directive';

@Component({
  selector: 'json-ld-test-component',
  template: `
    <ng-container
      [jsonLd]="{title: 'Whatever ' + counter, artist: 'Oasis'}"
      [minify]="false"></ng-container>`
})
class JsonLdTestComponent {
  counter = 0;
}

@Component({
  selector: 'home-page',
  template: `<h1>Home</h1>`
})
class HomePageComponent { }

@Component({
  selector: 'about-page',
  template: `<h1>About</h1>`
})
class AboutPageComponent { }

describe('JsonLdDirective', () => {
  let fixture: ComponentFixture<JsonLdTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RouterTestingModule.withRoutes([
          { path: '', component: HomePageComponent },
          { path: 'about', component: AboutPageComponent }
        ])
      ],
      declarations: [
        // Unit to test
        JsonLdDirective,

        // Mock dependencies
        HomePageComponent,
        AboutPageComponent,

        // Testbench
        JsonLdTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JsonLdTestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
