import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonLdDirective } from './json-ld.directive';
import { provideRouter } from '@angular/router';

@Component({
  selector: 'json-ld-test-component',
  standalone: true,
  imports: [
    // Unit to test
    JsonLdDirective,
  ],
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
  standalone: true,
  template: `<h1>Home</h1>`
})
class HomePageComponent { }

@Component({
  selector: 'about-page',
  standalone: true,
  template: `<h1>About</h1>`
})
class AboutPageComponent { }

describe('JsonLdDirective', () => {
  let fixture: ComponentFixture<JsonLdTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: HomePageComponent },
          { path: 'about', component: AboutPageComponent }
        ])
      ],
      imports: [
        CommonModule,

        // Mock dependencies
        HomePageComponent,
        AboutPageComponent,

        // Testbench
        JsonLdTestComponent,
      ],
      declarations: []
    })
    .compileComponents();

    fixture = TestBed.createComponent(JsonLdTestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
