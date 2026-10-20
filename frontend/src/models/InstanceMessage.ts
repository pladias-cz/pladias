/**
 * Zpráva o stavu instance (údržba apod.) – GET /api/react/infoGlobal
 * (backend `ConfigController.infoGlobal`, zdroj `MaintenanceMessageUtils.getMessage()`).
 *
 * Endpoint vrací pole bez `JsonResult` obálky – zdokumentovaná výjimka
 * (docs/gotchas.md); zapouzdřuje ji `services/instanceApi.ts`.
 */

export type InstanceMessageType = "success" | "danger" | "warning" | "info";

export interface InstanceMessage {
    type: InstanceMessageType;
    text: string;
}

const VALID_TYPES: ReadonlySet<string> = new Set(["success", "danger", "warning", "info"]);

/**
 * Tolerantní parsování odpovědi: nevalidní položky tiše zahodí (robustnost
 * heartbeatu – jedna rozbitá položka nesmí shodit celý poll).
 */
export function parseInstanceMessages(raw: unknown): InstanceMessage[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const messages: InstanceMessage[] = [];
    for (const item of raw) {
        if (typeof item !== "object" || item === null) {
            continue;
        }
        const {type, text} = item as {type?: unknown; text?: unknown};
        if (typeof type === "string" && VALID_TYPES.has(type) && typeof text === "string" && text !== "") {
            messages.push({type: type as InstanceMessageType, text});
        }
    }
    return messages;
}

/**
 * Stabilní React klíč odvozený z obsahu (ne z indexu v poli – po změně pořadí
 * zpráv nemusí docházet k remountování Alertů).
 */
export function instanceMessageKey(message: InstanceMessage): string {
    return `${message.type}:${message.text}`;
}
