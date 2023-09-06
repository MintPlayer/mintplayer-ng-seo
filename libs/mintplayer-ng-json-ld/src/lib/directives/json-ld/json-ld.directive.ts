import { DOCUMENT } from '@angular/common';
import { Directive, Inject, Input, OnDestroy, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest } from 'rxjs';

@Directive({
  selector: '[jsonLd]'
})
export class JsonLdDirective implements OnDestroy {

  constructor(private renderer: Renderer2, @Inject(DOCUMENT) document: any) {
    this.document = <Document>document;
    this.scriptTag = renderer.createElement('script');
    this.scriptTag.type = 'application/json';
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
