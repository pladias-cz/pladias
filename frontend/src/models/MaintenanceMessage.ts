/**
 * Zpráva o údržbě instance (heartbeat) z tabulky public.maintenance –
 * `GET /api/react/maintenance/all` (backend `controllers.common.MaintenanceController`,
 * sysAdmin správa v `/system/texts`).
 *
 * Tvar sdílí typ s `InstanceMessage` (heartbeat i login stránka zprávy zobrazují
 * jako barevné alerty/toasty podle `type`).
 */

import type {InstanceMessageType} from './InstanceMessage';

export interface MaintenanceMessage {
    id: number;
    type: InstanceMessageType;
    text: string;
}
