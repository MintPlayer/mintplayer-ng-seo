import { ApplicationConfig } from "@angular/core";
import { PreloadAllModules, provideRouter, withEnabledBlockingInitialNavigation, withPreloading } from "@angular/router";
import { APP_ROUTES } from "./app.routes";
import { provideAdvancedRouter } from "@mintplayer/ng-router";
import { provideBaseHref } from "@mintplayer/ng-base-url";

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(APP_ROUTES, withPreloading(PreloadAllModules), withEnabledBlockingInitialNavigation()),
        provideAdvancedRouter({ navigationDelay: 1000 }),
        provideBaseHref(),
    ]
}