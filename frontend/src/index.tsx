import ReactDOM from 'react-dom/client';
import {QueryClientProvider} from '@tanstack/react-query';
// Vendor styly na jediném místě – vstupním bodu (sekce M). Pořadí importů = pořadí
// kaskády: framework (Bootstrap, ikony, Typeahead, Leaflet) nejdřív, aplikace
// (global.scss) poslední, takže její pravidla přebíjejí vendor defaults.
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'leaflet/dist/leaflet.css';
import './i18n/i18n';
import './styles/global.scss';
import App from './App';
import {createQueryClient} from './query/queryClient';
import {installGlobalErrorHandlers} from './services/logger';

const root = document.getElementById('react-app');

if (root) {
    // Nezachycené výjimky a odmítnuté promisy logovat centrálně (sekce F).
    installGlobalErrorHandlers();
    const queryClient = createQueryClient();

    ReactDOM.createRoot(root).render(
        <QueryClientProvider client={queryClient}>
            <App/>
        </QueryClientProvider>,
    );
}