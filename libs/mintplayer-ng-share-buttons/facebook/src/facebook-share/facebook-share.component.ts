import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Params } from '@angular/router';
import { BehaviorSubject, combineLatest, Subject, filter, take } from 'rxjs';
import { ExternalUrlService } from '@mintplayer/ng-share-buttons';
import { loadScript } from '@mintplayer/script-loader';

@Component({
  selector: 'facebook-share',
  templateUrl: './facebook-share.component.html',
  styleUrls: ['./facebook-share.component.scss'],
  standalone: true,
})
export class FacebookShareComponent implements AfterViewInit {

  constructor(
    private externalUrlService: ExternalUrlService
  ) {
    combineLatest([this.isViewInited$, this.commands$])
      .pipe(filter(([isViewInited, commands]) => !!isViewInited && !!commands))
      .pipe(takeUntilDestroyed())
      .subscribe(([isViewInited, commands]) => {
        loadScript('https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v3.0', { windowCallback: 'fbAsyncInit'})
          .then((params) => this.sdkReady$.next(true));
      });


    combineLatest([this.sdkReady$.pipe(filter(r => !!r), take(1)), this.commands$, this.queryParams$])
      .pipe(takeUntilDestroyed())
      .subscribe(([r, commands, queryParams]) => {
        // Update href
        const href = this.externalUrlService.buildUrl(commands!, queryParams);
        this.href$.next(href);
      });
    
    this.href$
      .pipe(filter((href) => !!href))
      .pipe(takeUntilDestroyed())
      .subscribe((href) => {
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            this.wrapper.nativeElement.innerHTML = `<div class="fb-share-button" data-href="${href}" data-size="${this.size}" data-layout="${this.layout}"></div>`;
            (<any>window)['FB'] && (<any>window)['FB'].XFBML.parse(this.wrapper.nativeElement);
          }, 20);
        }
      });
  }

  private isViewInited$ = new BehaviorSubject<boolean>(false);
  private sdkReady$ = new BehaviorSubject<boolean>(false);
  
  private commands$ = new BehaviorSubject<any[] | null>(null);
  private queryParams$ = new BehaviorSubject<Params>({});
  private href$ = new BehaviorSubject<string | null>(null);

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  //#region shareRouterLink
  @Input() set shareRouterLink(value: string | any[]) {
    if (value === null) {
      this.commands$.next([]);
    } else if (Array.isArray(value)) {
      this.commands$.next(value);
    } else {
      this.commands$.next([value]);
    }
  }
  //#endregion
  //#region queryParams
  @Input() set queryParams(value: Params | null) {
    this.queryParams$.next(value ?? {});
  }
  //#endregion
  //#region size
  @Input() size: 'large' | 'small' = 'large';
  //#endregion
  //#region layout
  @Input() layout: 'icon_link' | 'box_count' | 'button_count' | 'button' = 'button_count';
  //#endregion

  @ViewChild('wrapper') wrapper!: ElementRef<HTMLDivElement>;

}
