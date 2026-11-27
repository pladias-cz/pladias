/**
 * Testy sekce Technické info v pravém panelu detailu záznamu: Dopočtený
 * fytochorion a Nadm. výška aprox. se vykreslí jen v cévnaté instanci – obě
 * hodnoty se odvozují z mapového pole, které se v ne-cevnaté instanci neřeší.
 * Zbytek sekce (dávka, ID, původ, licence) zůstává viditelný v obou.
 */

import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import '@/i18n/i18n';
import RecordRemarks from './RecordRemarks';
import {InstanceConfigProvider} from '@/context/InstanceConfigContext';
import type {InstanceConfigData} from '@/models/InstanceConfig';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';

/** Záznam bez práv – sekce se vykreslí v read-only podobě bez fetování číselníků. */
function makeRecord(): RecordPladiasFull {
    return {
        id: 7,
        batch: {id: 3, authorName: 'Autor dávky', createTimestamp: '2026-01-01'},
        mapSquares: [],
        herbariums: [],
        projectName: 'Atlas',
        institutionName: 'BU',
        licenseName: 'CC BY',
        isPhytochorionComputed: true,
        altitudeApproximation: true,
        canEditCommonFields: false,
        canEditOriginalId: false,
    } as unknown as RecordPladiasFull;
}

function renderRemarks(config: InstanceConfigData) {
    return render(
        <InstanceConfigProvider config={config}>
            <RecordRemarks record={makeRecord()}/>
        </InstanceConfigProvider>,
    );
}

afterEach(() => cleanup());

describe('RecordRemarks – Technické info', () => {
    it('cévnatá instance ukáže Dopočtený fytochorion i Nadm. výšku aprox.', () => {
        renderRemarks({isVascular: true});

        expect(screen.getByText('Dopočtený fytochorion')).toBeInTheDocument();
        expect(screen.getByText('Nadm. výška aprox.')).toBeInTheDocument();
    });

    it('ne-cevnatá instance obě pole skryje a zbytek sekce ponechá', () => {
        renderRemarks({isVascular: false});

        expect(screen.queryByText('Dopočtený fytochorion')).toBeNull();
        expect(screen.queryByText('Nadm. výška aprox.')).toBeNull();
        expect(screen.getByText('Technické info')).toBeInTheDocument();
        expect(screen.getByText('CC BY')).toBeInTheDocument();
    });
});
