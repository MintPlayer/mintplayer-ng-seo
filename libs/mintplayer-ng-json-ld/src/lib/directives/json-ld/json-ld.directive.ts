import { DOCUMENT } from '@angular/common';
import { Directive, Inject, Input, OnDestroy, Renderer2 } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[jsonLd]'
})
export class JsonLdDirective implements OnDestroy {

  constructor(private domSanitizer: DomSanitizer, private renderer: Renderer2, @Inject(DOCUMENT) document: any) {
    this.document = <Document>document;
    this.scriptTag = renderer.createElement('script');
    this.scriptTag.type = 'application/json';
    this.renderer.appendChild(this.document.head, this.scriptTag);

    combineLatest([this.jsonLd$, this.minify$])
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([jsonLd, minify]) => {
        this.scriptTag.innerHTML = JSON.stringify(jsonLd, null, minify ? undefined : 2);
      });
  }

  private document: Document;
  private scriptTag: HTMLScriptElement;

  private jsonLd$ = new BehaviorSubject<unknown>(null);
  private minify$ = new BehaviorSubject<boolean>(true);
  private destroyed$ = new Subject();

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
    this.destroyed$.next(true);
    if (this.scriptTag) {
      this.scriptTag.remove();
    }
  }
}
