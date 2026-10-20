import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import Toasts from "./Toasts";
import {useNotificationStore} from "@/stores/notificationStore";
import "@/i18n/i18n";

/**
 * Testy výstupu notifikačního store: textové
 * i rich-text (RichTextMessage) hlášky, zavření tlačítkem a prázdný stav.
 * Vitest bez globals: true nespouští auto-cleanup, proto ručně.
 */

afterEach(() => {
    cleanup();
    useNotificationStore.getState().clear();
});

describe("Toasts", () => {
    it("renders nothing when the store is empty", () => {
        const {container} = render(<Toasts/>);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders message notifications", () => {
        useNotificationStore.getState().push({type: "success", message: "Uloženo"});
        render(<Toasts/>);

        expect(screen.getByText("Uloženo")).toBeInTheDocument();
    });

    it("renders rich-text notifications via RichTextMessage", () => {
        useNotificationStore.getState().push({type: "danger", html: "<strong>Něco se pokazilo</strong>"});
        render(<Toasts/>);

        expect(screen.getByText("Něco se pokazilo").tagName).toBe("STRONG");
    });

    it("dismisses a notification via the close button", () => {
        useNotificationStore.getState().push({type: "danger", message: "Chyba"});
        render(<Toasts/>);

        fireEvent.click(screen.getByRole("button", {name: "Zavřít"}));

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
        expect(screen.queryByText("Chyba")).not.toBeInTheDocument();
    });
});