import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdvancedRouter } from './advanced-router.service';
import { ADVANCED_ROUTER_CONFIG } from '../advanced-router-config.provider';
import { AdvancedRouterConfig } from '../interfaces/advanced-router-config';

// OK
describe('Router', () => {
  let advancedRouter: AdvancedRouter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      providers: [{
        provide: ADVANCED_ROUTER_CONFIG,
        useValue: <AdvancedRouterConfig>{
          navigationDelay: 5,
          queryParams: {
            'lang': 'preserve',
            'return-url': '',
            'options': 'merge'
          },
        }
      }]
    });
    advancedRouter = TestBed.inject(AdvancedRouter);
  });

  it('should be created', () => {
    expect(advancedRouter).toBeTruthy();
  });
});
