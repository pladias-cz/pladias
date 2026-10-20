/**
 * User doména (controllers.common.UserController + ConfigController) –
 * docs/refactoring.md, sekce D. Komponenta nezná URL ani tvar požadavku.
 */

import {ApiError, apiGet, apiPost, ensureSuccess} from "./apiClient";
import type {ApiResult} from "@/models/ApiResponse";
import {parseRoles, type UserRole} from "@/models/UserRole";

/**
 * GET /api/react/config – konfigurace instance + data přihlášeného uživatele
 * (bez `JsonResult` obálky, backend vrací čistý JSON).
 */
export interface ReactConfig {
    id: number;
    isVascular: boolean;
    hasAtlasModule: boolean;
    hasBiblioModule: boolean;
    hasMeasurementsModule: boolean;
    /** Role přiřazené backendem (enum UserRole) – runtime kontrola driftu BE↔FE v `parseRoles`. */
    roles: UserRole[];
    userEmail: string;
    language: string;
    supervisedTaxonIds: number[];
}

export async function loadReactConfig(): Promise<ReactConfig> {
    const config = await apiGet<ReactConfig>("/api/react/config");
    // Sekce B: neznámé role z backendu se zalogují (drift BE↔FE) a zahodí.
    return {...config, roles: parseRoles(config?.roles)};
}

export interface AddUserInput {
    name: string;
    surname: string;
    email: string;
}

/**
 * POST /api/react/users – založení uživatele (mailem dostane pozvánku).
 * Vrací hlášku z obálky; chyby (duplicitní email, nevalidní data) přichází
 * přes HTTP status a končí jako `ApiError`.
 */
export async function addUser(input: AddUserInput): Promise<string> {
    const payload = await apiPost<ApiResult>("/api/react/users", input);
    return ensureSuccess(payload).message ?? "";
}

export interface ChangeEmailInput {
    password: string;
    newEmail: string;
}

/** POST /api/react/user/changeEmail – změna e-mailu po ověření hesla. Vrací úspěšnou hlášku. */
export async function changeEmail(input: ChangeEmailInput): Promise<string> {
    const payload = await apiPost<ApiResult>("/api/react/user/changeEmail", input);
    return ensureSuccess(payload).message ?? "";
}

export interface ChangePasswordInput {
    originalPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

/** POST /api/react/user/changePassword – vrací úspěšnou hlášku. */
export async function changePassword(input: ChangePasswordInput): Promise<string> {
    const payload = await apiPost<ApiResult>("/api/react/user/changePassword", input);
    return ensureSuccess(payload).message ?? "";
}

/** POST /api/react/user/createToken – API token pro externí nástroje. */
export async function createApiToken(): Promise<string> {
    const payload = await apiPost<ApiResult<{token: string}>>("/api/react/user/createToken");
    const token = ensureSuccess(payload).data?.token;
    if (!token) {
        throw new ApiError("Odpověď createToken neobsahuje token.");
    }
    return token;
}
