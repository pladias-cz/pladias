import {Alert} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import RichTextMessage from "./RichTextMessage";
import {useNotificationStore} from "@/stores/notificationStore";

/**
 * Prezentační výstup globálního notifikačního store (docs/refactoring.md, sekce F).
 * Stack dismissible Alertů vpravo dole – mimo ErrorBoundary (přežije pád stránky)
 * a mimo obsah route (přežije navigaci). Timeouty drží store: success/info/warning
 * mizí samy, danger zůstává, dokud ho uživatel nezavře. Rich-text (`html`) z
 * backendu vykresluje RichTextMessage – jediné místo s přímým vkládáním HTML.
 */

function Toasts() {
    const notifications = useNotificationStore((state) => state.notifications);
    const dismiss = useNotificationStore((state) => state.dismiss);
    const {t} = useTranslation();

    if (notifications.length === 0) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            className="position-fixed bottom-0 end-0 p-3"
            style={{zIndex: 1080, maxWidth: 380, width: "100%"}}
        >
            {notifications.map((notification) => (
                <Alert
                    key={notification.id}
                    variant={notification.type}
                    dismissible
                    closeLabel={t("common.close")}
                    onClose={() => dismiss(notification.id)}
                >
                    {notification.html
                        ? <RichTextMessage html={notification.html}/>
                        : notification.message}
                </Alert>
            ))}
        </div>
    );
}

export default Toasts;