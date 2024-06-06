import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Params } from '@angular/router';
import { ExternalUrlService } from '@mintplayer/ng-share-buttons';
import { loadScript } from '@mintplayer/script-loader';
import { BehaviorSubject, combineLatest, filter, Subject, take } from 'rxjs';

@Component({
  selector: 'linkedin-share',
  templateUrl: './linkedin-share.component.html',
  styleUrls: ['./linkedin-share.component.scss'],
  standalone: true,
})
export class LinkedinShareComponent implements AfterViewInit {

  constructor(
    private externalUrlService: ExternalUrlService
  ) {
    combineLatest([this.isViewInited$, this.commands$])
      .pipe(filter(([isViewInited, commands]) => !!isViewInited && !!commands))
      .pipe(takeUntilDestroyed())
      .subscribe(([isViewInited, commands]) => {
        loadScript('https://platform.linkedin.com/in.js')
          .then((...params) => this.sdkReady$.next(true));
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
            this.wrapper.nativeElement.innerHTML = `<script type="IN/Share" data-url="${href}" data-size="${this.size}" data-text="${this.text}"></script>`;
            (<any>window)['IN'] && (<any>window)['IN'].parse();
          }, 20);
        }
      });
  }

  private isViewInited$ = new BehaviorSubject<boolean>(false);
  private sdkReady$ = new BehaviorSubject<boolean>(false);

  private commands$ = new BehaviorSubject<any[]>([]);
  private queryParams$ = new BehaviorSubject<Params>({});
  private href$ = new BehaviorSubject<string | null>(null);
  
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
  //#region text
  @Input() text = '';
  //#endregion
  
  @ViewChild('wrapper') wrapper!: ElementRef<HTMLDivElement>;

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }
}
