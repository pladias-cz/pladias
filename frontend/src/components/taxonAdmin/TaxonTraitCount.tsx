import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";

interface Props {
    taxonId: number;
}

export default function TaxonTraitCount({taxonId}: Props) {
    const {t} = useTranslation();
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        fetch(`/api/react/taxon/${taxonId}/traitCount`)
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setCount(res.data);
                } else {
                    setCount(0);
                }
            })
            .catch(() => setCount(0));
    }, [taxonId]);

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
