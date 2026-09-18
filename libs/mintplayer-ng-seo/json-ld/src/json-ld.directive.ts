import { DOCUMENT } from '@angular/common';
import { Directive, OnDestroy, Renderer2, booleanAttribute, effect, inject, input } from '@angular/core';

@Directive({
  selector: '[jsonLd]',
  standalone: true,
})
export class JsonLdDirective implements OnDestroy {
  private renderer = inject(Renderer2);

  readonly jsonLd = input<unknown>(null);
  readonly minify = input(true, { transform: booleanAttribute });

  constructor() {
    const renderer = this.renderer;
    const document = inject(DOCUMENT);

    this.document = <Document>document;
    this.scriptTag = renderer.createElement('script');
    // Structured data must be 'application/ld+json' — crawlers (Google etc.) only parse JSON-LD
    // from that MIME type; 'application/json' scripts are ignored as structured data.
    this.scriptTag.type = 'application/ld+json';
    this.renderer.appendChild(this.document.head, this.scriptTag);

    effect(() => {
      this.scriptTag.innerHTML = JSON.stringify(this.jsonLd(), null, this.minify() ? undefined : 2);
    });
  }

  private document: Document;
  private scriptTag: HTMLScriptElement;

  ngOnDestroy() {
    if (this.scriptTag) {
      this.scriptTag.remove();
    }
  }
}
