/**
 * Hook for taxon update operations
 */

import {useState, useCallback} from 'react';
import axios from 'axios';
import type {TaxonMapSettings} from '../types';

export function useTaxonUpdates() {
    const [updatingTaxonId, setUpdatingTaxonId] = useState<number | null>(null);

    const updateSetting = useCallback(async (
        taxonId: number,
        key: string,
        value: string | number | boolean,
        timestamp: number
    ): Promise<boolean> => {
        try {
            const formData = new FormData();
            formData.append('taxonId', taxonId.toString());
            formData.append('timestamp', timestamp.toString());
            formData.append('key', key);
            formData.append('value', value.toString());

            const response = await axios.post('/api/react/atlasadmin/taxonMapSettings', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            if (response.data?.success) {
                return true;
            } else {
                throw new Error(response.data?.error || 'Unknown error');
            }
        } catch (error) {
            console.error(`Error updating ${key}:`, error);
            throw error;
        }
    }, []);

    const updateIsMapped = useCallback(async (
        row: TaxonMapSettings,
        newDataCallback: (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void,
        errorCallback: (message: string) => void
    ) => {
        const taxonId = row.taxonId;
        const currentIsMapped = row.isMapped;
        const timestamp = row.lastEditTimestamp;

        newDataCallback(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {...t, isMapped: !currentIsMapped} : t
            )
        );

        setUpdatingTaxonId(taxonId);

        try {
            await updateSetting(taxonId, 'ISMAPPED', !currentIsMapped, timestamp);
        } catch (error) {
            newDataCallback(prev =>
                prev.map(t =>
                    t.taxonId === taxonId ? {...t, isMapped: currentIsMapped} : t
                )
            );
            errorCallback(`Failed to update mapped status for taxon ${row.taxonNameLat}`);
        } finally {
            setUpdatingTaxonId(null);
        }
    }, [updateSetting]);

    const updateParentMap = useCallback(async (
        row: TaxonMapSettings,
        newParentTaxonId: number | null,
        newParentTaxonNameLat: string | null,
        newDataCallback: (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void,
        errorCallback: (message: string) => void
    ) => {
        const taxonId = row.taxonId;
        const currentParentTaxonId = row.parentTaxonId;
        const currentParentTaxonNameLat = row.parentTaxonNameLat;
        const timestamp = row.lastEditTimestamp;

        newDataCallback(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {
                    ...t,
                    parentTaxonId: newParentTaxonId,
                    parentTaxonNameLat: newParentTaxonNameLat
                } : t
            )
        );

        setUpdatingTaxonId(taxonId);

        try {
            await updateSetting(taxonId, 'PARENT_MAP', newParentTaxonId !== null ? newParentTaxonId : '', timestamp);
        } catch (error) {
            newDataCallback(prev =>
                prev.map(t =>
                    t.taxonId === taxonId ? {
                        ...t,
                        parentTaxonId: currentParentTaxonId,
                        parentTaxonNameLat: currentParentTaxonNameLat
                    } : t
                )
            );
            errorCallback(`Failed to update parent map for taxon ${row.taxonNameLat}`);
        } finally {
            setUpdatingTaxonId(null);
        }
    }, [updateSetting]);

    const updateCommonThreshold = useCallback(async (
        row: TaxonMapSettings,
        newValue: number,
        newDataCallback: (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void,
        errorCallback: (message: string) => void
    ) => {
        const taxonId = row.taxonId;
        const currentCommonThreshold = row.commonThreshold;
        const timestamp = row.lastEditTimestamp;

        newDataCallback(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {...t, commonThreshold: newValue} : t
            )
        );

        setUpdatingTaxonId(taxonId);

        try {
            await updateSetting(taxonId, 'SETCOMMONTHRESHOLD', newValue, timestamp);
        } catch (error) {
            newDataCallback(prev =>
                prev.map(t =>
                    t.taxonId === taxonId ? {...t, commonThreshold: currentCommonThreshold} : t
                )
            );
            errorCallback(`Failed to update commonThreshold for taxon ${row.taxonNameLat}`);
        } finally {
            setUpdatingTaxonId(null);
        }
    }, [updateSetting]);

    const updateIsProtected = useCallback(async (
        row: TaxonMapSettings,
        newDataCallback: (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void,
        errorCallback: (message: string) => void
    ) => {
        const taxonId = row.taxonId;
        const currentIsProtected = row.isProtected;
        const timestamp = row.lastEditTimestamp;

        newDataCallback(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {...t, isProtected: !currentIsProtected} : t
            )
        );

        setUpdatingTaxonId(taxonId);

        try {
            await updateSetting(taxonId, 'PROTECTED', !currentIsProtected, timestamp);
        } catch (error) {
            newDataCallback(prev =>
                prev.map(t =>
                    t.taxonId === taxonId ? {...t, isProtected: currentIsProtected} : t
                )
            );
            errorCallback(`Failed to update isProtected for taxon ${row.taxonNameLat}`);
        } finally {
            setUpdatingTaxonId(null);
        }
    }, [updateSetting]);

    const updatePreslia = useCallback(async (
        row: TaxonMapSettings,
        newValue: string,
        newDataCallback: (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void,
        errorCallback: (message: string) => void
    ) => {
        const taxonId = row.taxonId;
        const timestamp = row.lastEditTimestamp;

        setUpdatingTaxonId(taxonId);

        try {
            await updateSetting(taxonId, 'PRESLIA', newValue, timestamp);
            
            newDataCallback(prev =>
                prev.map(t =>
                    t.taxonId === taxonId ? {...t, preslia: newValue} : t
                )
            );
        } catch (error) {
            errorCallback(`Failed to update preslia for taxon ${row.taxonNameLat}`);
            throw error;
        } finally {
            setUpdatingTaxonId(null);
        }
    }, [updateSetting]);

    const updateRevisionStatus = useCallback(async (
        row: TaxonMapSettings,
        newValue: number,
        newDataCallback: (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void,
        errorCallback: (message: string) => void
    ) => {
        const taxonId = row.taxonId;
        const currentRevisionStatusId = row.revisionStatusId;
        const timestamp = row.lastEditTimestamp;

        newDataCallback(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {...t, revisionStatusId: newValue} : t
            )
        );

        setUpdatingTaxonId(taxonId);

        try {
            await updateSetting(taxonId, 'REVISIONSTATUS', newValue, timestamp);
        } catch (error) {
            newDataCallback(prev =>
                prev.map(t =>
                    t.taxonId === taxonId ? {...t, revisionStatusId: currentRevisionStatusId} : t
                )
            );
            errorCallback(`Failed to update revision status for taxon ${row.taxonNameLat}`);
        } finally {
            setUpdatingTaxonId(null);
        }
    }, [updateSetting]);

    const updatePublicationStatus = useCallback(async (
        row: TaxonMapSettings,
        newValue: number,
        newDataCallback: (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void,
        errorCallback: (message: string) => void
    ) => {
        const taxonId = row.taxonId;
        const currentPublicationStatusId = row.publicationStatusId;
        const timestamp = row.lastEditTimestamp;

        newDataCallback(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {...t, publicationStatusId: newValue} : t
            )
        );

        setUpdatingTaxonId(taxonId);

        try {
            await updateSetting(taxonId, 'PUBLICATIONSTATUS', newValue, timestamp);
        } catch (error) {
            newDataCallback(prev =>
                prev.map(t =>
                    t.taxonId === taxonId ? {...t, publicationStatusId: currentPublicationStatusId} : t
                )
            );
            errorCallback(`Failed to update publication status for taxon ${row.taxonNameLat}`);
        } finally {
            setUpdatingTaxonId(null);
        }
    }, [updateSetting]);

    return {
        updatingTaxonId,
        updateIsMapped,
        updateParentMap,
        updateCommonThreshold,
        updateIsProtected,
        updatePreslia,
        updateRevisionStatus,
        updatePublicationStatus,
    };
}
