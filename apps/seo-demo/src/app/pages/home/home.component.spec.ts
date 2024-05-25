import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective } from 'ng-mocks';
import { JsonLdDirective } from '@mintplayer/ng-json-ld';
import { CanonicalUrlDirective, HrefLangDirective, SeoDirective } from '@mintplayer/ng-seo';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(JsonLdDirective),
        MockDirective(SeoDirective),
        MockDirective(HrefLangDirective),
        MockDirective(CanonicalUrlDirective),
      ],
      declarations: [
        // Unit to test
        HomeComponent,
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
