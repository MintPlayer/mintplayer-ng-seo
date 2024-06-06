import { NavigationBehaviorOptions, NavigationExtras, UrlCreationOptions, UrlTree } from "@angular/router";

export interface IRouter {
    navigate(commands: any[], extras?: NavigationExtras) : Promise<boolean>;
    navigateByUrl(url: string | UrlTree, extras?: NavigationBehaviorOptions) : Promise<boolean>;
    createUrlTree(commands: any[], extras?: UrlCreationOptions) : UrlTree;
    serializeUrl(url: UrlTree) : string;
}