import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type {TraitEntryType} from "@/models/TraitEntryType";
import {type TaxonRankId} from '@/models/TaxonRankId';
import type {ApiResponse} from "@/models/ApiResponse";

export default function ExportOptions() {
    const { t } = useTranslation();
    const [entryTypes, setEntryTypes] = useState<TraitEntryType[]>([]);
    const [ranks, setRank] = useState<TaxonRankId[]>([]);

    useEffect(() => {
        fetch("/api/react/taxonrank/queryExportable")
            .then(r => r.json())
            .then((res: { data: TaxonRankId[] }) => setRank(res.data));
    }, []);


    useEffect(() => {
        fetch("/api/react/measurement/trait-entry-type")
            .then(res => res.json())
            .then((json:ApiResponse<TraitEntryType[]>) => {
                if (json.success && Array.isArray(json.data)) {
                    setEntryTypes(json.data);
                }
            })
            .catch(err => {
                console.error("Failed to load trait entry types:", err);
            });
    }, []);
    return (
        <>
            <h4>{t("measurements.export.valueTypes")}</h4>
            {entryTypes.map(entryType => (
            <div key={entryType.index}>
                <label>
                    <input
                        type="checkbox"
                        name="entryTypes[]"
                        value={entryType.index}
                    />
                    {" "}{entryType.name}
                </label>
            </div>
            ))}

            <h4>{t("measurements.export.taxaRanks")}</h4>
            {ranks.map(rank => (
                <div key={rank.nameEng}>
                    <label>
                        <input
                            type="checkbox"
                            name="ranks[]"
                            value={rank.nameEng}
                        />
                        {" "}{rank.nameEng}
                    </label>
                </div>
            ))}

             </>
    );
}
