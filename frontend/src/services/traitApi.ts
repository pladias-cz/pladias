/**
 * Measurement doména (controllers.measurement.*: MeasurementController,
 * TraitExportController). Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - GET číselníky i detail vlastnosti vrací standardní obálku s `data`,
 *  - mutace odpovídají nestandardně: `importResult`/`delete` posílají úspěch
 *    jako čistý JSON string s hlášením (na drátě `"text"`), neúspěch jako
 *    obálku `JsonResult.error` přes HTTP status,
 *  - `setDefault` vrací neúspěch jako HTTP 200 s `success: false`,
 *  - `backupResult` odpovídá plain text hlášením (úspěch i neúspěch),
 *  - complex export posílá urlencoded formulář POSTem; místo souboru může
 *    přijít JSON chyba – neplatné taxony nese `ApiError.payload.invalidTaxa`.
 */

import {
    apiDelete,
    apiDownload,
    apiGet,
    apiPost,
    apiPostFormUrlencoded,
    apiPut,
    requireData,
    requireEnvelope
} from './apiClient';
import type {DownloadedFile} from './apiClient';
import type {EnumerateValue} from '@/models/EnumerateValue';
import type {Feature} from '@/models/Feature';
import type {FeatureGroup} from '@/models/FeatureGroup';
import type {Trait} from '@/models/Trait';
import type {TraitAggregationType} from '@/models/TraitAggregationType';
import type {TraitBackup} from '@/models/TraitBackup';
import type {TraitDatatype} from '@/models/TraitDatatype';
import type {TraitEntryType} from '@/models/TraitEntryType';
import type {TraitVisibilityStatus} from '@/models/TraitVisibilityStatus';

/** GET /api/react/measurement/datatypes – číselník datových typů vlastností. */
export async function getTraitDatatypes(): Promise<TraitDatatype[]> {
    return requireData<TraitDatatype[]>(await apiGet('/api/react/measurement/datatypes'), 'Načtení datových typů selhalo.');
}

/** GET /api/react/measurement/aggregation-types – číselník typů agregace hodnot. */
export async function getTraitAggregationTypes(): Promise<TraitAggregationType[]> {
    return requireData<TraitAggregationType[]>(await apiGet('/api/react/measurement/aggregation-types'), 'Načtení typů agregace selhalo.');
}

/** GET /api/react/measurement/feature-groups – skupiny vlastností. */
export async function getFeatureGroups(): Promise<FeatureGroup[]> {
    return requireData<FeatureGroup[]>(await apiGet('/api/react/measurement/feature-groups'), 'Načtení skupin vlastností selhalo.');
}

/** GET /api/react/measurement/features-by-group/{id} – vlastnosti jedné skupiny. */
export async function getFeaturesOfGroup(groupId: number): Promise<Feature[]> {
    return requireData<Feature[]>(await apiGet(`/api/react/measurement/features-by-group/${groupId}`), 'Načtení vlastností skupiny selhalo.');
}

/** GET /api/react/measurement/features/{id} – detail vlastnosti. */
export async function getFeature(id: number): Promise<Feature> {
    return requireData<Feature>(await apiGet(`/api/react/measurement/features/${id}`), 'Načtení vlastnosti selhalo.');
}

/** GET /api/react/measurement/enumerate-values/{id} – přípustné hodnoty výčtového typu. */
export async function getEnumerateValues(enumerateId: number): Promise<EnumerateValue[]> {
    return requireData<EnumerateValue[]>(await apiGet(`/api/react/measurement/enumerate-values/${enumerateId}`), 'Načtení přípustných hodnot selhalo.');
}

/** GET /api/react/measurement/visibility-status – režimy zpřístupnění dat. */
export async function getTraitVisibilityStatuses(): Promise<TraitVisibilityStatus[]> {
    return requireData<TraitVisibilityStatus[]>(await apiGet('/api/react/measurement/visibility-status'), 'Načtení režimů zpřístupnění selhalo.');
}

/** GET /api/react/measurement/traits-of-feature/{id} – datové řady vlastnosti. */
export async function getTraitsOfFeature(featureId: number): Promise<Trait[]> {
    return requireData<Trait[]>(await apiGet(`/api/react/measurement/traits-of-feature/${featureId}`), 'Načtení datových řad selhalo.');
}

/** GET /api/react/measurement/trait-entry-type – typy hodnot pro komplexní export. */
export async function getTraitEntryTypes(): Promise<TraitEntryType[]> {
    return requireData<TraitEntryType[]>(await apiGet('/api/react/measurement/trait-entry-type'), 'Načtení typů hodnot selhalo.');
}

/** GET /api/react/measurement/backups – snapshoty komplexního exportu. */
export async function getTraitBackups(): Promise<TraitBackup[]> {
    return requireData<TraitBackup[]>(await apiGet('/api/react/measurement/backups'), 'Načtení záloh selhalo.');
}

/**
 * POST /api/react/measurement/backup – naplánuje snapshot exportu; formulář
 * urlencoded (`description`). Backend odpovídá plain text hlášením – úspěch
 * i neúspěch (HTTP 400/500) končí v apiClientu jako text/ApiError.
 */
export async function backupTraits(description: string): Promise<string> {
    const message = await apiPostFormUrlencoded<unknown>('/api/react/measurement/backup', {description});
    return typeof message === 'string' ? message.trim() : '';
}

/**
 * POST /api/react/measurement/trait – import/validace dávky hodnot (multipart
 * formulář: soubor, vlastník, zdroj, popisy, dostupnost, operace). Úspěch
 * vrací hlášení jako JSON string (může nést HTML s odkazem na chybový sešit).
 */
export async function importTrait(formData: FormData): Promise<string> {
    return extractTraitMessage(await apiPost('/api/react/measurement/trait', formData));
}

/** DELETE /api/react/measurement/trait/{id} – smazání datové řady; vrací hlášení. */
export async function deleteTrait(traitId: number): Promise<string> {
    return extractTraitMessage(await apiDelete(`/api/react/measurement/trait/${traitId}`));
}

/**
 * PUT /api/react/measurement/trait/{id}/default – nastavení výchozí datové
 * řady. Gotcha: neúspěch přichází jako HTTP 200 s obálkou `success: false`.
 */
export async function setDefaultTrait(traitId: number): Promise<void> {
    requireEnvelope(await apiPut(`/api/react/measurement/trait/${traitId}/default`), 'Nastavení výchozí datové řady selhalo.');
}

/**
 * POST /api/react/measurement/complexExport – komplexní export vlastností
 * (urlencoded formulář: traitIds[], ranks[], entryTypes[], taxonList, …).
 * Místo souboru může přijít JSON chyba – neplatné taxony nese
 * `ApiError.payload.invalidTaxa` (seznam na řádcích pro opravu).
 */
export async function exportTraits(params: URLSearchParams): Promise<DownloadedFile> {
    return apiDownload('/api/react/measurement/complexExport', {
        method: 'POST',
        body: params,
        fallbackFilename: 'complexExport.csv',
    });
}

/**
 * GET /api/react/measurement/trait/download/{id}/lang/{lang} – export hodnot
 * datové řady (náročné na serveru, proto spinner ve UI). Chyba přichází jako
 * JSON obálka přes HTTP status; dříve plain text s HTTP 200 (viz gotchas).
 */
export async function downloadTraitData(traitId: number, language: string = 'cs'): Promise<DownloadedFile> {
    return apiDownload(`/api/react/measurement/trait/download/${traitId}/lang/${language}`, {
        fallbackFilename: `trait-${traitId}.xlsx`,
        errorMessage: 'Export dat se nezdařil.',
    });
}

/** GET /api/react/measurement/trait/downloadAttachment/{id} – příloha datové řady. */
export async function downloadTraitAttachment(traitId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/measurement/trait/downloadAttachment/${traitId}`, {
        fallbackFilename: `trait-${traitId}-priloha`,
        errorMessage: 'Stažení přílohy se nezdařilo.',
    });
}

/** GET /api/react/measurement/trait/export/{id} – detailní export datové řady. */
export async function exportTraitDetails(traitId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/measurement/trait/export/${traitId}`, {
        fallbackFilename: `trait-${traitId}-export.xlsx`,
        errorMessage: 'Detailní export se nezdařil.',
    });
}

/** GET /api/react/measurement/backup/{id} – snapshot komplexního exportu (záloha). */
export async function downloadTraitBackup(backupId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/measurement/backup/${backupId}`, {
        fallbackFilename: `backup-${backupId}.csv`,
        errorMessage: 'Stažení zálohy se nezdařilo.',
    });
}

/**
 * Mutace traitů odpovídají úspěch čistým JSON stringem s hlášením; neúspěch
 * přichází přes HTTP status s obálkou (to řeší apiClient). Neobvyklé tělo
 * (prázdná odpověď, poškozený JSON) nahradí prázdným řetězcem.
 */
function extractTraitMessage(payload: unknown): string {
    return typeof payload === 'string' ? payload.trim() : '';
}
