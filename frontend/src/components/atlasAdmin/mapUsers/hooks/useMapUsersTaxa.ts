/**
 * Hook for MapUsers taxon operations
 */

import {useCallback, useState, useEffect, useRef} from 'react';
import {searchTaxaByPrefix} from '@/services/taxonApi';
import {assignUserTaxon} from '@/services/mapAdminApi';
import {apiErrorMessage} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';
import type {TFunction} from 'i18next';
import type {SupervisedTaxon} from '../types';

export interface UseMapUsersTaxaReturn {
    taxa: SupervisedTaxon[];
    taxaLoading: boolean;
    taxonSearchTerm: string;
    submitting: boolean;
    selectedTaxon: SupervisedTaxon | null;
    selectedTaxonUserId: number | null;
    showAddTaxonModal: boolean;
    taxonInputRef: React.RefObject<HTMLInputElement | null>;
    setTaxonSearchTerm: (term: string) => void;
    handleOpenAddTaxonModal: (userId: number) => void;
    handleCloseTaxonModal: () => void;
    handleSelectTaxon: (taxon: SupervisedTaxon) => Promise<void>;
}

export function useMapUsersTaxa(
    showFlash: (type: 'success' | 'danger', message: string) => void,
    t: TFunction,
    onTaxonChange?: () => void
): UseMapUsersTaxaReturn {
    const [taxa, setTaxa] = useState<SupervisedTaxon[]>([]);
    const [taxaLoading, setTaxaLoading] = useState(false);
    const [taxonSearchTerm, setTaxonSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedTaxon, setSelectedTaxon] = useState<SupervisedTaxon | null>(null);
    const [selectedTaxonUserId, setSelectedTaxonUserId] = useState<number | null>(null);
    const [showAddTaxonModal, setShowAddTaxonModal] = useState(false);
    const taxonInputRef = useRef<HTMLInputElement>(null);

    const fetchTaxa = useCallback(async (searchTerm: string) => {
        setTaxaLoading(true);
        try {
            setTaxa(await searchTaxaByPrefix(searchTerm));
        } catch (err) {
            notifyApiError(err, t('common.autocomplete.searchFailed'));
        } finally {
            setTaxaLoading(false);
        }
    }, [t]);

    // Debounced taxon search
    useEffect(() => {
        if (showAddTaxonModal && taxonSearchTerm.trim()) {
            const timer = setTimeout(() => {
                fetchTaxa(taxonSearchTerm.trim());
            }, 300);
            return () => clearTimeout(timer);
        } else if (showAddTaxonModal) {
            setTaxa([]);
        }
    }, [taxonSearchTerm, showAddTaxonModal, fetchTaxa]);

    // Focus input when modal opens
    useEffect(() => {
        if (showAddTaxonModal && taxonInputRef.current) {
            taxonInputRef.current.focus();
        }
    }, [showAddTaxonModal]);

    const handleOpenAddTaxonModal = useCallback((userId: number) => {
        setSelectedTaxonUserId(userId);
        setTaxonSearchTerm('');
        setTaxa([]);
        setSubmitting(false);
        setSelectedTaxon(null);
        setShowAddTaxonModal(true);
    }, []);

    const handleCloseTaxonModal = useCallback(() => {
        setShowAddTaxonModal(false);
        setSelectedTaxonUserId(null);
        setTaxonSearchTerm('');
        setTaxa([]);
        setSubmitting(false);
        setSelectedTaxon(null);
    }, []);

    const handleSelectTaxon = useCallback(async (taxon: SupervisedTaxon) => {
        if (!selectedTaxonUserId || submitting) return;

        setSubmitting(true);
        setTaxa([]);
        setSelectedTaxon(taxon);

        try {
            await assignUserTaxon(selectedTaxonUserId, taxon.id);

            showFlash('success', t('user.usersAdministration.taxonAdded'));
            onTaxonChange?.();
            setTimeout(() => handleCloseTaxonModal(), 1000);
        } catch (err) {
            showFlash('danger', apiErrorMessage(err, t('user.usersAdministration.error')));
            setSubmitting(false);
            setSelectedTaxon(null);
        }
    }, [selectedTaxonUserId, submitting, showFlash, t, handleCloseTaxonModal, onTaxonChange]);

    return {
        taxa,
        taxaLoading,
        taxonSearchTerm,
        submitting,
        selectedTaxon,
        selectedTaxonUserId,
        showAddTaxonModal,
        taxonInputRef,
        setTaxonSearchTerm,
        handleOpenAddTaxonModal,
        handleCloseTaxonModal,
        handleSelectTaxon,
    };
}
