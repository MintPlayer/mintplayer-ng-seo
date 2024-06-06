import { APP_BASE_HREF } from "@angular/common";
import { Provider } from "@angular/core";

export function provideTestBaseHref(href?: string): Provider[] {
    return [
        { provide: APP_BASE_HREF, useValue: href || '' },
    ];
}