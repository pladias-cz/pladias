import type { RecordPladias } from '@/models';
import {useRecordPermissions} from '@/components/atlas/record';
import {useState} from 'react';
import {useRecordQuickUpdates} from "@/components/atlas/mapDetail/hooks/useRecordQuickUpdates.ts";

interface HerbariumQualityCheckboxProps {
    record: RecordPladias;
    onRecordUpdated?: (record: RecordPladias) => void;
}

export function HerbariumQualityCheckbox({record, onRecordUpdated}: HerbariumQualityCheckboxProps) {
    const {canEdit} = useRecordPermissions(record);
    const {updateHerbariumQuality} = useRecordQuickUpdates();
    const [isChecked, setIsChecked] = useState(record.herbariumQuality ?? false);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        // Optimistic update
        setIsChecked(newValue);
        
        const result = await updateHerbariumQuality(
            {...record, herbariumQuality: newValue}, 
            newValue,
            (updatedRecord) => {
                // Propagate updated record with new timestamp to parent
                onRecordUpdated?.(updatedRecord);
            },
            (error) => {
                // Revert on error
                console.error(error);
                setIsChecked(!newValue);
            }
        );
        
        // Also revert if failed
        if (!result.success) {
            setIsChecked(!newValue);
        }
    };

    return (
        <div className="herbarium-quality mt-2">
            <label>
                <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!canEdit}
                    onChange={handleChange}
                />{" "}
                Revidovaný herbář
            </label>
        </div>
    );
}

export default HerbariumQualityCheckbox;