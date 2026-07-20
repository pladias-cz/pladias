export interface TaxonSynonym {
    id: number;
    taxonId: number;
    name: string;
    nameHtml: string;
    suffix: string | undefined;
    autocomplete: boolean;
    publication: number;
}