import React, {useCallback, useEffect, useRef} from "react";
import {useTranslation} from "react-i18next";
import {instanceMessageKey, type InstanceMessage} from "@/models/InstanceMessage";
import {useNotifications, type NotificationInput} from "@/stores/notificationStore";

/**
 * Globální zprávy o stavu instance (údržba apod.) jako Toasty (sekce A + F).
 *
 * Nic nevykresluje – synchronizuje zprávy do notifikačního store
 * (`<Toasts />` vpravo dole) místo trvalého banneru nahoře. Toast se objeví:
 *  i) při prvním načtení (mount → první data heartbeatu),
 *  ii) po návratu do dříve neaktivní záložky (zavře dosavadní Toasty a znovu
 *      zobrazí aktuální zprávy – skrytá záložka nepolluje a Toasty mezitím
 *      mohly samy zmizet),
 *  iii) při změně obsahu (nové zprávy přibudou, zrušené se zavřou).
 *
 * Polling (visibility, backoff, 401) vlastní `hooks/useInstanceMessages` –
 * tady není žádný fetch ani interval.
 */

/** Klíč pseudo-zprávy o nedostupnosti heartbeatu (není součástí messages). */
const UNAVAILABLE_KEY = "instanceMessages:unavailable";

interface FlashMessagesProps {
    messages: InstanceMessage[];
    /** Heartbeat opakovaně selhává – zobrazí se varování o nedostupnosti zpráv. */
    unavailable?: boolean;
}

const FlashMessages: React.FC<FlashMessagesProps> = ({messages, unavailable = false}) => {
    const {t} = useTranslation();
    const {push, dismiss} = useNotifications();
    /** Toasty otevřené touto komponentou (klíč zprávy → id v notifikačním store). */
    const shownRef = useRef(new Map<string, number>());

    /** Zobrazený Toasty přiblíží aktuálním zprávám: nové přidá, zrušené zavře. */
    const sync = useCallback(() => {
        const desired = new Map<string, NotificationInput>();
        for (const message of messages) {
            desired.set(instanceMessageKey(message), {type: message.type, message: message.text});
        }
        if (unavailable) {
            desired.set(UNAVAILABLE_KEY, {
                type: "warning",
                message: t("common.instanceMessages.unavailable"),
            });
        }

        for (const [key, id] of shownRef.current) {
            if (!desired.has(key)) {
                dismiss(id);
                shownRef.current.delete(key);
            }
        }
        for (const [key, input] of desired) {
            if (!shownRef.current.has(key)) {
                shownRef.current.set(key, push(input));
            }
        }
    }, [messages, unavailable, t, push, dismiss]);

    // i) první načtení, iii) změna obsahu – při nezměněných datech drží
    // structural sharing v react-query referenci pole (efekt se nespustí).
    useEffect(() => {
        sync();
    }, [sync]);

    // ii) návrat do záložky – dosavadní Toasty zavře (danger drží, bez toho
    // by se při opakovaném přepínání záložek hromadily duplicity) a aktuální
    // zprávy zobrazí znovu.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== "visible") {
                return;
            }
            shownRef.current.forEach((id) => dismiss(id));
            shownRef.current.clear();
            sync();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [sync, dismiss]);

    return null;
};

export default FlashMessages;