import { provideZonelessChangeDetection } from '@angular/core';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  teardown: { destroyAfterEach: true },
});

// The application bootstraps zoneless, so the tests do too. Without an
// explicit provider an Angular 22 TestBed supplies a NoopNgZone anyway, which
// silently diverges from whatever the app is configured with -- stating it
// keeps the two in step.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
});
