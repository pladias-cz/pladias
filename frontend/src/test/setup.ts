import '@testing-library/jest-dom/vitest';
import {resetLogger} from '@/services/logger';

// Logger v testech tichý: resetLogger odebere konzolový transport, takže
// logError/logWarn/logInfo nic nepíší do výstupu testů. Testy asertují přes
// getRecentLogEntries() nebo si v beforeEach registrují vlastní transport
// (services/logger.test.ts, httpLogTransport.test.ts).
resetLogger();

// jsdom neimplementuje window.matchMedia (react-bootstrap ho volá v Offcanvas
// kvůli breakpointům přes @restart/hooks useMediaQuery) – stub vrací pro každý
// dotaz „neodpovídá“ a posluchače ignoruje.
if (!window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    });
}

// jsdom neimplementuje Element.scrollIntoView (PladiasRecordsTable scrolluje na
// řádek po kliku na lokalitu) – testy klikající na řádek tabulky by jinak padaly.
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
}

// jsdom neimplementuje ResizeObserver (recharts ResponsiveContainer v dashboardu
// výsledků podle něj mění velikost grafů) – v testech se grafy nevykreslí, ale
// komponenta nesmí padat.
if (!window.ResizeObserver) {
    window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
}
