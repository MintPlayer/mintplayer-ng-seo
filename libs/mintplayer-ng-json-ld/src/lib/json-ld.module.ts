import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JsonLdDirective } from './directives/json-ld/json-ld.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [JsonLdDirective],
  exports: [JsonLdDirective],
})
export class JsonLdModule {}
