import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {EXTERNAL_MARKER_FILL_COLOR, RECORD_SOURCES} from './recordSources';
import {RecordSourceTabTitle} from './RecordSourceTabTitle';
import '@/i18n/i18n';

/**
 * Testy hlavičky tabu zdroje záznamů: tečka je miniaturou markeru daného zdroje
 * (šedá výplň EXTERNAL_MARKER_FILL_COLOR, okraj v barvě strokeColor zdroje),
 * dále label, počet záznamů a checkbox viditelnosti – klik na něj volá
 * onToggleVisibility se správným zdrojem.
 */

afterEach(() => cleanup());

describe('RecordSourceTabTitle', () => {
    it('tečka je miniaturou markeru: šedá výplň a okraj v barvě zdroje', () => {
        for (const source of RECORD_SOURCES) {
            const {container, unmount} = render(
                <RecordSourceTabTitle source={source} count={3} visible onToggleVisibility={vi.fn()}/>,
            );

            const dot = container.querySelector('.record-source-tab-title__dot') as HTMLElement;
            expect(dot).toHaveStyle({backgroundColor: EXTERNAL_MARKER_FILL_COLOR});
            expect(dot).toHaveStyle({borderColor: source.strokeColor});

            unmount();
        }
    });

    it('zobrazí label zdroje a počet záznamů', () => {
        render(
            <RecordSourceTabTitle source={RECORD_SOURCES[1]} count={7} visible onToggleVisibility={vi.fn()}/>,
        );

        expect(screen.getByText('GBIF')).toBeInTheDocument();
        expect(screen.getByText('(7)')).toBeInTheDocument();
    });

    it('checkbox odráží viditelnost a klik volá handler se správným zdrojem', async () => {
        const user = userEvent.setup();
        const onToggleVisibility = vi.fn();
        render(
            <RecordSourceTabTitle
                source={RECORD_SOURCES[2]}
                count={0}
                visible={false}
                onToggleVisibility={onToggleVisibility}
            />,
        );

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);
        expect(onToggleVisibility).toHaveBeenCalledTimes(1);
        expect(onToggleVisibility).toHaveBeenCalledWith('inaturalist');
    });
});
