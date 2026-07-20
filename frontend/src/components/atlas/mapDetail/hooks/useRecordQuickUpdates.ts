/**
 * Hook for quick record update operations with timestamp-based conflict detection
 * Used for fields that don't require parallel edit protection (validation status, originality, etc.)
 */

import {useState, useCallback} from 'react';
import axios from 'axios';
import type { RecordPladias } from '@/models';
import {ValidationStatusId, ValidationStatusMeta} from '@/core/validationStatus';

interface UpdateResult {
    success: boolean;
    timestamp?: number;
    record?: RecordPladias;
    error?: string;
}

export function useRecordQuickUpdates() {
    const [updatingRecordId, setUpdatingRecordId] = useState<number | null>(null);

    const updateField = useCallback(async (
        recordId: number,
        field: string,
        value: string | number | boolean,
        timestamp: number,
        originalRecord?: RecordPladias
    ): Promise<UpdateResult> => {
        try {
            const response = await axios.patch(`/api/react/atlas/record/${recordId}`, {
                key: field,
                value: value.toString(),
                lastEditTimestampNum: timestamp,
            });

            // Backend returns {data: {validation_status: "2", timestamp: number}} structure
            const responseData = response.data?.data || response.data;
            const newTimestamp = responseData?.lastEditTimestampNum;
            
            if (newTimestamp !== undefined) {
                // Merge new timestamp with original record to propagate to parent
                const updatedRecord = originalRecord 
                    ? {...originalRecord, lastEditTimestampNum: newTimestamp}
                    : {id: recordId, lastEditTimestampNum: newTimestamp} as unknown as RecordPladias;
                return {
                    success: true,
                    timestamp: newTimestamp,
                    record: updatedRecord,
                };
            } else if (response.data?.error) {
                return {success: false, error: response.data.error};
            } else {
                return {success: false, error: 'Unknown error'};
            }
        } catch (error: any) {
            console.error(`Error updating ${field}:`, error);
            const errorMsg = error.response?.data?.error || error.message || 'Network error';
            return {success: false, error: errorMsg};
        }
    }, []);

    const updateValidationStatus = useCallback(async (
        record: RecordPladias, newStatus: number,
        onSuccess?: (updatedRecord: RecordPladias) => void, onError?: (message: string) => void
    ): Promise<UpdateResult> => {
        setUpdatingRecordId(record.id);
        const result = await updateField(record.id, 'VALIDATION_STATUS', newStatus, record.lastEditTimestampNum || 0, record);
        
        if (result.success && result.record) {
            // Also update the validationStatusColor for map marker propagation
            const color = ValidationStatusMeta[newStatus as ValidationStatusId]?.color || '#808080';
            const updatedRecordWithColor = {
                ...result.record,
                validationStatusId: newStatus,
                validationStatusColor: color
            };
            onSuccess?.(updatedRecordWithColor);
        } else {
            onError?.(result.error || 'Failed to update validation status');
        }
        
        setUpdatingRecordId(null);
        return result;
    }, [updateField]);

    const updateOriginalityStatus = useCallback(async (
        record: RecordPladias, newOriginality: number,
        onSuccess?: (updatedRecord: RecordPladias) => void, onError?: (message: string) => void
    ): Promise<UpdateResult> => {
        setUpdatingRecordId(record.id);
        const result = await updateField(record.id, 'ORIGINALITY_STATUS', newOriginality, record.lastEditTimestampNum || 0, record);
        result.success ? onSuccess?.(result.record!) : onError?.(result.error || 'Failed to update originality status');
        setUpdatingRecordId(null);
        return result;
    }, [updateField]);

    const updateHerbariumQuality = useCallback(async (
        record: RecordPladias, newValue: boolean,
        onSuccess?: (updatedRecord: RecordPladias) => void, onError?: (message: string) => void
    ): Promise<UpdateResult> => {
        setUpdatingRecordId(record.id);
        const result = await updateField(record.id, 'HERBARIUM_QUALITY', newValue, record.lastEditTimestampNum || 0, record);
        result.success ? onSuccess?.(result.record!) : onError?.(result.error || 'Failed to update herbarium quality');
        setUpdatingRecordId(null);
        return result;
    }, [updateField]);

    const updateIncludedInMap = useCallback(async (
        record: RecordPladias, newValue: boolean,
        onSuccess?: (updatedRecord: RecordPladias) => void, onError?: (message: string) => void
    ): Promise<UpdateResult> => {
        setUpdatingRecordId(record.id);
        const result = await updateField(record.id, 'INCLUDED_IN_MAP', newValue, record.lastEditTimestampNum || 0, record);
        result.success ? onSuccess?.(result.record!) : onError?.(result.error || 'Failed to update include in map');
        setUpdatingRecordId(null);
        return result;
    }, [updateField]);

    return {
        updatingRecordId,
        updateValidationStatus,
        updateOriginalityStatus,
        updateHerbariumQuality,
        updateIncludedInMap,
        updateField,
    };
}
