/**
 * Instance doména (controllers.common.ConfigController) – docs/refactoring.md,
 * sekce A/D. Komponenta nezná URL ani tvar požadavku; heartbeat (`hooks/useInstanceMessages`)
 * i název projektu (`context/ProjectNameContext`) konzumují tento service.
 */

import {apiGet, type ApiOptions} from "./apiClient";
import type {ApiResult} from "@/models/ApiResponse";
import {parseInstanceMessages, type InstanceMessage} from "@/models/InstanceMessage";

/**
 * GET /api/react/infoGlobal – aktivní zprávy typu Maintenance.
 *
 * Gotcha (docs/gotchas.md): endpoint vrací **pole bez `JsonResult` obálky**
 * (backend `ConfigController.infoGlobal` – `ok(Json.toJson(messages))`).
 * Neopravovat na backendu; tady se pole toleratně parsuje.
 */
export async function loadInstanceMessages(options?: ApiOptions): Promise<InstanceMessage[]> {
    const raw = await apiGet<unknown>("/api/react/infoGlobal", options);
    return parseInstanceMessages(raw);
}

/**
 * GET /api/react/playmessage/project_name – název projektu (PlayMessage).
 * Vrací obálku `{success, data: {value}}`; hodnota je bohatý text, proto se
 * HTML tagy odstraní (domácí DOM parsování, žádná nová dependency).
 * Při neúspěchu vrací prázdný řetězec – menu pak zobrazí prázdný brand.
 */
export async function loadProjectName(lang: string, options?: ApiOptions): Promise<string> {
    const payload = await apiGet<ApiResult<{value?: string}>>("/api/react/playmessage/project_name", {
        ...options,
        params: {lang},
    });
    if (payload?.success !== true || !payload.data) {
        return "";
    }
    return stripHtml(payload.data.value ?? "");
}

/** Odstraní HTML tagy z hodnoty PlayMessage (bez DOMPurify – vstup je důvěryhodný backend). */
function stripHtml(html: string): string {
    const element = document.createElement("div");
    element.innerHTML = html;
    return element.textContent || element.innerText || "";
}
