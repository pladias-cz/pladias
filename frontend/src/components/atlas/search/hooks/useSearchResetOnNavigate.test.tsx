/**
 * Testy resetu vyhledávání po navigaci: klik na odkaz „Vyhledávání“ na už
 * otevřené stránce vyhledávání pushne novou location (nový location.key) a hook
 * na ni zavolá reset – komponenta se přitom nepřemountuje. Test zároveň ověřuje
 * chování react-routeru (BrowserRouter bez data routeru): klik na odkaz se
 * stejnou cestou vytvoří novou location, ne no-op. Re-render bez navigace reset
 * nevyvolá (callback je stabilní).
 */

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Link, MemoryRouter} from 'react-router-dom';
import {useSearchResetOnNavigate} from './useSearchResetOnNavigate';

/** Testovací komponenta – drží hook a odkaz na stejnou route (menu + stránka). */
function Harness({reset}: { reset: () => void }) {
    useSearchResetOnNavigate(reset);
    return <Link to="/atlas/search">Vyhledávání</Link>;
}

afterEach(() => cleanup());

describe('useSearchResetOnNavigate', () => {
    it('na mountu zavolá reset jednou (na čerstvém stavu neškodný no-op)', () => {
        const reset = vi.fn();
        render(<MemoryRouter initialEntries={['/atlas/search']}><Harness reset={reset}/></MemoryRouter>);

        expect(reset).toHaveBeenCalledTimes(1);
    });

    it('klik na odkaz na aktuální stránku reset zavolá znovu (nová location)', () => {
        const reset = vi.fn();
        render(<MemoryRouter initialEntries={['/atlas/search']}><Harness reset={reset}/></MemoryRouter>);

        fireEvent.click(screen.getByRole('link', {name: 'Vyhledávání'}));

        expect(reset).toHaveBeenCalledTimes(2);
    });

    it('re-render bez navigace reset nevolá znovu', () => {
        const reset = vi.fn();
        const {rerender} = render(
            <MemoryRouter initialEntries={['/atlas/search']}><Harness reset={reset}/></MemoryRouter>,
        );
        expect(reset).toHaveBeenCalledTimes(1);

        rerender(<MemoryRouter initialEntries={['/atlas/search']}><Harness reset={reset}/></MemoryRouter>);

        expect(reset).toHaveBeenCalledTimes(1);
    });
});
