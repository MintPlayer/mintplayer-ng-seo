import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdvancedRouterLinkDirective } from '@mintplayer/ng-router';

@Component({
  selector: 'mintplayer-ng-share-buttons-people',
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss'],
  standalone: true,
  imports: [RouterOutlet, AdvancedRouterLinkDirective],
})
export class PeopleComponent {
  numbers = [...Array(9).keys()];
}
