import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type {TraitEntryType} from "@/models/TraitEntryType";
import type {TaxonRankId} from "@/models/TaxonRankId";
import {getExportableTaxonRanks} from "@/services/taxonApi";
import {getTraitEntryTypes} from "@/services/traitApi";

export default function ExportOptions() {
    const { t } = useTranslation();
    const [entryTypes, setEntryTypes] = useState<TraitEntryType[]>([]);
    const [ranks, setRank] = useState<TaxonRankId[]>([]);

    useEffect(() => {
        getExportableTaxonRanks()
            .then(setRank)
            .catch(e => console.error("Failed to load exportable taxon ranks:", e));
    }, []);


    useEffect(() => {
        getTraitEntryTypes()
            .then(setEntryTypes)
            .catch(err => {
                console.error("Failed to load trait entry types:", err);
            });
    }, []);
    return (
        <>
            <h4>{t("trait.export.valueTypes")}</h4>
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

            <h4>{t("trait.export.taxaRanks")}</h4>
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
