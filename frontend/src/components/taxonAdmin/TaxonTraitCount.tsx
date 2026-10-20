import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {getTaxonTraitCount} from "@/services/taxonApi";
import {notifyApiError} from "@/stores/notificationStore";

interface Props {
    taxonId: number;
}

export default function TaxonTraitCount({taxonId}: Props) {
    const {t} = useTranslation();
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        getTaxonTraitCount(taxonId)
            .then(setCount)
            .catch(e => {
                notifyApiError(e, t("taxon.traitCount.loadFailed"));
                setCount(0);
            });
    }, [taxonId, t]);

    if (count === null) {
        return null; // nebo třeba spinner
    }

    return (
        <div className="mb-3 text-muted">
            {count > 0
                ? <>{t("taxon.traitCount.presentStart")} <strong>{count}</strong> {t("taxon.traitCount.presentEnd")}</>
                : <>{t("taxon.traitCount.notPresent")}</>
            }
        </div>
    );
}
