/**
 * Stav kontrolovaných filtrů vyhledávacího formuláře (E.1 z refactor.md).
 *
 * Většina polí formuláře je nekontrolovaná (čte se až ze submitu přes
 * FormData); kontrolované jsou typeaheady, Pladias ID a podtaxony.
 */

import {useCallback, useState} from "react";
import type {TypeaheadOption} from "../types";

export function useSearchFilters() {
    const [selectedTaxonName, setSelectedTaxonName] = useState<string>("");
    const [selectedPhytochorion, setSelectedPhytochorion] = useState<TypeaheadOption[]>([]);
    const [selectedSubstrate1, setSelectedSubstrate1] = useState<TypeaheadOption[]>([]);
    const [selectedSubstrate2, setSelectedSubstrate2] = useState<TypeaheadOption[]>([]);
    const [selectedHerbarium, setSelectedHerbarium] = useState<TypeaheadOption[]>([]);
    const [selectedInstitution, setSelectedInstitution] = useState<TypeaheadOption[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<TypeaheadOption[]>([]);
    const [selectedCommitter, setSelectedCommitter] = useState<TypeaheadOption[]>([]);
    const [selectedValidationStatus, setSelectedValidationStatus] = useState<TypeaheadOption[]>([]);
    const [selectedHistoryFlag, setSelectedHistoryFlag] = useState<TypeaheadOption[]>([]);
    const [selectedLicense, setSelectedLicense] = useState<TypeaheadOption[]>([]);
    const [pladiasId, setPladiasId] = useState<string>("");
    const [includeSubtaxa, setIncludeSubtaxa] = useState<boolean>(true);

    /** Nové hledání – všechny výběry do výchozího stavu. */
    const reset = useCallback(() => {
        setSelectedTaxonName("");
        setSelectedPhytochorion([]);
        setSelectedSubstrate1([]);
        setSelectedSubstrate2([]);
        setSelectedHerbarium([]);
        setSelectedInstitution([]);
        setSelectedProjects([]);
        setSelectedCommitter([]);
        setSelectedValidationStatus([]);
        setSelectedHistoryFlag([]);
        setSelectedLicense([]);
        setPladiasId("");
        setIncludeSubtaxa(true);
    }, []);

    return {
        selectedTaxonName,
        setSelectedTaxonName,
        selectedPhytochorion,
        setSelectedPhytochorion,
        selectedSubstrate1,
        setSelectedSubstrate1,
        selectedSubstrate2,
        setSelectedSubstrate2,
        selectedHerbarium,
        setSelectedHerbarium,
        selectedInstitution,
        setSelectedInstitution,
        selectedProjects,
        setSelectedProjects,
        selectedCommitter,
        setSelectedCommitter,
        selectedValidationStatus,
        setSelectedValidationStatus,
        selectedHistoryFlag,
        setSelectedHistoryFlag,
        selectedLicense,
        setSelectedLicense,
        pladiasId,
        setPladiasId,
        includeSubtaxa,
        setIncludeSubtaxa,
        reset,
    };
}

/** Typ vráceného objektu useSearchFilters (pro props podkomponent). */
export type SearchFilters = ReturnType<typeof useSearchFilters>;
