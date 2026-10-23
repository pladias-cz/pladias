/**
 * Testy inline editace pole Preslia:
 * hlavně ochranu proti dvojitému odeslání – Enter nastaví saving=true,
 * čímž se input zablokuje a prohlížeč na něm vystřelí blur; obě události
 * musí vyvolat jediný POST (druhý by s původním timestampem selhal
 * na concurrency kontrole). Dále chování při selhání (retry)
 * a Enter/blur beze změny hodnoty.
 */

import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {PresliaInlineField} from "./PresliaInlineField";
import "@/i18n/i18n";

function renderField(onSave: (newValue: string) => Promise<void>) {
    render(<PresliaInlineField taxonId={1} value="stará" onSave={onSave} disabled={false}/>);
    fireEvent.click(screen.getByText("stará"));
    return screen.getByRole("textbox") as HTMLInputElement;
}

describe("PresliaInlineField", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("Enter během ukládání + následný blur odešle onSave jen jednou", async () => {
        let resolveSave!: () => void;
        const onSave = vi.fn(() => new Promise<void>(resolve => {
            resolveSave = resolve;
        }));

        const input = renderField(onSave);

        await act(async () => {
            fireEvent.change(input, {target: {value: "nová"}});
            fireEvent.keyDown(input, {key: "Enter"});
            // input je teď zablokovaný (saving) – prohlížeč na něm vystřelí blur
            fireEvent.blur(input);
        });

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith("nová");
        // ukládání stále běží – input zůstává zablokovaný
        expect(input.disabled).toBe(true);

        await act(async () => {
            resolveSave();
        });

        // po úspěchu se editace zavře a onSave se znovu nevolal
        await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("po selhání ukládání zobrazí chybu a umožní opakovat uložení", async () => {
        const onSave = vi.fn()
            .mockRejectedValueOnce(new Error("konflikt verzí"))
            .mockResolvedValueOnce(undefined);

        const input = renderField(onSave);

        await act(async () => {
            fireEvent.change(input, {target: {value: "nová"}});
            fireEvent.keyDown(input, {key: "Enter"});
        });

        // první pokus selhal – inline chyba, editace zůstává otevřená
        await waitFor(() => expect(screen.getByText("konflikt verzí")).toBeInTheDocument());
        expect(screen.getByRole("textbox")).toBeInTheDocument();

        // retry – tentokrát úspěšně
        await act(async () => {
            fireEvent.keyDown(screen.getByRole("textbox"), {key: "Enter"});
        });

        await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
        expect(onSave).toHaveBeenCalledTimes(2);
        expect(onSave).toHaveBeenLastCalledWith("nová");
    });

    it("Enter beze změny hodnoty neodešle onSave a zavře editaci", async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);

        const input = renderField(onSave);

        await act(async () => {
            fireEvent.keyDown(input, {key: "Enter"});
        });

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("blur beze změny hodnoty zavře editaci bez uložení", async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);

        const input = renderField(onSave);

        await act(async () => {
            fireEvent.blur(input);
        });

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.queryByRole("textbox")).toBeNull();
    });
});
