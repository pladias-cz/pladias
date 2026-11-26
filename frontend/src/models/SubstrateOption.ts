/**
 * Volby kategorií substrátu (ne-cevnaté záznamy).
 *
 * Upřesňující kategorie (`Substrate2`) je na hlavní (`Substrate1`) vazebně navázaná –
 * `atlas_nonvascular.substrate_2.substrate_1_id` – a backend z ní hlavní kategorii vždy odvodí.
 * Frontend proto potřebuje u každé volby i její rodiče: podle něj se filtruje nabídka a
 * promítá se do optimistické kopie záznamu (`substrateCascade`).
 */

import type {MultiValueOption} from './MultiValueOption';

/** Volba upřesňující kategorie substrátu; odpovídá `dto.selectItems.SubstrateOptionDto`. */
export interface SubstrateOption extends MultiValueOption {
    substrate1Id: number;
    substrate1Text: string;
}

/**
 * Volby z `/selectOptions/substrates` přichází jako obecné `MultiValueOption`; rodičovskou
 * kategorii na nich poznáme podle přítomných údajů.
 */
export function isSubstrateOption(option: MultiValueOption): option is SubstrateOption {
    const candidate = option as Partial<SubstrateOption>;
    return typeof candidate.substrate1Id === 'number' && typeof candidate.substrate1Text === 'string';
}

/**
 * Nabídka upřesnění příslušející hlavní kategorii. Bez hlavní kategorie je nabídka prázdná –
 * upřesnění bez ní v datech neexistuje (`NonVascularRecordWrapperBuilder.resolveSubstrate2`).
 */
export function substrateOptionsFor(options: MultiValueOption[], substrate1Id: number | null): SubstrateOption[] {
    if (substrate1Id === null) {
        return [];
    }
    return options.filter(isSubstrateOption).filter(option => option.substrate1Id === substrate1Id);
}