import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FacebookShareComponent } from '@mintplayer/ng-share-buttons/facebook';
import { LinkedinShareComponent } from '@mintplayer/ng-share-buttons/linkedin';
import { TwitterShareComponent } from '@mintplayer/ng-share-buttons/twitter';

@Component({
  selector: 'mintplayer-ng-share-buttons-show',
  templateUrl: './show.component.html',
  styleUrls: ['./show.component.scss'],
  standalone: true,
  imports: [
    FacebookShareComponent,
    TwitterShareComponent,
    LinkedinShareComponent,
  ]
})
export class ShowComponent {
  constructor(private route: ActivatedRoute) {
    // We must detect the change of the url-parameter ourselfs
    this.route.paramMap.subscribe((params) => {
      if (params.has('id')) {
        const id = params.get('id');
        if (id) {
          this.id = parseInt(id);
        } else {
          this.id = null;
        }
      } else {
        this.id = null;
      }
    });
  }
  
  id: number | null = null;
}
