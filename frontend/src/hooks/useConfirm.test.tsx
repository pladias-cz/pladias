import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {useConfirm} from "@/hooks/useConfirm";
import "@/i18n/i18n";

/**
 * Testy potvrzovacího dialogu (docs/refactoring.md, sekce G/K) – promise API
 * `useConfirm`, řešení kliknutím na Ano/Zrušit i zavřením dialogu.
 */

// Vitest bez globals: true nespouští auto-cleanup, proto ručně (jinak se DOM hromadí přes testy).
afterEach(cleanup);

function Harness({onResult}: {onResult: (confirmed: boolean) => void}) {
    const {confirm, dialog} = useConfirm();
    const [label, setLabel] = useState("idle");

    return (
        <>
            <button
                onClick={async () => {
                    setLabel("waiting");
                    onResult(await confirm({message: "Opravdu smazat?"}));
                    setLabel("done");
                }}
            >
                open
            </button>
            <span>{label}</span>
            {dialog}
        </>
    );
}

describe("useConfirm", () => {
    it("resolves true when the user confirms", async () => {
        const onResult = vi.fn();
        render(<Harness onResult={onResult}/>);

        fireEvent.click(screen.getByText("open"));
        expect(await screen.findByText("Opravdu smazat?")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Ano"}));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
        expect(screen.queryByText("Opravdu smazat?")).not.toBeInTheDocument();
    });

    it("resolves false when the user cancels", async () => {
        const onResult = vi.fn();
        render(<Harness onResult={onResult}/>);

        fireEvent.click(screen.getByText("open"));
        expect(await screen.findByText("Opravdu smazat?")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Zrušit"}));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    });

    it("resolves false when the dialog is dismissed (close button)", async () => {
        const onResult = vi.fn();
        render(<Harness onResult={onResult}/>);

        fireEvent.click(screen.getByText("open"));
        expect(await screen.findByText("Opravdu smazat?")).toBeInTheDocument();

        // tlačítko zavření (křížek) v hlavičce modalu – aria-label „Close“
        fireEvent.click(screen.getByRole("button", {name: "Close"}));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    });

    it("shows default labels and title from i18n", async () => {
        render(
            <Harness
                onResult={() => {
                    // noop
                }}
            />,
        );

        fireEvent.click(screen.getByText("open"));
        // Modal.Title renderuje div.modal-title, ne heading – hledáme text
        expect(await screen.findByText("Potvrzení akce")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Ano"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Zrušit"})).toBeInTheDocument();
    });
});
