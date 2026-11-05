import {type Taxon} from '@/models/Taxon';
import {type TaxonId} from '@/models/TaxonId';
import RichTextMessage from '@/components/RichTextMessage';

interface Props {
    taxon: Taxon | TaxonId;
}

export default function TaxonName({taxon}: Props) {
    if (!taxon) return null;

    return taxon.nameHtml ? (
        <RichTextMessage html={taxon.nameHtml}/>
    ) : (
        <span>{taxon.nameLat}</span>
    );
}
