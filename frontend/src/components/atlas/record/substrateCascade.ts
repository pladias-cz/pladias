/**
 * Provázání kategorií substrátu (ne-cevnaté záznamy) pro optimistickou kopii záznamu.
 *
 * Opakuje týž pravidla, která vynucuje backend v `RecordsService.updateDaliborSubstrate1`
 * a `updateDaliborSubstrate2`:
 *  - upřesňující kategorie existuje jen spolu s hlavní – její volka přepíše hlavní kategorii
 *    svým rodičem (`atlas_nonvascular.substrate_2.substrate_1_id`),
 *  - vymazání upřesnění hlavní kategorii ponechá – záznam „známe jen hlavní kategorie“ je běžný,
 *  - změna hlavní kategorie tichou kaskádou smaže upřesnění, které do ní nepatří.
 *
 * Bez téhle shody by se po uložení jedné kategorie na chvíli ukázala kombinace, kterou server
 * nikdy nepřijme (nebo naopak), a řádky by si navzájem protiřečily.
 */

import type {MultiValueOption} from '@/models/MultiValueOption';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';
import type {SubstrateOption} from '@/models/SubstrateOption';

/** Pětice polí, která se u kategorií substrátu mění vždy spolu – stejné názvy jako DTO záznamu. */
export interface SubstrateState {
    substrate1Id: number | null;
    substrate1Text: string | null;
    substrate2Id: number | null;
    substrate2Text: string | null;
    substrateCategoryText: string | null;
}

/** Spojení kategorií „hlavní - upřesňující“; týž formát jako `NonVascularRecordExtension.getSubstrateCategoryText()`. */
const CATEGORY_SEPARATOR = ' - ';

function blankToNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function categoryText(substrate1Text: string | null, substrate2Text: string | null): string | null {
    if (!substrate1Text) {
        return null;
    }
    return substrate2Text ? `${substrate1Text}${CATEGORY_SEPARATOR}${substrate2Text}` : substrate1Text;
}

/** Výchozí stav z načteného záznamu (prázdné řetězce z backendu se berou jako nevymezená hodnota). */
export function substrateStateFrom(record: RecordPladiasFull): SubstrateState {
    return {
        substrate1Id: record.substrate1Id ?? null,
        substrate1Text: blankToNull(record.substrate1Text),
        substrate2Id: record.substrate2Id ?? null,
        substrate2Text: blankToNull(record.substrate2Text),
        substrateCategoryText: blankToNull(record.substrateCategoryText),
    };
}

/**
 * Změna hlavní kategorie. Upřesnění přežije jen volbu téže hlavní kategorie – dokud je
 * upřesnění vyplněné, je jeho rodičem právě aktuální `substrate1Id` (invariant, který drží
 * backend), takže jakákoliv jiná volba ho na serveru smaže.
 */
export function withSubstrate1(state: SubstrateState, next: MultiValueOption | null): SubstrateState {
    const substrate1Id = next?.id ?? null;
    const keepsSubstrate2 = substrate1Id !== null && substrate1Id === state.substrate1Id;
    const substrate1Text = next?.name ?? null;
    const substrate2Id = keepsSubstrate2 ? state.substrate2Id : null;
    const substrate2Text = keepsSubstrate2 ? state.substrate2Text : null;

    return {
        substrate1Id,
        substrate1Text,
        substrate2Id,
        substrate2Text,
        substrateCategoryText: categoryText(substrate1Text, substrate2Text),
    };
}

/**
 * Změna upřesňující kategorie: hlavní kategorii backend vždy odvodí od rodiče zvolené volby.
 * `null` (volba „bez upřesnění“) hlavní kategorii nechává na místě.
 */
export function withSubstrate2(state: SubstrateState, next: SubstrateOption | null): SubstrateState {
    if (next === null) {
        return {
            ...state,
            substrate2Id: null,
            substrate2Text: null,
            substrateCategoryText: categoryText(state.substrate1Text, null),
        };
    }

    return {
        substrate1Id: next.substrate1Id,
        substrate1Text: next.substrate1Text,
        substrate2Id: next.id,
        substrate2Text: next.name,
        substrateCategoryText: categoryText(next.substrate1Text, next.name),
    };
}