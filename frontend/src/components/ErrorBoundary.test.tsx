import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import ErrorBoundary from "./ErrorBoundary";
import "@/i18n/i18n";

/**
 * Testy globální error boundary (docs/refactoring.md, sekce G): chyba renderu
 * zobrazí fallback UI s obnovením místo bílé stránky.
 */

const Thrower = (): never => {
    throw new Error("boom");
};

// Vitest bez globals: true nespouští auto-cleanup, proto ručně.
afterEach(cleanup);

describe("ErrorBoundary", () => {
    it("renders fallback UI with reload button instead of crashing the tree", () => {
        // React na chybu renderu sám loguje do console.error – v testu ticho
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const reload = vi.fn();
        Object.defineProperty(window, "location", {
            configurable: true,
            value: {reload, href: "http://localhost/"},
        });

        render(
            <ErrorBoundary>
                <Thrower/>
            </ErrorBoundary>,
        );

        // Alert.Heading renderuje div.alert-heading, ne heading – hledáme text
        expect(screen.getByText("Došlo k neočekávané chybě")).toBeInTheDocument();
        const reloadButton = screen.getByRole("button", {name: "Obnovit stránku"});
        fireEvent.click(reloadButton);
        expect(reload).toHaveBeenCalledTimes(1);

        consoleError.mockRestore();
    });

    it("logs the error and component stack for developers", () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        Object.defineProperty(window, "location", {
            configurable: true,
            value: {reload: vi.fn(), href: "http://localhost/"},
        });

        render(
            <ErrorBoundary>
                <Thrower/>
            </ErrorBoundary>,
        );

        expect(consoleError).toHaveBeenCalled();
        // Reakce Reactu i naše boundary logují – hledáme záznam z componentDidCatch
        const logged = consoleError.mock.calls
            .map((call) => String(call[0]))
            .some((message) => message.includes("ErrorBoundary"));
        expect(logged).toBe(true);

        consoleError.mockRestore();
    });

    it("renders children when nothing throws", () => {
        render(
            <ErrorBoundary>
                <p>Obsah stránky</p>
            </ErrorBoundary>,
        );

        expect(screen.getByText("Obsah stránky")).toBeInTheDocument();
    });
});
