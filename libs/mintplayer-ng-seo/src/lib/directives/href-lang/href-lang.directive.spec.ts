import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationExtras } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HrefLangDirective } from './href-lang.directive';

interface MockCommandsAndExtras {
  commands: any[];
  extras?: NavigationExtras;
}

@Component({
  selector: 'href-lang-test-component',
  template: `
    <ng-container [hrefLang]="hrefLangData">
    </ng-container>`
})
class HrefLangTestComponent {
  hrefLangData: Record<string, MockCommandsAndExtras> = {
    en: {
      commands: ['/'],
      extras: {
        queryParams: {
          lang: null,
          id: 0
        }
      }
    }
  };

  incrementCounter() {
    this.hrefLangData['en'].extras!.queryParams!['id']++;
  }
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
  let fixture: ComponentFixture<HrefLangTestComponent>;

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
        HrefLangDirective,

        // Mock dependencies
        HomePageComponent,
        AboutPageComponent,

        // Testbench
        HrefLangTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrefLangTestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
