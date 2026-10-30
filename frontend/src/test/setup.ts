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