import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

@Component({
  selector: 'home-page',
  standalone: true,
  imports: [],
  template: `<h1>Home</h1>`
})
class HomePageComponent { }

@Component({
  selector: 'about-page',
  standalone: true,
  imports: [],
  template: `<h1>About</h1>`
})
class AboutPageComponent { }

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        
        // Mock dependencies
        HomePageComponent,
        AboutPageComponent,

        // Unit to test
        AppComponent,
      ],
      declarations: [],
      providers: [
        provideRouter([
          { path: '', component: HomePageComponent },
          { path: 'about', component: AboutPageComponent }
        ]),
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'seo-demo'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('seo-demo');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Welcome to seo-demo!'
    );
  });
});
