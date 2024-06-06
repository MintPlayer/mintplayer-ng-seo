import { Component } from '@angular/core';
import { FacebookShareComponent } from '@mintplayer/ng-share-buttons/facebook';
import { LinkedinShareComponent } from '@mintplayer/ng-share-buttons/linkedin';
import { TwitterShareComponent } from '@mintplayer/ng-share-buttons/twitter';

@Component({
  selector: 'mintplayer-ng-share-buttons-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  standalone: true,
  imports: [
    FacebookShareComponent,
    TwitterShareComponent,
    LinkedinShareComponent,
  ]
})
export class ContactComponent {}
