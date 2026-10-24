/**
 * Doména PlayMessage (controllers.common.PlayMessageController) – texty stránek
 * editované v DB (klíč × jazyk). Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - nenalezený klíč vrací HTTP 404 s obálkou – služba ho překládá na `null`
 *    (volající použije fallback text),
 *  - `data` odpovědi může být `null` (záznam bez hodnoty).
 */

import {ApiError, apiGet, apiPut, requireData, requireEnvelope} from './apiClient';

/** Položka PlayMessage (texty stránek editované v DB). */
export interface PlayMessageEntry {
    id: number | null;
    key: string;
    language: string;
    value: string | null;
}

/**
 * GET /api/react/playmessage/{key}?lang= – text pro klíč a jazyk;
 * `null` = klíč nenalezen (volající použije fallback).
 */
export async function getPlayMessage(key: string, lang: string): Promise<string | null> {
    try {
        const data = requireData<PlayMessageEntry | null>(
            await apiGet(`/api/react/playmessage/${encodeURIComponent(key)}`, {params: {lang}}),
            'Načtení textu selhalo.',
        );
        return data?.value ?? null;
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            return null;
        }
        throw err;
    }
}

/** GET /api/react/playmessage/admin/all?lang= – všechny konstanty pro jeden jazyk (sysAdmin editor). */
export async function getPlayMessagesForLanguage(lang: string): Promise<PlayMessageEntry[]> {
    return requireData<PlayMessageEntry[]>(
        await apiGet('/api/react/playmessage/admin/all', {params: {lang}}),
        'Načtení textů selhalo.',
    );
}

/** PUT /api/react/playmessage/admin/save – hromadné uložení hodnot pro jeden jazyk. */
export async function savePlayMessages(lang: string, values: Array<{ key: string; value: string }>): Promise<void> {
    requireEnvelope(
        await apiPut('/api/react/playmessage/admin/save', {lang, values}),
        'Uložení textů selhalo.',
    );
}
