import {Breadcrumb, Card, Spinner} from 'react-bootstrap';
import {type Taxon} from '@/models/Taxon';
import TaxonName from '@/components/taxon/TaxonName';
import {Link} from 'react-router-dom'; // pokud používáš react-router
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {getTaxonParents} from '@/services/taxonApi';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';

interface Props {
    taxon: Taxon;
    cacheKey: number;

}

export default function TaxonDetail({taxon, cacheKey}: Props) {
    const {t} = useTranslation();

    // --- načtení rodičů (od kořene po přímého rodiče) – bez cache (sekce J);
    // cacheKey (verze taxonu) v klíči zajistí čerstvá data po mutacích ---
    const {data: parents = [], isPending: loadingParents, error} = useQuery({
        queryKey: ['taxonParents', taxon.id, cacheKey],
        queryFn: () => getTaxonParents(taxon.id),
    });
    useQueryErrorNotify(error, t('taxon.detail.loadParentsFailed'));

    return (
        <Card className="mt-3">
            <Card.Header>
                {loadingParents ? (
                    <Spinner animation="border" size="sm"/>
                ) : (
                    <Breadcrumb>
                        {parents.map((p) => (
                            <Breadcrumb.Item
                                key={p.id}
                                linkAs={Link}
                                linkProps={{to: `/user/taxaAdministration/${p.id}`}}
                            >
                                <TaxonName taxon={p}/>
                            </Breadcrumb.Item>
                        ))}
                        <Breadcrumb.Item active>{taxon.nameLat}</Breadcrumb.Item>
                    </Breadcrumb>
                )}

            </Card.Header>
        </Card>
    );
}
