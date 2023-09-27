import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SeoDirective } from './seo.directive';

@Component({
  selector: 'seo-test-component',
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
  template: `<h1>Home</h1>`
})
class HomePageComponent { }

@Component({
  selector: 'about-page',
  template: `<h1>About</h1>`
})
class AboutPageComponent { }

describe('HrefLangDirective', () => {
  let fixture: ComponentFixture<SeoTestComponent>;

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
        SeoDirective,

        // Mock dependencies
        HomePageComponent,
        AboutPageComponent,

        // Testbench
        SeoTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeoTestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
