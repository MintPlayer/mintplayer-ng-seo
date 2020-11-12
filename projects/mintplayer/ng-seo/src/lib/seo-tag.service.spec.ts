import { TestBed } from '@angular/core/testing';

import { SeoTagService } from './seo-tag.service';

describe('NgSeoService', () => {
  let service: SeoTagService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoTagService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
