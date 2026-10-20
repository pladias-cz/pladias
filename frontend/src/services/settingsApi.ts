/**
 * User settings (controllers.common.UserController: GET/PUT/DELETE
 * /api/react/user/settings/{key}) – docs/refactoring.md, sekce D.
 *
 * Gotcha: tady obálka nese `value` místo `data` a `success: false` u GET
 * znamená „uživatel nemá hodnotu nastavenou" (fallback na výchozí hodnotu
 * ve stavu komponenty), nikoli chybu – proto se GET neověřuje přes
 * `ensureSuccess`.
 */

import {apiDelete, apiGet, apiPut, ensureSuccess} from "./apiClient";
import type {ApiResult} from "@/models/ApiResponse";

/** Odpověď GET/PUT /api/react/user/settings/{key}. */
export interface UserSettingResult extends ApiResult {
    value?: string;
}

/** Mapování backend klíčů (snake_case) na stavové klíče komponent (camelCase). */
const BACKEND_TO_STATE_KEY_MAPPING: Record<string, string> = {
    traits_substitute_false: "traitsSubstituteFalse",
    traits_substitute_true: "traitsSubstituteTrue",
    traits_substitute_null: "traitsSubstituteNull",
    traits_substitute_unmeasurable: "traitsSubstituteUnmeasurable",
    traits_substitute_percentasinteger: "traitsSubstitutePercentInteger",
    application_language: "applicationLanguage",
    traits_substitute_english: "traitsSubstituteInEnglish",
};

/** Přebývá hodnota boolean (parsuje se z "true"/"false")? */
export function isBooleanSetting(backendKey: string): boolean {
    return backendKey.includes("traits_substitute_percentasinteger")
        || backendKey.includes("traits_substitute_english");
}

/** Převede backend klíč na stavový klíč komponenty. */
export function mapBackendKeyToStateKey(backendKey: string): string {
    return BACKEND_TO_STATE_KEY_MAPPING[backendKey] ?? backendKey;
}

/**
 * GET – hodnota nastavení; `null` znamená „není nastaveno" (volající použije
 * výchozí hodnotu).
 */
export async function getUserSetting(key: string): Promise<string | null> {
    const payload = await apiGet<UserSettingResult>(`/api/react/user/settings/${key}`);
    return payload.success && payload.value ? payload.value : null;
}

/** PUT – vrací uloženou hodnotu (echo z backendu, normalizovanou na straně serveru). */
export async function saveUserSetting(key: string, value: string): Promise<string> {
    const payload = await apiPut<UserSettingResult>(`/api/react/user/settings/${key}`, {value});
    return ensureSuccess(payload).value ?? value;
}

/** DELETE /{keyPrefix} – smazání znamená reset na výchozí hodnoty držené ve frontendu. */
export async function resetUserSettings(keyPrefix: string): Promise<void> {
    ensureSuccess(await apiDelete<ApiResult>(`/api/react/user/settings/${keyPrefix}`));
}
