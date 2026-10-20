import {useEffect, useState} from "react";
import type {TaxonStats} from "@/models/TaxonStats";
import {useTranslation} from "react-i18next";
import {getTaxonStatistics} from "@/services/taxonApi";
import {notifyApiError} from "@/stores/notificationStore";


interface Props {
    taxonId: number;
}

export default function TaxonRecordStats({taxonId}: Props) {
    const {t} = useTranslation();
    const [stats, setStats] = useState<TaxonStats | null>(null);

    useEffect(() => {
        getTaxonStatistics(taxonId)
            .then(setStats)
            .catch(e => {
                notifyApiError(e, t("taxon.stats.loadFailed"));
                setStats(null);
            });
    }, [taxonId, t]);

    if (!stats) {
        return null; // případně spinner
    }
    return (
        <div className="mb-2 small text-muted">
      <span
          className="text-dark fw-semibold"
          title="Total">
        {stats.recordsTotal}
      </span>
            <span className="mx-1">/</span>

            <span
                className="text-success"
                title="Accepted">
        {stats.recordsAccepted}
      </span>
            <span className="mx-1">/</span>

            <span
                className="text-danger"
                title="Declined">
        {stats.recordsDeclined}
      </span>
            <span className="mx-1">/</span>

            <span
                className="text-warning"
                title="Uncertain">
        {stats.recordsUncertain}
      </span>
            <span className="mx-1">/</span>

            <span
                className="text-secondary"
                title="Unprocessed">
        {stats.recordsUnprocessed}
      </span>
        </div>
    );

}
