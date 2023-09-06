import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseUrlModule } from '@mintplayer/ng-base-url';
import { SeoDirective } from './directives/seo/seo.directive';
import { HrefLangDirective } from './directives/href-lang/href-lang.directive';
import { CanonicalUrlDirective } from './directives/canonical/canonical.directive';

@NgModule({
  imports: [CommonModule, BaseUrlModule],
  declarations: [SeoDirective, HrefLangDirective, CanonicalUrlDirective],
  exports: [SeoDirective, HrefLangDirective, CanonicalUrlDirective],
})
export class SeoModule {}
