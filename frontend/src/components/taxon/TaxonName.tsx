import {type Taxon} from '@/models/Taxon';
import {type TaxonId} from '@/models/TaxonId';

interface Props {
    taxon: Taxon | TaxonId;
}

export default function TaxonName({taxon}: Props) {
    if (!taxon) return null;

    return taxon.nameHtml ? (
        <span dangerouslySetInnerHTML={{__html: taxon.nameHtml}}/>
    ) : (
        <span>{taxon.nameLat}</span>
    );
}
