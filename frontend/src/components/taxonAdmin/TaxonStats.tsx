import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {getTaxonStatistics} from '@/services/taxonApi';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';


interface Props {
    taxonId: number;
}

export default function TaxonRecordStats({taxonId}: Props) {
    const {t} = useTranslation();

    // statistiky záznamů taxonu – bez cache (sekce J), při mountu znovu;
    // při chybě se komponenta nezobrazí, detaily hlásí toast
    const {data: stats, error} = useQuery({
        queryKey: ['taxonStats', taxonId],
        queryFn: () => getTaxonStatistics(taxonId),
    });
    useQueryErrorNotify(error, t('taxon.stats.loadFailed'));

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
