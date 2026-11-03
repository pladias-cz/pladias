import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import type {RecordGbifMinimal} from '@/models/AtlasRecords';
import {ExternalRecordsTable} from './ExternalRecordsTable';
import '@/i18n/i18n';

/**
 * Testy odkazu na detail externího záznamu (sloupec Id): GBIF/iNaturalist
 * záznamy nesou GBIF occurrence id z tabulky gbif.records, takže odkazují
 * na gbif.org; ČBS záznamy nesou iNaturalist observation id z interního
 * iNaturalist exportu ČBS (gbif.geoserver_inat_cbs_main), takže odkazují
 * na inaturalist.org.
 */

/** Minimální externí záznam – jen pole, ke kterým se tabulka dostane. */
function makeRecord(id: number, project: RecordGbifMinimal['project']): RecordGbifMinimal {
    return {
        id,
        latitude: 50.1,
        longitude: 14.5,
        gpsPrecision: null,
        year: 2020,
        recordedBy: 'Autor',
        institutionCode: null,
        validationStatusColor: null,
        quadrantLetter: null,
        squareCode: '6152',
        computedSquareCode: '6152',
        project,
    };
}

afterEach(() => cleanup());

describe('ExternalRecordsTable – odkaz na detail záznamu', () => {
    it('GBIF záznam odkazuje na gbif.org', () => {
        render(<ExternalRecordsTable records={[makeRecord(123, 'gbif')]}/>);

        expect(screen.getByRole('link', {name: '123'}))
            .toHaveAttribute('href', 'https://www.gbif.org/occurrence/123');
    });

    it('iNaturalist záznam nese GBIF occurrence id, odkazuje tedy na gbif.org', () => {
        render(<ExternalRecordsTable records={[makeRecord(124, 'inaturalist')]}/>);

        expect(screen.getByRole('link', {name: '124'}))
            .toHaveAttribute('href', 'https://www.gbif.org/occurrence/124');
    });

    it('ČBS záznam nese iNaturalist observation id, odkazuje na inaturalist.org', () => {
        render(<ExternalRecordsTable records={[makeRecord(125, 'cbs')]}/>);

        expect(screen.getByRole('link', {name: '125'}))
            .toHaveAttribute('href', 'https://www.inaturalist.org/observations/125');
    });
});
