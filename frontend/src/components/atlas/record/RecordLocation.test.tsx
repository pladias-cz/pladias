/**
 * Testy vložení souřadnic do panelu Pozice: obě pole (GPS desetinné i DMS) se
 * ukážou jen s právem a jen dokud neexistuje návrh; vložený řetězec se převede
 * na dec. stupně a pošle nahoru; neplatný vstup hlásí chybu a nic nepošle.
 */

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import '@/i18n/i18n';
import RecordLocation from './RecordLocation';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';

const makeRecord = (overrides: Partial<RecordPladiasFull> = {}): RecordPladiasFull =>
    ({
        id: 7,
        latitude: 49.5,
        longitude: 14.5,
        gpsCoordSource: 'Zadáno v Pladias',
        gpsCoordsPrecision: 100,
        ...overrides,
    }) as unknown as RecordPladiasFull;

const gpsInput = () => screen.getByPlaceholderText(/49\.5, 14\.5/);
const dmsInput = () => screen.getByPlaceholderText(/50°38/);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('RecordLocation – vložení souřadnic', () => {
    it('DMS input pošle převedené souřadnice', () => {
        const onCoordinatesSubmitted = vi.fn();
        render(<RecordLocation record={makeRecord()} canEdit onCoordinatesSubmitted={onCoordinatesSubmitted}/>);

        fireEvent.change(dmsInput(), {target: {value: '50°38\'27.9"N, 14°27\'27.2"E'}});
        fireEvent.click(screen.getAllByRole('button', {name: 'Vložit'})[1]);

        expect(onCoordinatesSubmitted).toHaveBeenCalledTimes(1);
        const [lat, lng] = onCoordinatesSubmitted.mock.calls[0] as [number, number];
        expect(lat).toBeCloseTo(50.6410833, 6);
        expect(lng).toBeCloseTo(14.4575556, 6);
    });

    it('GPS input pošle desetinné souřadnice', () => {
        const onCoordinatesSubmitted = vi.fn();
        render(<RecordLocation record={makeRecord()} canEdit onCoordinatesSubmitted={onCoordinatesSubmitted}/>);

        fireEvent.change(gpsInput(), {target: {value: '49.5, 18.25'}});
        fireEvent.click(screen.getAllByRole('button', {name: 'Vložit'})[0]);

        expect(onCoordinatesSubmitted).toHaveBeenCalledWith(49.5, 18.25);
    });

    it('GPS input strpí i DMS – parser je společný', () => {
        const onCoordinatesSubmitted = vi.fn();
        render(<RecordLocation record={makeRecord()} canEdit onCoordinatesSubmitted={onCoordinatesSubmitted}/>);

        fireEvent.change(gpsInput(), {target: {value: '49.5; 18.25'}});
        fireEvent.keyDown(gpsInput(), {key: 'Enter', code: 'Enter'});

        expect(onCoordinatesSubmitted).toHaveBeenCalledWith(49.5, 18.25);
    });

    it('neplatný vstup hlásí chybu a nic nepošle', () => {
        const onCoordinatesSubmitted = vi.fn();
        render(<RecordLocation record={makeRecord()} canEdit onCoordinatesSubmitted={onCoordinatesSubmitted}/>);

        fireEvent.change(gpsInput(), {target: {value: 'hocus pocus'}});
        fireEvent.click(screen.getAllByRole('button', {name: 'Vložit'})[0]);

        expect(onCoordinatesSubmitted).not.toHaveBeenCalled();
        expect(gpsInput()).toHaveClass('is-invalid');
    });

    it('bez práva pole nejsou a je vidět jen pomlčka', () => {
        render(<RecordLocation record={makeRecord()} canEdit={false} onCoordinatesSubmitted={vi.fn()}/>);

        expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    });

    it('po návrhu se obě pole přepíšou novou pozicí', () => {
        render(
            <RecordLocation
                record={makeRecord()}
                canEdit
                onCoordinatesSubmitted={vi.fn()}
                proposedLocation={{coordinates: [50.6410833, 14.4575556], geocodeData: {}}}
            />,
        );

        expect(screen.queryAllByRole('textbox')).toHaveLength(0);
        expect(screen.getAllByText(/50° 38' 27.90" N/).length).toBeGreaterThan(0);
    });
});
