/**
 * Taxon doména (controllers.taxon.*: TaxonController, TaxonManagerController,
 * TaxonRankController, SynonymController).
 * Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - mutace správce taxonů (patch, move, moveBeforeSibling, delete) vrací
 *    chyby často jako HTTP 200 s obálkou `success: false` – ošetřeno přes
 *    `ensureSuccess`,
 *  - „taxon editor locked" vrací redirect na „/" – fetch ho sleduje a skončí
 *    na HTML těle místo obálky; `requireEnvelope` takovou odpověď odmítne
 *    a použije fallback hlášku,
 *  - SynonymController.add vrací chyby jako plain text (HTTP 400) – zprávu
 *    z těla vytáhne apiClient,
 *  - POST/PUT synonym vrací jen `{success, message}` bez `data` – nové id
 *    frontend nezíská, seznam se načítá znovu po uložení.
 */

import {ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut, ensureSuccess} from "./apiClient";
import type {ApiResult} from "@/models/ApiResponse";
import type {Taxon} from "@/models/Taxon";
import type {TaxonId} from "@/models/TaxonId";
import type {TaxonPublication} from "@/models/TaxonPublication";
import type {TaxonRankId} from "@/models/TaxonRankId";
import type {TaxonStats} from "@/models/TaxonStats";
import type {TaxonSynonym} from "@/models/TaxonSynonym";

/** Konstanty polí spravovaných přes PATCH (TaxonManagerController.patch). */
export type TaxonEditorField =
    | "LATNAME"
    | "NAMEHTML"
    | "CZNAME"
    | "RANK"
    | "AUTHOR"
    | "HYBRIDPARENTAGE"
    | "SUPPRESSED"
    | "COMMENT";

/**
 * Ověří obálku `JsonResult`. Ne-obálkové tělo (string) vzniká u mutací
 * správce taxonů gotchasem „editor locked": backend vrací redirect na „/",
 * fetch ho sleduje a skončí na HTML stránce – ta uživateli nemá co říct,
 * použije se fallback hláška.
 */
function requireEnvelope(payload: unknown, fallbackMessage: string): ApiResult {
    if (typeof payload !== "object" || payload === null) {
        throw new ApiError(fallbackMessage);
    }
    return ensureSuccess(payload as ApiResult, fallbackMessage);
}

/** Obálka + povinná položka `data` (GET endpointy a mutace vracející objekt). */
function requireData<T>(payload: unknown, fallbackMessage: string): T {
    const envelope = requireEnvelope(payload, fallbackMessage) as ApiResult<T>;
    if (envelope.data === undefined) {
        throw new ApiError(fallbackMessage);
    }
    return envelope.data;
}

/** GET /api/react/taxon/{id} – celý taxon. */
export async function getTaxon(id: number): Promise<Taxon> {
    return requireData<Taxon>(await apiGet(`/api/react/taxon/${id}`), "Načtení taxonu selhalo.");
}

/** GET /api/react/taxon/{id}/parents – rodiče od kořene po přímého rodiče. */
export async function getTaxonParents(id: number): Promise<TaxonId[]> {
    return requireData<TaxonId[]>(await apiGet(`/api/react/taxon/${id}/parents`), "Načtení rodičů taxonu selhalo.");
}

/** GET /api/react/taxon/{id}/firstChildren – přímí potomci (řazení sourozenců). */
export async function getTaxonFirstChildren(id: number): Promise<Taxon[]> {
    return requireData<Taxon[]>(await apiGet(`/api/react/taxon/${id}/firstChildren`), "Načtení potomků taxonu selhalo.");
}

/** GET /api/react/taxonrank/queryAll – všechny taxonomické ranky. */
export async function getTaxonRanks(): Promise<TaxonRankId[]> {
    return requireData<TaxonRankId[]>(await apiGet("/api/react/taxonrank/queryAll"), "Načtení taxonomických ranků selhalo.");
}

/** GET /api/react/taxon/{id}/stats – statistiky záznamů taxonu. */
export async function getTaxonStatistics(id: number): Promise<TaxonStats> {
    return requireData<TaxonStats>(await apiGet(`/api/react/taxon/${id}/stats`), "Načtení statistik taxonu selhalo.");
}

/** GET /api/react/taxon/{id}/traitCount – počet trait hodnot taxonu. */
export async function getTaxonTraitCount(id: number): Promise<number> {
    return requireData<number>(await apiGet(`/api/react/taxon/${id}/traitCount`), "Načtení počtu trait hodnot selhalo.");
}

/** GET /api/react/taxon/{id}/synonyms – synonyma taxonu. */
export async function getTaxonSynonyms(id: number): Promise<TaxonSynonym[]> {
    return requireData<TaxonSynonym[]>(await apiGet(`/api/react/taxon/${id}/synonyms`), "Načtení synonym selhalo.");
}

/** GET /api/react/taxaPublications – publikace pro výběr u synonym. */
export async function getTaxonPublications(): Promise<TaxonPublication[]> {
    return requireData<TaxonPublication[]>(await apiGet("/api/react/taxaPublications"), "Načtení publikací selhalo.");
}

/**
 * PATCH /api/react/taxon/{id} – změna jednoho pole. Vrací celý aktualizovaný
 * taxon (ne jen hodnotu pole – komponenta si z něj vezme, co potřebuje).
 */
export async function updateTaxonField(id: number, field: TaxonEditorField, value: string | boolean): Promise<Taxon> {
    return requireData<Taxon>(
        await apiPatch(`/api/react/taxon/${id}`, {field, value}),
        "Uložení pole taxonu selhalo.",
    );
}

/** POST /api/react/taxon – nový potomek pod vybraný taxon; vrací vytvořený taxon. */
export async function createTaxon(input: {nameLat: string; rankId: number; parentId: number}): Promise<Taxon> {
    return requireData<Taxon>(
        await apiPost("/api/react/taxon", input),
        "Vytvoření taxonu selhalo.",
    );
}

/** POST /api/react/taxon/{id}/move – přesun pod nového rodiče; vrací přesunutý taxon. */
export async function moveTaxon(id: number, parentId: number): Promise<Taxon> {
    return requireData<Taxon>(
        await apiPost(`/api/react/taxon/${id}/move`, {parentId}),
        "Přesun taxonu selhalo.",
    );
}

/** POST /api/react/taxon/moveBeforeSibling – změna pořadí sourozenců. */
export async function moveTaxonBeforeSibling(taxonId: number, siblingId: number): Promise<void> {
    requireEnvelope(
        await apiPost("/api/react/taxon/moveBeforeSibling", {taxonId, siblingId}),
        "Změna pořadí potomků selhala.",
    );
}

/** DELETE /api/react/taxon/{id} – smazání taxonu bez potomků. */
export async function deleteTaxon(id: number): Promise<void> {
    requireEnvelope(await apiDelete(`/api/react/taxon/${id}`), "Smazání taxonu selhalo.");
}

/**
 * POST (nové synonymo, záporné id) / PUT (změna) /api/react/synonyms/… –
 * uložení synonyma. Odpověď nese jen `message`, ne `data` – nové id zůstane
 * na frontendu dočasné (záporné) do reloadu seznamu.
 */
export async function saveTaxonSynonym(synonym: TaxonSynonym): Promise<void> {
    const errorMessage = "Uložení synonyma selhalo.";
    const payload = synonym.id < 0
        ? await apiPost(`/api/react/synonyms/${synonym.taxonId}`, synonym)
        : await apiPut(`/api/react/synonyms/${synonym.id}`, synonym);
    requireEnvelope(payload, errorMessage);
}

/** DELETE /api/react/synonyms/{id} – smazání synonyma. */
export async function deleteTaxonSynonym(id: number): Promise<void> {
    requireEnvelope(await apiDelete(`/api/react/synonyms/${id}`), "Smazání synonyma selhalo.");
}
