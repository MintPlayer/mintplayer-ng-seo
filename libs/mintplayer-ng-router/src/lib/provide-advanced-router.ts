import { Provider } from "@angular/core";
import { ROUTER } from "@mintplayer/ng-router-provider";
import { AdvancedRouter } from "./advanced-router/advanced-router.service";
import { AdvancedRouterConfig } from "./interfaces/advanced-router-config";
import { ADVANCED_ROUTER_CONFIG } from "./advanced-router-config.provider";

export function provideAdvancedRouter(config: AdvancedRouterConfig): Provider[] {
    return [
        { provide: ROUTER, useClass: AdvancedRouter },
        { provide: ADVANCED_ROUTER_CONFIG, useValue: config }
    ]
}