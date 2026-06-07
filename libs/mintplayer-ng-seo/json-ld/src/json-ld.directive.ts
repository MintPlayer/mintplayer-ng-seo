import { DOCUMENT } from '@angular/common';
import { Directive, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest } from 'rxjs';

@Directive({
  selector: '[jsonLd]',
  standalone: true,
})
export class JsonLdDirective implements OnDestroy {
  private renderer = inject(Renderer2);


  constructor() {
    const renderer = this.renderer;
    const document = inject(DOCUMENT);

    this.document = <Document>document;
    this.scriptTag = renderer.createElement('script');
    // Structured data must be 'application/ld+json' — crawlers (Google etc.) only parse JSON-LD
    // from that MIME type; 'application/json' scripts are ignored as structured data.
    this.scriptTag.type = 'application/ld+json';
    this.renderer.appendChild(this.document.head, this.scriptTag);

    combineLatest([this.jsonLd$, this.minify$])
      .pipe(takeUntilDestroyed())
      .subscribe(([jsonLd, minify]) => {
        this.scriptTag.innerHTML = JSON.stringify(jsonLd, null, minify ? undefined : 2);
      });
  }

  private document: Document;
  private scriptTag: HTMLScriptElement;

  private jsonLd$ = new BehaviorSubject<unknown>(null);
  private minify$ = new BehaviorSubject<boolean>(true);

  //#region jsonLd
  public get jsonLd() {
    return this.jsonLd$.value;
  }
  @Input() set jsonLd(json: unknown) {
    this.jsonLd$.next(json);
  }
  //#endregion
  //#region minify
  public get minify() {
    return this.minify$.value;
  }
  @Input() public set minify(value: boolean) {
    this.minify$.next(value);
  }
  //#endregion

  ngOnDestroy() {
    if (this.scriptTag) {
      this.scriptTag.remove();
    }
  }
}
