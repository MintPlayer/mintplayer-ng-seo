# @mintplayer/ng-seo

This package bundles some actions to create the tags required for Search-Engine Optimization.

## Installation

    npm install --save @mintplayer/ng-seo

## Usage

1) Inject the `SeoTagService` anywhere you want to add/remove the tags

    import { Component } from '@angular/core';
    import { SeoTagService } from '@mintplayer/ng-seo';

    @Component({
        selector: 'app-root',
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.scss']
    })
    export class AppComponent {
        constructor(private seoTagService: SeoTagService) {
        }
    }

2) Call `seoTagService.addTags(currentUrl, canonicalUrl, title, description)` in the `OnInit` hook. `canonicalUrl` is the url that primarily represents your content (eg. without query parameters).

3) Store the result of the `seoTagService.addTags` call in a field.

4) Call `seoTagService.removeTags(tags)` in the `OnDestroy hook`.