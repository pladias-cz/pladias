import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {getTaxonTraitCount} from '@/services/taxonApi';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';

interface Props {
    taxonId: number;
}

export default function TaxonTraitCount({taxonId}: Props) {
    const {t} = useTranslation();

    // počet datových řad taxonu – bez cache (sekce J), při mountu znovu;
    // při chybě se komponenta nezobrazí, detaily hlásí toast
    const {data: count, error} = useQuery({
        queryKey: ['taxonTraitCount', taxonId],
        queryFn: () => getTaxonTraitCount(taxonId),
    });
    useQueryErrorNotify(error, t('taxon.traitCount.loadFailed'));

    if (count == null) {
        return null; // nebo třeba spinner
    }

    return (
        <div className="mb-3 text-muted">
            {count > 0
                ? <>{t('taxon.traitCount.presentStart')} <strong>{count}</strong> {t('taxon.traitCount.presentEnd')}</>
                : <>{t('taxon.traitCount.notPresent')}</>
            }
        </div>
    );
}
