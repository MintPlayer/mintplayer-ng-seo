import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SeoTags } from './seo-tags';

@Injectable({
  providedIn: 'root'
})
export class SeoTagService {

  // ng new mintplayer-ng-seo --create-application=false
  // cd mintplayer-ng-seo
  // ng generate library @mintplayer/ng-seo
  // ng build @mintplayer/ng-seo --prod
  // npm login
  // npm publish --access public

  private document: Document;

  constructor(private titleService: Title, private metaService: Meta, @Inject(DOCUMENT) document: any) {
    this.document = <Document>document;
  }

  public addTags(url: string, canonical: string, title: string, description: string) {
    let ogTags = this.addOpenGraphTags(url, title, description);
    let basicTags = this.addBasicTags(url, title, description);
    let canonicalTag = this.addCanonicalTag(canonical);

    return <SeoTags>{ ogTags, basicTags, canonicalTag };
  }

  public removeTags(seoTags: SeoTags) {
    if (seoTags != null) {
      this.removeBasicTags(seoTags);
      this.removeOpenGraphTags(seoTags);
      this.removeCanonicalTag(seoTags);
    }
  }

  private addBasicTags(url: string, title: string, description: string) {
    this.titleService.setTitle(title);
    return this.metaService.addTags([
      { name: 'description', itemprop: 'description', content: description },
    ]);
  }
  private addOpenGraphTags(url: string, title: string, description: string) {
    return this.metaService.addTags([
      { property: 'og:url', content: url },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
    ]);
  }
  private addCanonicalTag(url: string) {
    // Create link
    let link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);

    // Insert link in DOM
    this.document.head.appendChild(link);

    return link;
  }
  private removeBasicTags(seoTags: SeoTags) {
    seoTags.basicTags.forEach((tag) => {
      this.metaService.removeTagElement(tag);
    });
  }
  private removeOpenGraphTags(seoTags: SeoTags) {
    seoTags.ogTags.forEach((tag) => {
      this.metaService.removeTagElement(tag);
    });
  }
  private removeCanonicalTag(seoTags: SeoTags) {
    this.document.querySelectorAll('link[rel=canonical]').forEach((link) => {
      link.remove();
    });
  }
  
}
