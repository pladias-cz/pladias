/**
 * Číselníky vyhledávacího formuláře – načtení přes
 * service vrstvu a normalizace na TypeaheadOption pro selecty.
 */

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {useCatalogQuery} from '@/query/useCatalogQuery';
import {
    getCommitters,
    getHerbariums,
    getHistoryFlags,
    getInstitutions,
    getLicenses,
    getPhytochorions,
    getProjects,
} from '@/services/searchApi';
import type {TypeaheadOption} from '../types';

export function useSearchOptions() {
    const {t} = useTranslation();

    // číselníky formuláře – při selhání zůstane select prázdný (použitelný);
    // většina se cachuje (viz CACHED_CATALOGS v queryClient.ts), committers
    // a historyFlags zůstávají bez cache
    const projects = useCatalogQuery(['projects'], getProjects);
    const herbariums = useCatalogQuery(['herbariums'], getHerbariums);
    const institutions = useCatalogQuery(['institutions'], getInstitutions);
    const committers = useCatalogQuery(['committers'], getCommitters);
    const licenses = useCatalogQuery(['licenses'], getLicenses);
    const historyFlags = useCatalogQuery(['historyFlags'], getHistoryFlags);
    const phytochorions = useCatalogQuery(['phytochorions'], getPhytochorions);

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
