import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import ErrorBoundary from "./ErrorBoundary";
import {getRecentLogEntries, resetLogger} from "@/services/logger";
import "@/i18n/i18n";

/**
 * Testy globální error boundary: chyba renderu
 * zobrazí fallback UI s obnovením místo bílé stránky.
 */

const Thrower = (): never => {
    throw new Error("boom");
};

// Vitest bez globals: true nespouští auto-cleanup, proto ručně (logger se
// resetuje kvůli asercím přes getRecentLogEntries).
afterEach(() => {
    cleanup();
    resetLogger();
});

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

        // componentDidCatch → centrální log s componentStackem (sekce F);
        // React sám loguje do console.error, proto spy výše drží test tichý
        const logged = getRecentLogEntries();
        expect(logged).toHaveLength(1);
        expect(logged[0]).toMatchObject({message: "boom", context: {source: "errorBoundary"}});
        expect(logged[0].context?.componentStack).toEqual(expect.any(String));

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
