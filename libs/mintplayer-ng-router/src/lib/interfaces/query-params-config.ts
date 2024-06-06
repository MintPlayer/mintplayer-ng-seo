import { QueryParamsHandling } from "@angular/router";

export interface QueryParamsConfig {
    [key: string]: QueryParamsHandling;
}