import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import TaxonName from './TaxonName';
import type {TaxonId} from '@/models/TaxonId';

describe('TaxonName', () => {
    it('renders latin name as plain text when html name is empty', () => {
        const taxon: TaxonId = {id: 1, nameLat: 'Abies alba', nameHtml: ''};
        const {container} = render(<TaxonName taxon={taxon}/>);

        expect(container.textContent).toBe('Abies alba');
    });

    it('renders html name when present', () => {
        const taxon: TaxonId = {id: 2, nameLat: 'Abies alba', nameHtml: '<i>Abies alba</i> Mill.'};
        const {container} = render(<TaxonName taxon={taxon}/>);

        expect(container.querySelector('i')).not.toBeNull();
        expect(container.textContent).toBe('Abies alba Mill.');
    });
});