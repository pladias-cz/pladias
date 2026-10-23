/**
 * Viditelnost skupin záznamů (PLADIAS/GBIF/iNaturalist) na mapě detailu.
 *
 * Stav drží MapDetail a předává se do InfoPanelu (checkboxy v hlavičkách
 * tabů) a do MapComponentu (filtr markerů). Výběr se perzistuje do user
 * settings jako JSON seznam viditelných zdrojů – stejný vzor jako viditelnost
 * vrstev v useLayerManager. Ukládá se optimisticky; chybu ukládání hlásí
 * useUserSettings centrální danger notifikací.
 */

import {useCallback, useEffect, useRef, useState} from "react";
import {useUserSettings} from "@/hooks/useUserSettings";
import {getUserSetting} from "@/services/settingsApi";
import type {ProjectType} from "@/models/AtlasRecords";
import {
    ALL_SOURCES_VISIBLE,
    parseSavedVisibility,
    visibleSourceIds,
    type RecordSourceVisibility,
} from "../recordSources";

/** Backend klíč pro uložený výběr (snake_case konvence user settings). */
const RECORD_SOURCE_VISIBILITY_KEY = "atlas_recordsourcevisibility_mapdetail";

export function useRecordSourceVisibility() {
    const [visibleProjects, setVisibleProjects] = useState<RecordSourceVisibility>(ALL_SOURCES_VISIBLE);
    const {saveSetting} = useUserSettings();
    const initialized = useRef(false);

    // Načtení uloženého výběru jednou při mountu; neexistující/nevalidní
    // hodnota → zůstává výchozí stav (vše viditelné).
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        getUserSetting(RECORD_SOURCE_VISIBILITY_KEY)
            .then(saved => {
                const parsed = parseSavedVisibility(saved);
                if (parsed) {
                    setVisibleProjects(parsed);
                }
            })
            .catch(() => {/* chyba načtení → zůstává výchozí stav */});
    }, []);

    const toggleProjectVisibility = useCallback((project: ProjectType) => {
        const next = {...visibleProjects, [project]: !visibleProjects[project]};
        setVisibleProjects(next);
        // optimistické uložení – stav se v UI mění okamžitě
        void saveSetting(RECORD_SOURCE_VISIBILITY_KEY, JSON.stringify(visibleSourceIds(next)));
    }, [visibleProjects, saveSetting]);

    return {visibleProjects, toggleProjectVisibility};
}
