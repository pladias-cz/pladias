/**
 * Číselníky vyhledávacího formuláře (E.1 z refactor.md) – načtení přes
 * service vrstvu a normalizace na TypeaheadOption pro selecty.
 */

import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    getCommitters,
    getHerbariums,
    getHistoryFlags,
    getInstitutions,
    getLicenses,
    getPhytochorions,
    getProjects,
    type CommitterOption,
    type HerbariumOption,
    type HistoryFlagOption,
    type InstitutionOption,
    type LicenseOption,
    type PhytochorionOption,
    type ProjectOption,
} from "@/services/searchApi";
import type {TypeaheadOption} from "../types";

export function useSearchOptions() {
    const {t} = useTranslation();

    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [herbariums, setHerbariums] = useState<HerbariumOption[]>([]);
    const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
    const [committers, setCommitters] = useState<CommitterOption[]>([]);
    const [licenses, setLicenses] = useState<LicenseOption[]>([]);
    const [historyFlags, setHistoryFlags] = useState<HistoryFlagOption[]>([]);
    const [phytochorions, setPhytochorions] = useState<PhytochorionOption[]>([]);

    useEffect(() => {
        let isMounted = true;

        // číselníky formuláře – při selhání zůstane select prázdný (použitelný)
        const load = async <T,>(loader: () => Promise<T[]>, setter: (options: T[]) => void) => {
            try {
                const options = await loader();
                if (isMounted) {
                    setter(options);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        void load(getProjects, setProjects);
        void load(getHerbariums, setHerbariums);
        void load(getInstitutions, setInstitutions);
        void load(getCommitters, setCommitters);
        void load(getLicenses, setLicenses);
        void load(getHistoryFlags, setHistoryFlags);
        void load(getPhytochorions, setPhytochorions);

        return () => {
            isMounted = false;
        };
    }, []);

    const phytochorionOptions = useMemo<TypeaheadOption[]>(() => (
        phytochorions.map((phytochorion) => ({id: phytochorion.rowid, label: phytochorion.name}))
    ), [phytochorions]);

    const herbariumOptions = useMemo<TypeaheadOption[]>(() => (
        herbariums.map((herbarium) => ({
            id: herbarium.id,
            label: herbarium.translationKey ? t(herbarium.translationKey as never) : herbarium.name,
        }))
    ), [herbariums, t]);

    const institutionOptions = useMemo<TypeaheadOption[]>(() => (
        institutions.map((institution) => ({id: institution.id, label: institution.name}))
    ), [institutions]);

    const projectOptions = useMemo<TypeaheadOption[]>(() => (
        projects.map((project) => ({id: project.id, label: project.name}))
    ), [projects]);

    const committerOptions = useMemo<TypeaheadOption[]>(() => (
        committers.map((committer) => ({id: committer.id, label: committer.name}))
    ), [committers]);

    const historyFlagOptions = useMemo<TypeaheadOption[]>(() => (
        historyFlags.map((flag) => ({id: flag.value, label: flag.value}))
    ), [historyFlags]);

    const licenseOptions = useMemo<TypeaheadOption[]>(() => (
        licenses.map((license) => ({id: license.id, label: license.key}))
    ), [licenses]);

    return {
        phytochorionOptions,
        herbariumOptions,
        institutionOptions,
        projectOptions,
        committerOptions,
        historyFlagOptions,
        licenseOptions,
    };
}

/** Typ vráceného objektu useSearchOptions (pro props podkomponent). */
export type SearchOptions = ReturnType<typeof useSearchOptions>;
