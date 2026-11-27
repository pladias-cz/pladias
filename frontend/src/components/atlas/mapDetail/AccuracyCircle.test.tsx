/**
 * Test kruhu prostorové přesnosti: poloměr se rovná přesnosti v metrech
 * (nikoli její polovině) a bez přesnosti (null/0) se kruh nekreslí.
 *
 * react-leaflet je mocknutý – v jsdom mapa jako taková neběží.
 */

import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import AccuracyCircle from './AccuracyCircle';

vi.mock('react-leaflet', () => ({
    Circle: ({radius}: {radius?: number}) => <div data-testid="accuracy-circle" data-radius={radius}/>,
}));

afterEach(cleanup);

const position = {center: [49.8, 15.5] as [number, number], strokeColor: '#000000', fillColor: '#C95740'};

describe('AccuracyCircle', () => {
    it('kreslí kruh o poloměru rovném přesnosti v metrech', () => {
        render(<AccuracyCircle {...position} precisionMeters={250}/>);

        expect(screen.getByTestId('accuracy-circle')).toHaveAttribute('data-radius', '250');
    });

    it('nekreslí kruh bez přesnosti (null ani 0)', () => {
        const {rerender} = render(<AccuracyCircle {...position} precisionMeters={null}/>);
        expect(screen.queryByTestId('accuracy-circle')).not.toBeInTheDocument();

        rerender(<AccuracyCircle {...position} precisionMeters={0}/>);
        expect(screen.queryByTestId('accuracy-circle')).not.toBeInTheDocument();
    });
});
