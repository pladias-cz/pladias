import { useState } from 'react';
import type { RecordPladias } from '@/models';
import { useRecordQuickUpdates } from './hooks/useRecordQuickUpdates.ts';

interface IncludeInMapCheckboxProps {
    record: RecordPladias;
    onRecordUpdated?: (record: RecordPladias) => void;
}

export function IncludeInMapCheckbox({ record, onRecordUpdated }: IncludeInMapCheckboxProps) {
    const { updateIncludedInMap } = useRecordQuickUpdates();
    const [optimisticValue, setOptimisticValue] = useState<boolean | null>(null);

    const currentValue = optimisticValue !== null ? optimisticValue : (record.includedInMap ?? false);

    const handleChange = async (newVal: boolean) => {
        if (currentValue !== newVal && record.canEdit) {
            // Optimistic update - show change immediately
            setOptimisticValue(newVal);

            try {
                const result = await updateIncludedInMap(
                    record, 
                    newVal,
                    (updatedRecord) => {
                        // Propagate updated record with new timestamp to parent
                        onRecordUpdated?.(updatedRecord);
                    }
                );
                if (!result.success) {
                    // Revert on error
                    setOptimisticValue(null);
                }
            } catch {
                // Revert on error
                setOptimisticValue(null);
            }
        }
    };

    return (
        <label
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: record.canEdit ? 'pointer' : 'default',
                opacity: record.canEdit ? 1 : 0.6,
                fontSize: '85%',
            }}
            onClick={() => handleChange(!currentValue)}
        >
            <div
                style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${currentValue ? '#0066cc' : '#666666'}`,
                    borderRadius: '3px',
                    backgroundColor: currentValue ? '#0066cc' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.15s ease',
                }}
            >
                {currentValue && (
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
            <span>Zahrnut do mapy</span>
        </label>
    );
}

export default IncludeInMapCheckbox;