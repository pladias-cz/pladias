import { useState } from 'react';
import { OriginalityStatusId, OriginalityStatusMeta } from '@/core/originalityStatus';
import type { RecordPladias } from '@/models';
import { useRecordQuickUpdates } from './hooks/useRecordQuickUpdates.ts';

interface OriginalityStatusIconsProps {
    record: RecordPladias;
    onRecordUpdated?: (record: RecordPladias) => void;
}

export function OriginalityStatusIcons({ record, onRecordUpdated }: OriginalityStatusIconsProps) {
    const { updateOriginalityStatus } = useRecordQuickUpdates();
    const [optimisticStatus, setOptimisticStatus] = useState<OriginalityStatusId | null>(null);

    const handleStatusChange = async (newStatus: OriginalityStatusId) => {
        if (record.originalityStatusId !== newStatus && record.canEdit) {
            // Optimistic update - show change immediately
            setOptimisticStatus(newStatus);

            try {
                const result = await updateOriginalityStatus(
                    record, 
                    newStatus,
                    (updatedRecord) => {
                        // Propagate updated record with new timestamp to parent
                        onRecordUpdated?.(updatedRecord);
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
        }
    };

    const getCurrentStatus = (id: OriginalityStatusId): boolean => {
        if (optimisticStatus !== null) {
            return optimisticStatus === id;
        }
        return record.originalityStatusId === id;
    };

    return (
        <div
            className="originality-status-icons"
            style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
            }}
        >
            {Object.entries(OriginalityStatusMeta).map(([statusId, meta]) => {
                const id = Number(statusId) as OriginalityStatusId;
                const isChecked = getCurrentStatus(id);
                const hasIcon = meta.icon && meta.icon.length > 0;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => handleStatusChange(id)}
                        disabled={!record.canEdit}
                        title={meta.i18nKey}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: record.canEdit ? 'pointer' : 'default',
                            opacity: record.canEdit ? 1 : 0.6,
                            padding: 0,
                            outline: 'none',
                            background: 'none',
                            border: 'none',
                        }}
                    >
                        {isChecked && (
                            <div
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    backgroundColor: meta.color,
                                    transition: 'background-color 0.15s ease',
                                }}
                            >
                                {hasIcon && (
                                    <i
                                        className={meta.icon}
                                        style={{
                                            color: '#ffffff',
                                            fontSize: '14px',
                                        }}
                                    />
                                )}
                            </div>
                        )}
                        {!isChecked && hasIcon && (
                            <i
                                className={meta.icon}
                                style={{
                                    color: meta.color,
                                    fontSize: '18px',
                                }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default OriginalityStatusIcons;