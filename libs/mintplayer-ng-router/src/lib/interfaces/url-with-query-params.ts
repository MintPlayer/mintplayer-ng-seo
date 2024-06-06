import { Params } from "@angular/router";

export interface UrlWithQueryParams {
    url: string;
    queryParams: Params;
}