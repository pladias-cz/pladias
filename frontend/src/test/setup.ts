import '@testing-library/jest-dom/vitest';
import {resetLogger} from '@/services/logger';

// Logger v testech tichý: resetLogger odebere konzolový transport, takže
// logError/logWarn/logInfo nic nepíší do výstupu testů. Testy asertují přes
// getRecentLogEntries() nebo si v beforeEach registrují vlastní transport
// (services/logger.test.ts, httpLogTransport.test.ts).
resetLogger();