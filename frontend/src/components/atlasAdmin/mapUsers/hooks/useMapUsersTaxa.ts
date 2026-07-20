/**
 * Hook for MapUsers taxon operations
 */

import {useCallback, useState, useEffect, useRef} from 'react';
import axios from 'axios';
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
    t: (key: string) => string,
    onTaxonChange?: () => void
): UseMapUsersTaxaReturn {
    const [taxa, setTaxa] = useState<SupervisedTaxon[]>([]);
    const [taxaLoading, setTaxaLoading] = useState(false);
    const [taxonSearchTerm, setTaxonSearchTerm] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [selectedTaxon, setSelectedTaxon] = useState<SupervisedTaxon | null>(null);
    const [selectedTaxonUserId, setSelectedTaxonUserId] = useState<number | null>(null);
    const [showAddTaxonModal, setShowAddTaxonModal] = useState(false);
    const taxonInputRef = useRef<HTMLInputElement>(null);

    const fetchTaxa = useCallback(async (searchTerm: string) => {
        setTaxaLoading(true);
        try {
            const response = await axios.get("/api/react/taxa/queryAll", {
                params: { prefix: searchTerm }
            });
            if (response.data?.success) {
                setTaxa(response.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching taxa:", err);
        } finally {
            setTaxaLoading(false);
        }
    }, []);

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
        setTaxonSearchTerm("");
        setTaxa([]);
        setSubmitting(false);
        setSelectedTaxon(null);
        setShowAddTaxonModal(true);
    }, []);

    const handleCloseTaxonModal = useCallback(() => {
        setShowAddTaxonModal(false);
        setSelectedTaxonUserId(null);
        setTaxonSearchTerm("");
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
            const formData = new URLSearchParams();
            formData.append("user", String(selectedTaxonUserId));
            formData.append("taxon", String(taxon.id));

            const response = await fetch("/api/react/atlasadmin/assignUserTaxon", {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: formData.toString()
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showFlash('success', data.message || t("user.usersAdministration.taxonAdded"));
                onTaxonChange?.();
                setTimeout(() => handleCloseTaxonModal(), 1000);
            } else {
                showFlash('danger', data.message || t("user.usersAdministration.error"));
                setSubmitting(false);
                setSelectedTaxon(null);
            }
        } catch (err) {
            console.error("Error adding taxon:", err);
            showFlash('danger', t("user.usersAdministration.error"));
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
