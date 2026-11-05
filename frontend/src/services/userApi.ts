/**
 * User doména (controllers.common.UserController + ConfigController).
 * Komponenta nezná URL ani tvar požadavku.
 */

import {ApiError, apiGet, apiPost, apiPut, ensureSuccess, requireData, requireEnvelope} from './apiClient';
import type {ApiResult} from '@/models/ApiResponse';
import type {ExternalProject} from '@/models/AtlasRecords';
import {parseExternalSources} from '@/models/AtlasRecords';
import type {UserId} from '@/models/UserId';
import {parseRoles, type UserRole} from '@/models/UserRole';

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
    /** Excerpční projekty (conf `atlas.excerptionProjectIds`) – výjimečné chování v tabulce záznamů. */
    excerptionProjectIds: number[];
    /** NDOP projekty (conf `atlas.ndopProjectIds`) – přímý odkaz na kartu nálezu. */
    ndopProjectIds: number[];
    /** Externí zdroje záznamů dostupné v instanci (conf `atlas.externalRecordSources`) – map detail. */
    externalRecordSources?: ExternalProject[];
    /** Role přiřazené backendem (enum UserRole) – runtime kontrola driftu BE↔FE v `parseRoles`. */
    roles: UserRole[];
    userEmail: string;
    language: string;
    supervisedTaxonIds: number[];
}

export async function loadReactConfig(): Promise<ReactConfig> {
    const config = await apiGet<ReactConfig>('/api/react/config');
    // Sekce B: neznámé role z backendu se zalogují (drift BE↔FE) a zahodí;
    // stejně tak externí zdroje záznamů (atlas.externalRecordSources).
    return {
        ...config,
        roles: parseRoles(config?.roles),
        externalRecordSources: parseExternalSources(config?.externalRecordSources),
    };
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
    const payload = await apiPost<ApiResult>('/api/react/users', input);
    return ensureSuccess(payload).message ?? '';
}

export interface ChangeEmailInput {
    password: string;
    newEmail: string;
}

/** POST /api/react/user/changeEmail – změna e-mailu po ověření hesla. Vrací úspěšnou hlášku. */
export async function changeEmail(input: ChangeEmailInput): Promise<string> {
    const payload = await apiPost<ApiResult>('/api/react/user/changeEmail', input);
    return ensureSuccess(payload).message ?? '';
}

export interface ChangePasswordInput {
    originalPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

/** POST /api/react/user/changePassword – vrací úspěšnou hlášku. */
export async function changePassword(input: ChangePasswordInput): Promise<string> {
    const payload = await apiPost<ApiResult>('/api/react/user/changePassword', input);
    return ensureSuccess(payload).message ?? '';
}

/**
 * POST /api/react/users/{id}/resetPassword – sysAdmin požádá o reset hesla uživatele;
 * uživateli přijde e-mail s jednorázovým odkazem. Vrací úspěšnou hlášku.
 */
export async function requestUserPasswordReset(userId: number): Promise<string> {
    const payload = await apiPost<ApiResult>(`/api/react/users/${userId}/resetPassword`);
    return ensureSuccess(payload).message ?? '';
}

/** POST /api/react/user/createToken – API token pro externí nástroje. */
export async function createApiToken(): Promise<string> {
    const payload = await apiPost<ApiResult<{ token: string }>>('/api/react/user/createToken');
    const token = ensureSuccess(payload).data?.token;
    if (!token) {
        throw new ApiError('Odpověď createToken neobsahuje token.');
    }
    return token;
}

/** GET /api/react/users-minimal – všichni uživatelé (id + celé jméno), např. výběr vlastníka dat. */
export async function getUsersMinimal(): Promise<UserId[]> {
    return requireData(await apiGet('/api/react/users-minimal'), 'Načtení uživatelů selhalo.');
}

/** Editovatelná pole uživatele v tabulce sysAdmina. */
export type UserFlagField = 'mapAdmin' | 'traitAdmin' | 'sysAdmin' | 'biblioAdmin' | 'taxonAdmin' | 'deleted';

/** PUT /api/react/users/{id} – změna pole uživatele (JSON `{<field>: value}`). */
export async function updateUserFlag(userId: number, field: UserFlagField, value: boolean): Promise<void> {
    requireEnvelope(await apiPut(`/api/react/users/${userId}`, {[field]: value}), 'Úprava uživatele selhala.');
}
