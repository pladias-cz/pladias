import React from "react";
import {useTranslation} from "react-i18next";
import {Alert, Button} from "react-bootstrap";
import {logError} from "@/services/logger";

/**
 * Globální error boundary.
 *
 * Chytá chyby z renderu podstromu a místo bílé stránky zobrazí fallback UI
 * s tlačítkem „Obnovit stránku“. Použití:
 *  - `Layout.tsx` kolem `<Outlet/>` (obnoví se jen obsah, menu zůstane),
 *  - `App.tsx` kolem `Suspense` (rozbitý lazy chunk po deployi → reload).
 *
 * VÝJIMKA z pravidla „pouze funkční komponenty“ (docs/conventions.md) – chyby
 * renderu nelze chytat hookem, React k tomu nabízí pouze class API
 * (`getDerivedStateFromError` / `componentDidCatch`).
 */

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

/** Prezentační fallback UI – hooky (useTranslation) smí použít jen funkční komponenta. */
function ErrorBoundaryFallback({onReload}: { onReload: () => void }) {
    const {t} = useTranslation();

    return (
        <Alert variant="danger" className="text-center">
            <Alert.Heading>{t("common.errorBoundary.title")}</Alert.Heading>
            <p>{t("common.errorBoundary.message")}</p>
            <Button variant="outline-danger" onClick={onReload}>
                {t("common.errorBoundary.reload")}
            </Button>
        </Alert>
    );
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {error: null};

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {error};
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        // Vývojářská stopa do centrálního logu (sekce F); uživatelská zpětná
        // vazba je fallback UI.
        logError(error, {source: "errorBoundary", componentStack: info.componentStack});
    }

    private readonly handleReload = (): void => {
        window.location.reload();
    };

    render(): React.ReactNode {
        if (this.state.error) {
            return <ErrorBoundaryFallback onReload={this.handleReload}/>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
