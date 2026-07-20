import {useEffect, useState} from "react";
import type {TaxonStats} from "@/models/TaxonStats";
import type {ApiResponse} from "@/models/ApiResponse";


interface Props {
    taxonId: number;
}

export default function TaxonRecordStats({taxonId}: Props) {
    const [stats, setStats] = useState<TaxonStats | null>(null);

    useEffect(() => {
        fetch(`/api/react/taxon/${taxonId}/stats`)
            .then(r => r.json())
            .then((res: ApiResponse<TaxonStats>) => {
                if (res.success) {
                    setStats(res.data);
                } else {
                    setStats(null);
                }
            })
            .catch(() => setStats(null));
    }, [taxonId]);

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
