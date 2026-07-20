import { useState } from 'react';
import { ValidationStatusId, ValidationStatusMeta } from '@/core/validationStatus';
import type { RecordPladias } from '@/models';
import { useRecordQuickUpdates } from './hooks/useRecordQuickUpdates.ts';
import { useUser } from '@/context/UserContext';

interface ValidationStatusCheckboxesProps {
    record: RecordPladias;
    onRecordUpdated?: (record: RecordPladias) => void;
}

export function ValidationStatusCheckboxes({ record, onRecordUpdated }: ValidationStatusCheckboxesProps) {
    const { updateValidationStatus } = useRecordQuickUpdates();
    const user = useUser();
    const [optimisticStatus, setOptimisticStatus] = useState<ValidationStatusId | null>(null);

    // Filter statuses - UNPROCESSED is only visible to mapAdmins
    const getVisibleStatuses = (): Array<[string, typeof ValidationStatusMeta[ValidationStatusId]]> => {
        return Object.entries(ValidationStatusMeta).filter(([statusId]) => {
            const id = Number(statusId) as ValidationStatusId;
            if (id === ValidationStatusId.UNPROCESSED) {
                return user.isMapAdmin;
            }
            return true;
        }) as Array<[string, typeof ValidationStatusMeta[ValidationStatusId]]>;
    };

    const handleStatusChange = async (newStatus: ValidationStatusId) => {
        if (!record.canEdit) {
            return;
        }
        
        // Always allow clicking a status - even if it's already selected
        // This allows users to confirm/reapply the same status
        setOptimisticStatus(newStatus);
        
        try {
            const result = await updateValidationStatus(
                record, 
                newStatus,
                (updatedRecord) => {
                    // Success callback - notify parent of the update
                    onRecordUpdated?.(updatedRecord);
                },
                () => {
                    // Error callback - revert optimistic update
                    setOptimisticStatus(null);
                }
            );
            if (!result.success) {
                // Revert on error
                setOptimisticStatus(null);
            }
        } catch {
            // Revert on error
            setOptimisticStatus(null);
        }
    };

    const getCurrentStatus = (id: ValidationStatusId): boolean => {
        if (optimisticStatus !== null) {
            return optimisticStatus === id;
        }
        return record.validationStatusId === id;
    };

    return (
        <div className="validation-status-checkboxes">
            {getVisibleStatuses().map(([statusId, meta]) => {
                const id = Number(statusId) as ValidationStatusId;
                const isChecked = getCurrentStatus(id);

                return (
                    <label
                        key={id}
                        className="validation-status-checkbox-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: record.canEdit ? 'pointer' : 'default',
                            padding: '2px 0',
                            opacity: record.canEdit ? 1 : 0.6,
                        }}
                        onClick={() => handleStatusChange(id)}
                    >
                        <div
                            style={{
                                width: '16px',
                                height: '16px',
                                border: `2px solid ${meta.color}`,
                                borderRadius: '3px',
                                backgroundColor: isChecked ? meta.color : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.15s ease',
                            }}
                        >
                            {isChecked && (
                                <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M10 3L4.5 8.5L2 6"
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            )}
                        </div>
                    </label>
                );
            })}
        </div>
    );
}

export default ValidationStatusCheckboxes;
