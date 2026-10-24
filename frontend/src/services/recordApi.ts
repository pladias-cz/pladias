/**
 * Doména záznamů atlasu (controllers.atlas.*: MapDetailController.getRecordFull,
 * RecordCommentController, RecordUpdateController.editField/moveRecordCoords,
 * HerbariumController/CollectorController.getNotAssigned) a volby pro editace
 * (TaxonController.getAllForRecordEdit, PhytochorionController.getAll) včetně
 * reverzního geokódování (ModelDataSourceController.getReverseGeocoding).
 * Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - mutace komentářů i `moveCoordinates` vrací část neúspěchů jako HTTP 200
 *    s obálkou `success: false` (výjimka, neexistující záznam) – řeší
 *    `requireEnvelope`; konflikt souběžných editací přichází jako HTTP 409,
 *  - PATCH `editField` odpovídá dynamickým objektem
 *    `{<field lowercase>: value, lastEditTimestampNum}` – služba vrací hodnotu
 *    rozbalenou v `RecordFieldPatchResult`,
 *  - reverse geocoding vrací pole objektů (`[{success}, {quadrant}, …]`),
 *    které se na jednom místě slučuje do `ReverseGeocodingResponse`,
 *  - 403 (uzamčený záznam, chybějící práva) notifikuje centrálně apiClient
 *    (`ApiError.notified`) – volající uživateli hlášku neduplikuje.
 */

import {apiDelete, apiGet, apiPatch, apiPost, apiPut, requireData, requireEnvelope} from "./apiClient";
import type {MultiValueOption} from "@/models/MultiValueOption";
import type {RecordComment} from "@/models/RecordComment";
import type {RecordPladiasFull} from "@/models/RecordPladiasFull";
import type {ReverseGeocodingResponse} from "@/models/ReverseGeocoding";

/** Výsledek PATCH editField – nová hodnota pole a čas poslední editace (ms). */
export interface RecordFieldPatchResult {
    updatedValue: string | null;
    lastEditTimestampNum: number;
}

/** GET /api/react/atlas/record/{id}/full – záznam se všemi relacemi. */
export async function getRecordFull(recordId: number): Promise<RecordPladiasFull> {
    const record = requireData<RecordPladiasFull>(
        await apiGet(`/api/react/atlas/record/${recordId}/full`),
        "Načtení záznamu selhalo.",
    );
    // lastEditTimestamp (ISO) → lastEditTimestampNum (ms) pro detekci konfliktů
    if (record.lastEditTimestamp) {
        record.lastEditTimestampNum = Date.parse(record.lastEditTimestamp);
    }
    return record;
}

/** GET /api/react/atlas/record/comments/{id} – komentáře záznamu. */
export async function getRecordComments(recordId: number): Promise<RecordComment[]> {
    return requireData<RecordComment[]>(
        await apiGet(`/api/react/atlas/record/comments/${recordId}`),
        "Načtení komentářů selhalo.",
    );
}

/** POST /api/react/atlas/record/comment – nový komentář (JSON {recordId, message}). */
export async function createComment(recordId: number, message: string): Promise<void> {
    requireEnvelope(await apiPost("/api/react/atlas/record/comment", {
        recordId,
        message
    }), "Vytvoření komentáře selhalo.");
}

/** PUT /api/react/atlas/record/comment/{id} – úprava textu komentáře. */
export async function updateComment(commentId: number, message: string): Promise<void> {
    requireEnvelope(await apiPut(`/api/react/atlas/record/comment/${commentId}`, {message}), "Uložení komentáře selhalo.");
}

/** POST /api/react/atlas/record/comment/{id}/resolve – vyřešení komentáře. */
export async function resolveComment(commentId: number): Promise<void> {
    requireEnvelope(await apiPost(`/api/react/atlas/record/comment/${commentId}/resolve`), "Vyřešení komentáře selhalo.");
}

/** DELETE /api/react/atlas/record/comment/{id} – soft delete komentáře. */
export async function deleteComment(commentId: number): Promise<void> {
    requireEnvelope(await apiDelete(`/api/react/atlas/record/comment/${commentId}`), "Smazání komentáře selhalo.");
}

/** DELETE /api/react/atlas/record/comment-assoc/{id}/linked-user/{userId} – označí komentář za přečtený. */
export async function markCommentAsRead(commentId: number, boundUserId: number): Promise<void> {
    requireEnvelope(
        await apiDelete(`/api/react/atlas/record/comment-assoc/${commentId}/linked-user/${boundUserId}`),
        "Označení komentáře za přečtené selhalo.",
    );
}

/**
 * PATCH /api/react/atlas/record/{id} – úprava jednoho pole
 * (RecordUpdateController.editField). Tělo `{key, value, lastEditTimestampNum}`;
 * hodnota se serializuje na serveru na text. Odpověď nese dynamický klíč
 * `<field lowercase>` – vrací se rozbalená hodnota a nový timestamp.
 */
export async function patchRecordField(
    recordId: number,
    key: string,
    value: unknown,
    lastEditTimestampNum: number,
): Promise<RecordFieldPatchResult> {
    const data = requireData<Record<string, unknown>>(
        await apiPatch(`/api/react/atlas/record/${recordId}`, {key, value, lastEditTimestampNum}),
        "Uložení záznamu selhalo.",
    );
    return {
        updatedValue: (data[key.toLowerCase()] as string | null | undefined) ?? null,
        lastEditTimestampNum: typeof data.lastEditTimestampNum === "number" ? data.lastEditTimestampNum : 0,
    };
}

/**
 * Pole záznamu měněná kaskádově po rychlých úpravách v mapě (validace, originalita,
 * zařazení do mapy). Používá je imperativní refresh po mutaci (`useRecordQuickUpdates`),
 * proto zůstává mimo TanStack Query.
 */
export interface RecordMapFields {
    id: number;
    validationStatusId: number;
    originalityStatusId: number;
    herbariumQuality: boolean;
    includedInMap: boolean;
    lastEditTimestampNum: number;
    canEditCommonFields: boolean;
    canEditValidationFields: boolean;
}

/** GET /api/react/atlas/record/{id}/mapFields – aktuální hodnoty rychlých editací záznamu. */
export async function getRecordMapFields(recordId: number): Promise<RecordMapFields> {
    return apiGet(`/api/react/atlas/record/${recordId}/mapFields`);
}

/** POST /api/react/atlas/record/moveCoordinates – přesun záznamu na nové souřadnice. */
export async function moveRecordCoordinates(
    recordId: number,
    latitude: number,
    longitude: number,
    gpsPrecision: number,
    lastEditTimestampNum: number,
): Promise<void> {
    requireEnvelope(
        await apiPost("/api/react/atlas/record/moveCoordinates", {
            recordId,
            latitude,
            longitude,
            gpsPrecision,
            lastEditTimestampNum
        }),
        "Přesun záznamu selhal.",
    );
}

/**
 * GET /api/react/query/reverseGeocoding/lon/{lng}/lat/{lat} – reverzní geokódování
 * kliknutí v mapě. Gotcha: backend vrací pole objektů
 * `[{success}, {quadrant}, {district}, {townHierarchy}, {phytochorions}]`.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResponse> {
    const items = await apiGet<unknown>(`/api/react/query/reverseGeocoding/lon/${lng}/lat/${lat}`);
    const merged: ReverseGeocodingResponse = {};
    if (Array.isArray(items)) {
        for (const item of items) {
            if ((item as { success?: unknown }).success !== undefined) continue; // obálka
            Object.assign(merged, item);
        }
    }
    return merged;
}

/** GET /api/react/atlas/record/{id}/unassignedHerbaria – herbáře nepřiřazené k záznamu. */
export async function getUnassignedHerbaria(recordId: number): Promise<MultiValueOption[]> {
    return fetchOptions(`/api/react/atlas/record/${recordId}/unassignedHerbaria`);
}

/** GET /api/react/atlas/record/{id}/unassignedAuthors – nexováci (autoři) nepřiřazení k záznamu. */
export async function getUnassignedAuthors(recordId: number): Promise<MultiValueOption[]> {
    return fetchOptions(`/api/react/atlas/record/${recordId}/unassignedAuthors`);
}

/** GET /api/react/taxa/importable/record/{id} – taxony přiřaditelné k záznamu. */
export async function getImportableTaxaForRecord(recordId: number): Promise<MultiValueOption[]> {
    return fetchOptions(`/api/react/taxa/importable/record/${recordId}`);
}

/** GET /api/react/selectOptions/phytochorions – fytogeografická území. */
export async function getPhytochorionOptions(): Promise<MultiValueOption[]> {
    return fetchOptions("/api/react/selectOptions/phytochorions");
}

/**
 * Společné načtení voleb editací: endpointy vrací obálku s `data` položkami
 * `{id, name|nameLat, label|nameHtml}` – sjednocují se do `MultiValueOption`.
 */
async function fetchOptions(url: string): Promise<MultiValueOption[]> {
    const data = requireData<{ id: number; name?: string; nameLat?: string; label?: string; nameHtml?: string }[]>(
        await apiGet(url),
        "Načtení možností selhalo.",
    );
    return data.map(item => ({
        id: item.id,
        name: item.name ?? item.nameLat ?? "",
        label: item.label ?? item.nameHtml,
    }));
}
