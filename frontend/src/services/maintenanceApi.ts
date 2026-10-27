/**
 * Doména Maintenance (controllers.common.MaintenanceController) – zprávy heartbeatu
 * (tabulka public.maintenance) spravované sysAdminem v `/system/texts`. Komponenta
 * nezná URL ani tvar požadavku.
 *
 * Záměrně bez editace: zpráva se nahrazuje smazáním starého řádku a vytvořením
 * nového. Heartbeat i login stránka zobrazují jen první řádek tabulky.
 */

import {apiDelete, apiGet, apiPost, requireData, requireEnvelope} from './apiClient';
import type {MaintenanceMessage} from '@/models/MaintenanceMessage';

/** GET /api/react/maintenance/all – všechny zprávy (sysAdmin editor). */
export async function getMaintenanceMessages(): Promise<MaintenanceMessage[]> {
    return requireData<MaintenanceMessage[]>(
        await apiGet('/api/react/maintenance/all'),
        'Načtení zpráv selhalo.',
    );
}

/** POST /api/react/maintenance – vytvoření nové zprávy {type, text}. */
export async function createMaintenanceMessage(input: {type: string; text: string}): Promise<void> {
    requireEnvelope(
        await apiPost('/api/react/maintenance', input),
        'Uložení zprávy selhalo.',
    );
}

/** DELETE /api/react/maintenance/:id – smazání zprávy. */
export async function deleteMaintenanceMessage(id: number): Promise<void> {
    requireEnvelope(
        await apiDelete(`/api/react/maintenance/${id}`),
        'Smazání zprávy selhalo.',
    );
}
