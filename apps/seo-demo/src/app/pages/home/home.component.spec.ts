import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationExtras } from '@angular/router';
import { HomeComponent } from './home.component';

interface MockSeoInformation {
  title: string;
  description: string;
}
interface MockCommandsAndExtras {
  commands: any[];
  extras?: NavigationExtras;
}

@Directive({
  selector: '[jsonLd]'
})
class MockJsonLdDirective {
  @Input() jsonLd: unknown;
  @Input() minify = true;
}

@Directive({
  selector: '[seo]'
})
class MockSeoDirective {
  @Input() seo: MockSeoInformation | null = null;
  @Input() standardUrl: MockCommandsAndExtras | null = null;
  @Input() canonicalUrl: MockCommandsAndExtras | null = null;
}

@Directive({
  selector: '[hrefLang]'
})
class MockHrefLangDirective {
  @Input() hrefLang: Record<string, MockCommandsAndExtras> = {};
}


describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        HomeComponent,
      
        // Mock dependencies
        MockJsonLdDirective,
        MockSeoDirective,
        MockHrefLangDirective
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
