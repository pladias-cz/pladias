import {useEffect, useState} from 'react';
import {Breadcrumb, Card, Spinner} from 'react-bootstrap';
import {type Taxon} from '@/models/Taxon';
import {type TaxonId} from '@/models/TaxonId';
import TaxonName from '@/components/taxon/TaxonName';
import {Link} from 'react-router-dom'; // pokud používáš react-router
import {useTranslation} from 'react-i18next';

interface Props {
    taxon: Taxon;
    cacheKey: number;

}

export default function TaxonDetail({taxon, cacheKey}: Props) {
    const {t} = useTranslation();

    const [parents, setParents] = useState<TaxonId[]>([]);
    const [loadingParents, setLoadingParents] = useState(false);

    useEffect(() => {
        setParents([]);
    }, [cacheKey]);


    // --- načtení rodičů ---
    useEffect(() => {
        async function loadParents() {
            setLoadingParents(true);
            try {
                const res = await fetch(`/api/react/taxon/${taxon.id}/parents`);
                if (!res.ok) throw new Error(t("taxon.detail.loadParentsFailed"));
                const json = await res.json();
                if (!json.success) throw new Error(t("taxon.detail.apiError"));

                setParents(json.data); // očekáváme pole Taxonů od kořene po přímého rodiče
            } catch (e) {
                console.error(e);
                setParents([]);
            } finally {
                setLoadingParents(false);
            }
        }

        if (taxon?.id) {
            loadParents();
        }
    }, [taxon]);

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
