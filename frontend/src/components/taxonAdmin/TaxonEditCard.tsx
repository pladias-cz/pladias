import {Card} from 'react-bootstrap';
import {type Taxon} from '@/models/Taxon';
import {type Option} from '@/models/Option';
import TaxonTraitCount from '@/components/taxonAdmin/TaxonTraitCount';
import TaxonStats from '@/components/taxonAdmin/TaxonStats';
import {useMemo} from 'react';
import InlineField from '@/components/edit/TaxonInlineField';
import {useTranslation} from 'react-i18next';
import {getTaxonRanks} from '@/services/taxonApi';
import {useCatalogQuery} from '@/query/useCatalogQuery';

interface Props {
    taxon: Taxon;
    onTaxonChange: (updated: Taxon) => void;
}


export default function TaxonEditCard({taxon, onTaxonChange}: Props) {
    const {t} = useTranslation();

    // číselník ranků – bez cache (sekce J); při selhání zůstane select prázdný
    // (403 a síťové chyby hlásí centrálně apiClient)
    const ranks = useCatalogQuery(['taxonRanks'], getTaxonRanks);
    const rankOptions = useMemo<Option[]>(
        () => ranks.map(r => ({
            value: r.id,
            label: `${r.nameEng} – ${r.nameCz}`
        })),
        [ranks]
    );

    const rankLabel = rankOptions.find(o => o.value === taxon.rank)?.label;

    /** Po úspěšném uložení inline pole – propaguje aktualizovaný taxon rodičovi. */
    const handleInlineUpdate = (updated: Taxon) => {
        onTaxonChange(updated);
    };

    return (
        <Card>
            <Card.Header>{t('taxon.edit.title')} <strong>{taxon.nameLat}</strong></Card.Header>
            <Card.Body>
                <TaxonStats taxonId={taxon.id}/>
                <TaxonTraitCount taxonId={taxon.id}/>
                <hr/>
                <InlineField
                    label={t('taxon.edit.latinName')}
                    taxonId={taxon.id}
                    field="LATNAME"
                    value={taxon.nameLat}
                    render={v => <i>{v}</i>}
                    onUpdated={handleInlineUpdate}
                />

                <InlineField
                    label={t('taxon.edit.htmlName')}
                    taxonId={taxon.id}
                    field="NAMEHTML"
                    value={taxon.nameHtml}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={handleInlineUpdate}
                />

                <InlineField
                    label={t('taxon.edit.czechName')}
                    taxonId={taxon.id}
                    field="CZNAME"
                    value={taxon.nameCz}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={handleInlineUpdate}
                />

                <InlineField
                    label={t('taxon.edit.rank')}
                    taxonId={taxon.id}
                    field="RANK"
                    value={taxon.rank || ''}
                    type="select"
                    options={rankOptions}
                    render={() => rankLabel || '—'}
                    onUpdated={handleInlineUpdate}
                />

                <InlineField
                    label={t('taxon.edit.author')}
                    taxonId={taxon.id}
                    field="AUTHOR"
                    value={taxon.author}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={handleInlineUpdate}
                />

                <InlineField
                    label={t('taxon.edit.hybridParents')}
                    taxonId={taxon.id}
                    field="HYBRIDPARENTAGE"
                    value={taxon.hybridParents}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={handleInlineUpdate}
                />

                <InlineField
                    label={t('taxon.edit.suppressed')}
                    taxonId={taxon.id}
                    field="SUPPRESSED"
                    value={taxon.suppressed || false}
                    type="boolean"
                    onUpdated={handleInlineUpdate}
                />

                <InlineField
                    label={t('taxon.edit.note')}
                    taxonId={taxon.id}
                    field="COMMENT"
                    value={taxon.note}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={handleInlineUpdate}
                />
            </Card.Body>
        </Card>
    );
}

