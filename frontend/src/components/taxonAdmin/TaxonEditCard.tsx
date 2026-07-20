import {Card} from "react-bootstrap";
import {type Taxon} from '@/models/Taxon';
import {type TaxonRankId} from '@/models/TaxonRankId';
import {type Option} from '@/models/Option.ts';
import TaxonTraitCount from "@/components/taxonAdmin/TaxonTraitCount";
import TaxonStats from "@/components/taxonAdmin/TaxonStats";
import {useEffect, useState} from "react";
import InlineField from '@/components/edit/TaxonInlineField';
import {useTranslation} from 'react-i18next';

interface Props {
    taxon: Taxon;
    onTaxonChange: (updated: Taxon) => void;
    cacheKey: number;
}


export default function TaxonEditCard({taxon, onTaxonChange, cacheKey}: Props) {
    const {t} = useTranslation();
    const [localTaxon, setLocalTaxon] = useState<Taxon>(taxon);

    useEffect(() => {
        setLocalTaxon(taxon); // aktualizujeme lokální taxon
    }, [taxon.id, taxon.nameLat]);

    useEffect(() => {
        setLocalTaxon(taxon);
    }, [cacheKey]);

    const [rankOptions, setRankOptions] = useState<Option[]>([]);

    useEffect(() => {
        fetch("/api/react/taxonrank/queryAll")
            .then(r => r.json())
            .then(res => res.data as TaxonRankId[])
            .then(ranks =>
                ranks.map(r => ({
                    value: r.id,
                    label: `${r.nameEng} – ${r.nameCz}`
                }))
            )
            .then(setRankOptions);
    }, []);

    const rankLabel = rankOptions.find(o => o.value === taxon.rank)?.label;

    return (
        <Card>
            <Card.Header>{t("taxon.edit.title")} <strong>{taxon.nameLat}</strong></Card.Header>
            <Card.Body>
                <TaxonStats taxonId={taxon.id}/>
                <TaxonTraitCount taxonId={taxon.id}/>
                <hr/>
                <InlineField
                    label={t("taxon.edit.latinName")}
                    taxonId={taxon.id}
                    field="LATNAME"
                    value={taxon.nameLat}
                    render={v => <i>{v}</i>}
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, nameLat: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />

                <InlineField
                    label={t("taxon.edit.htmlName")}
                    taxonId={taxon.id}
                    field="NAMEHTML"
                    value={taxon.nameHtml}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, nameHtml: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />

                <InlineField
                    label={t("taxon.edit.czechName")}
                    taxonId={taxon.id}
                    field="CZNAME"
                    value={taxon.nameCz}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, nameCz: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />

                <InlineField
                    label={t("taxon.edit.rank")}
                    taxonId={taxon.id}
                    field="RANK"
                    value={taxon.rank || ''}
                    type="select"
                    options={rankOptions}
                    render={() => rankLabel || "—"}
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, rank: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />

                <InlineField
                    label={t("taxon.edit.author")}
                    taxonId={taxon.id}
                    field="AUTHOR"
                    value={taxon.author}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, author: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />

                <InlineField
                    label={t("taxon.edit.hybridParents")}
                    taxonId={taxon.id}
                    field="HYBRIDPARENTAGE"
                    value={taxon.hybridParents}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, hybridParents: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />

                <InlineField
                    label={t("taxon.edit.suppressed")}
                    taxonId={taxon.id}
                    field="SUPPRESSED"
                    value={taxon.suppressed || false}
                    type="boolean"
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, suppressed: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />

                <InlineField
                    label={t("taxon.edit.note")}
                    taxonId={taxon.id}
                    field="COMMENT"
                    value={taxon.note}
                    render={v => v ? <>{v}</> : <span className="text-muted">—</span>}
                    onUpdated={v => {
                        const updatedTaxon = {...localTaxon, note: v};
                        setLocalTaxon(updatedTaxon);
                        onTaxonChange(updatedTaxon);
                    }}
                />
            </Card.Body>
        </Card>
    );
}

