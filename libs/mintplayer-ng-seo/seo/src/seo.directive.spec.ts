import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeoDirective } from './seo.directive';
import { provideRouter } from '@angular/router';

@Component({
  selector: 'seo-test-component',
  standalone: true,
  imports: [
    // Unit to test
    SeoDirective,
  ],
  template: `
    <ng-container seo
      [title]="'Hello world ' + counter"
      [description]="'Welcome ' + counter"
      [commands]='["/"]'
      [queryParams]="{ lang: ''}"
      [fragment]="null"></ng-container>`
})
class SeoTestComponent {
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

describe('HrefLangDirective', () => {
  let fixture: ComponentFixture<SeoTestComponent>;

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
        SeoTestComponent
      ],
      declarations: []
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeoTestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
