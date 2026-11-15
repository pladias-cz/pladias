/**
 * Filtrování a řazení řádků tabulek mapového detailu (PLADIAS i externí zdroje).
 *
 * Tabulky mapDetailu dostávají záznamy celého čtverce najednou (`getSquarePladiasRecords`,
 * `getSquareExternalRecords*`), proto filtry i řazení počítáme na klientu – žádný
 * roundtrip na backend. Funkce jsou čisté a bez Reactu (dají se testovat a později
 * vyměnit za serverovou variantu: stejné vstupy = stejné výstupy).
 *
 * Chování sloupců (filtr / řazení) – PLADIAS tab:
 *  1. Kvadrant    – písmeno a–d                 / písmeno abecedně
 *  2. Fytochorion – číslo i část názvu          / číslo fytochorionu (17 < 124 < 4202_01_a)
 *  3. Lokalita    – obec, lokalita, pramen, původní jméno / obec
 *  4. Sběratelé   – libovolná část jména        / příjmení prvního sběratele
 *  5. Datum       – rok i přesné datum          / datum (bez data na konec)
 *  6. Původ       – název projektu              / věrohodnost projektu (klesající)
 *  7. Status      – hodnota statusu             / validní a zařazený do mapy nahoře
 *
 * Externí tab (GBIF/iNaturalist/ČBS) umí Kvadrant, Sběratele, Rok a zdroj (instituce).
 */

import type {RecordPladias} from '@/models';
import type {RecordGbifMinimal} from '@/models/AtlasRecords';

/** Sloupec, podle kterého se filtruje nebo řadí (shodné s id `<th>` tabulky). */
export type RecordTableColumnId =
    | 'quadrantLetter'
    | 'phytochorion'
    | 'locality'
    | 'finders'
    | 'date'
    | 'project'
    | 'validationStatus'
    /** Sloupec Zdroje externí tabulky (instituce záznamu, např. CB76). */
    | 'institution';

/** Řaditelné sloupce PLADIAS tabulky. */
export type PladiasSortKey = Exclude<RecordTableColumnId, 'institution'>;

/** Řaditelné sloupce externí tabulky. */
export type ExternalSortKey = Extract<RecordTableColumnId, 'quadrantLetter' | 'institution' | 'finders' | 'date'>;

/** Filtr jednoho sloupce; prázdný řetězec (po oříznutí) znamená „bez filtru“. */
export interface RecordTableFilter {
    id: RecordTableColumnId;
    value: string;
}

/**
 * Podklad pro porovnání řádku (řadicí klíče + texty, ve kterých filtr hledá).
 * Vzniká jednou nad celou množinou, aby filtr i řazení bylo lineární na řádky.
 */
export interface RecordSearchFields {
    id: number;
    quadrantLetter: string | null;
    phytochorionPhytoId: string | null;
    phytochorionName: string | null;
    /** Texty sloupce Lokalita; první z nich (obec) rozhoduje i řazení. */
    localityTexts: Array<string | null>;
    finders: string | null;
    dateIso: string | null;
    year: number | null;
    projectName: string | null;
    projectCredibility: number | null;
    validationStatusId: number | null;
    includedInMap: boolean | null;
    /** Předpočítaná priorita statusu pro řazení (validationPriority). */
    validationPriority: number;
    /** Třídění externí tabulky dle zdroje (gbif / inaturalist / cbs). */
    source: string | null;
}

/**
 * Řadící funkce nad předpočítanými podklady. Vrací dvojhodnotu
 * `[vzestupné srovnání, prázdnota levého záznamu]`:
 *  - první složka řeší pořadí neprázdných hodnot (směr aplikuje volající),
 *  - druhá složka drží záznamy bez hodnoty vzadu i při obráceném směru
 *    (filtrována před aplikací direction).
 */
type FieldComparator = (a: RecordSearchFields, b: RecordSearchFields) => [number, number];

/** Srovnání řetězců; prázdná hodnota na východí stranu (na konec). */
function compareNullableText(a: string | null, b: string | null): [number, number] {
    const left = a?.trim() || null;
    const right = b?.trim() || null;
    if (left === null || right === null) {
        return [0, left === null ? 1 : 0];
    }
    return [csBaseCollator.compare(left, right), 0];
}

/** Srovnání čísel; null na konec. */
function compareNullableNumber(a: number | null, b: number | null): [number, number] {
    if (a === null || b === null) {
        return [0, a === null ? 1 : 0];
    }
    return [a - b, 0];
}

/** Složení dvou srovnání (druhé rozhoduje při shodě prvního). */
function thenCompare(first: [number, number], second: [number, number]): [number, number] {
    return first[0] !== 0 ? first : second;
}

/**
 * Čeština bez diakritiky a velikosti písmen – use pro řazení i wildcard porovnání
 * (`Intl.Collator` s `sensitivity: 'base'` ignoruje háčky/čárky i velikost).
 */
const csBaseCollator = new Intl.Collator('cs', {sensitivity: 'base'});

/**
 * Číslo fytochorionu z `phyto_id` („4202_01_a“ → 4202). Backend řadí
 * `substring(phyto_id, '^[0-9]+')::int` – držíme se téhož klíče.
 */
export function phytochorionNumericId(phytoId: string | null): number | null {
    if (phytoId === null) {
        return null;
    }
    const numericPart = /^\d+/.exec(phytoId.trim())?.[0];
    return numericPart === undefined ? null : Number.parseInt(numericPart, 10);
}

/**
 * Příjmení prvního sběratele – poslední slovo prvního jména
 * („Karel Domin, J. Věch“ → „Domin“).
 */
export function finderSurname(finders: string | null): string | null {
    const firstAuthor = finders?.split(',')[0]?.trim();
    if (!firstAuthor) {
        return null;
    }
    const words = firstAuthor.split(/\s+/).filter(Boolean);
    return words.length > 0 ? words[words.length - 1] : null;
}

/**
 * Pořadí záznamu dle validačního statusu (stejná pravidla jako stav mapového pole
 * v InfoPanelu): 0 = platný pro mapu (neurčitý/ověřený a zařazený),
 * 1 = vyjmutý z mapy, 2 = nevyřízený nebo zamítnutý.
 */
function validationPriority(validationStatusId: number | null, includedInMap: boolean | null): number {
    if (validationStatusId === 0 || validationStatusId === 2) {
        return 2;
    }
    return includedInMap === false ? 1 : 0;
}

const COMPARATORS: Record<RecordTableColumnId, FieldComparator> = {
    quadrantLetter: (a, b) => compareNullableText(a.quadrantLetter, b.quadrantLetter),
    phytochorion: (a, b) => {
        const byNumber = compareNullableNumber(
            phytochorionNumericId(a.phytochorionPhytoId),
            phytochorionNumericId(b.phytochorionPhytoId),
        );
        // stejné číslo (4202_01_a vs. 4202_01_b) rozhodne suffix kódu
        return thenCompare(byNumber, compareNullableText(a.phytochorionPhytoId, b.phytochorionPhytoId));
    },
    locality: (a, b) => compareNullableText(a.localityTexts[0], b.localityTexts[0]),
    finders: (a, b) => compareNullableText(finderSurname(a.finders), finderSurname(b.finders)),
    date: (a, b) => compareNullableText(dateSortKey(a), dateSortKey(b)),
    project: (a, b) => {
        // věrohodnost klesající (ProjectCredibilityComparator) – komutativní swap
        // operandů, aby direction aplikovatelný nastejno; při shodě název projektu
        const byCredibility = compareNullableNumber(b.projectCredibility, a.projectCredibility);
        return thenCompare(byCredibility, compareNullableText(a.projectName, b.projectName));
    },
    validationStatus: (a, b) => {
        // priorita se počítá z více polí a nikdy není prázdná (null → 2),
        // proto se srovnává přímo bez ohledu na direction (aspoň řádově nejnižší
        // priorita zůstává dole i obráceně); pak id validačního statusu,
        // abys mohl třídit i uvnitř stejné kategorie (0 < 1 < 2 < 3)
        const byPriority = a.validationPriority - b.validationPriority;
        const byStatus = compareNullableNumber(a.validationStatusId, b.validationStatusId);
        return thenCompare([byPriority, 0], thenCompare(byStatus, compareNullableText(a.projectName, b.projectName)));
    },
    // zdroj externího záznamu: instituce, při shodě zdroj (gbif/inaturalist/cbs)
    institution: (a, b) => {
        return thenCompare(
            compareNullableText(a.localityTexts[0], b.localityTexts[0]),
            compareNullableText(a.source, b.source),
        );
    },
};

/** Datum pro řazení: ISO datum, při jeho neznámosti rok, bez data null (na konec). */
function dateSortKey(fields: RecordSearchFields): string | null {
    if (fields.dateIso) {
        return fields.dateIso;
    }
    return fields.year !== null ? String(fields.year) : null;
}

/** Písmeno kvadrantu z kompletního kódu („6152a“ → „a“). */
function quadrantLetterOf(quadrantCode: string | null): string | null {
    return quadrantCode ? quadrantCode.slice(-1) : null;
}

export function pladiasSearchFields(record: RecordPladias): RecordSearchFields {
    return {
        id: record.id,
        quadrantLetter: quadrantLetterOf(record.computedQuadrantCode),
        phytochorionPhytoId: record.phytochorionPhytoId,
        phytochorionName: record.phytochorionName,
        localityTexts: [
            record.nearestTownText ?? record.nearestTownName,
            record.districtName,
            record.locality,
            record.source,
            record.taxonOriginal,
        ],
        finders: record.recordAuthorsNames,
        dateIso: record.dateIso,
        year: record.year,
        projectName: record.projectName,
        projectCredibility: record.projectCredibility ?? null,
        validationStatusId: record.validationStatusId,
        includedInMap: record.includedInMap,
        validationPriority: validationPriority(record.validationStatusId, record.includedInMap),
        source: null,
    };
}

export function externalSearchFields(record: RecordGbifMinimal): RecordSearchFields {
    return {
        id: record.id,
        quadrantLetter: record.quadrantLetter,
        phytochorionPhytoId: null,
        phytochorionName: null,
        localityTexts: [record.institutionCode],
        finders: record.recordedBy,
        dateIso: null,
        year: record.year,
        projectName: null,
        projectCredibility: null,
        validationStatusId: null,
        includedInMap: null,
        validationPriority: 0,
        source: record.project,
    };
}

/**
 * Wildcard shoda bez diakritiky a velikosti písmen. `Intl.Collator` neumí porovnávat
 * částečné řetězce, proto NFD normalizace a zahrození diakritických znamének.
 */
function containsIgnoringDiacritics(text: string, search: string): boolean {
    return stripDiacritics(text).includes(stripDiacritics(search));
}

function stripDiacritics(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Shoda buňky s hodnotou filtru: přesná shoda, nebo wildcard „část textu“. */
function matchesCell(cell: string | null, expected: string): boolean {
    if (cell === null || cell.trim() === '') {
        return false;
    }
    return csBaseCollator.compare(cell, expected) === 0 || containsIgnoringDiacritics(cell, expected);
}

/** Shoda řádku s jedním sloupcovým filtrem. */
function matchesFilter(fields: RecordSearchFields, filter: RecordTableFilter): boolean {
    const value = filter.value.trim();
    switch (filter.id) {
        case 'quadrantLetter':
            return matchesCell(fields.quadrantLetter, value);
        case 'phytochorion':
            return matchesCell(fields.phytochorionPhytoId, value) || matchesCell(fields.phytochorionName, value);
        case 'locality':
            return fields.localityTexts.some(text => matchesCell(text, value));
        case 'finders':
            return matchesCell(fields.finders, value);
        case 'date':
            // filtr na sloupci Datum/Rok: matchne rok (1998) i přesné datum (1998-05, 1998-05-12)
            if (fields.dateIso !== null && containsIgnoringDiacritics(fields.dateIso, value)) {
                return true;
            }
            return fields.year !== null && String(fields.year).includes(value);
        case 'project':
            return matchesCell(fields.projectName, value);
        case 'institution':
            return matchesCell(fields.localityTexts[0], value) || matchesCell(fields.source, value);
        case 'validationStatus':
            return fields.validationStatusId !== null && String(fields.validationStatusId) === value;
        default:
            return true;
    }
}

/** Id řádků vyhovujících všem filtrům; bez aktivního filtru null (bez kopírování pole). */
function matchingIds(
    fields: readonly RecordSearchFields[],
    filters: readonly RecordTableFilter[],
): Set<number> | null {
    const active = filters.filter(filter => filter.value.trim() !== '');
    if (active.length === 0) {
        return null;
    }
    const matched = new Set<number>();
    for (const item of fields) {
        if (active.every(filter => matchesFilter(item, filter))) {
            matched.add(item.id);
        }
    }
    return matched;
}

/**
 * Filtrování a řazení nad předpočítanými podklady. `sortKey` null = pořadí,
 * v jakém záznamy poslal backend; při shodě řadicího klíče rozhoduje id záznamu.
 */
function filterAndSort<T extends { id: number }>(
    records: readonly T[],
    fieldsOf: (record: T) => RecordSearchFields,
    filters: readonly RecordTableFilter[],
    sortKey: string | null,
    sortDescending: boolean,
): T[] {
    const fields = records.map(fieldsOf);
    const matched = matchingIds(fields, filters);
    const visible = matched === null ? [...records] : records.filter(record => matched.has(record.id));
    const comparator = sortKey !== null ? COMPARATORS[sortKey as PladiasSortKey] : undefined;
    if (comparator === undefined) {
        return visible;
    }
    const direction = sortDescending ? -1 : 1;
    return [...visible]
        .map(record => ({record, fields: fieldsOf(record)}))
        .sort((left, right) => {
            const [order, empty] = comparator(left.fields, right.fields);
            // prázdnota rozhoduje před aplikací směru – záznam bez hodnoty zůstává
            // vzadu i při obráceném řazení („bez data“ nepatří na začátek)
            if (empty !== 0) {
                return empty;
            }
            return direction * order || left.fields.id - right.fields.id;
        })
        .map(item => item.record);
}

/** PLADIAS tabulka: filtry sloupců + řazení záznamů jednoho čtverce. */
export function applyRecordTableControls<T extends RecordPladias>(
    records: readonly T[],
    filters: readonly RecordTableFilter[],
    sortKey: PladiasSortKey | null,
    sortDescending: boolean,
): T[] {
    return filterAndSort(records, pladiasSearchFields, filters, sortKey, sortDescending);
}

/** Externí tabulka (GBIF/iNaturalist/ČBS): Kv./Sběratelé/Rok + zdroj (instituce). */
export function applyExternalTableControls<T extends RecordGbifMinimal>(
    records: readonly T[],
    filters: readonly RecordTableFilter[],
    sortKey: ExternalSortKey | null,
    sortDescending: boolean,
): T[] {
    return filterAndSort(records, externalSearchFields, filters, sortKey, sortDescending);
}

/** Počet řádků vyhovujících filtrům (bez řazení) – text „zobrazeno X z Y“. */
export function countMatchingRecords(
    fields: readonly RecordSearchFields[],
    filters: readonly RecordTableFilter[],
): number {
    const matched = matchingIds(fields, filters);
    return matched === null ? fields.length : matched.size;
}

/** Platný řadicí klíč z id hlavičky (neřaditelný sloupec → null). */
export function sortableKeyOf(columnId: string): PladiasSortKey | null {
    return columnId in COMPARATORS ? columnId as PladiasSortKey : null;
}
