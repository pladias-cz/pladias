/**
 * Testy potvrzovacího flow hromadných úprav (F.3 z refactor.md) na sekci
 * semaforu: validace bez výběru, zrušení dialogu, potvrzení a proběhnutí
 * dávky (načtení kandidátů + PATCH per záznam + souhrn + onBulkEditComplete).
 *
 * Fetch se stubuje přes vi.stubGlobal (vzor apiClient.test.ts), překlady
 * reálné (i18n), Link potřebuje MemoryRouter.
 */
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeEach, describe, expect, it, vi, type Mock} from "vitest";
import BulkEdit from "./BulkEdit";
import type {RecordPladias} from "@/models";
import "@/i18n/i18n";

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });

const makeRecord = (id: number): RecordPladias =>
    ({id, taxonOriginal: `Taxon ${id}`}) as unknown as RecordPladias;

const EDIT_TIMESTAMPS_URL = "/api/react/atlas/search/records-edit-timestamps";

let fetchMock: ReturnType<typeof vi.fn>;
let onBulkEditComplete: Mock<() => void>;

const callsTo = (urlPart: string) =>
    fetchMock.mock.calls.filter(([url]) => String(url).includes(urlPart));

function renderBulkEdit() {
    return render(
        <MemoryRouter>
            <BulkEdit
                records={[makeRecord(1), makeRecord(2)]}
                searchPayloadEntries={[["taxon", "Carex"]]}
                onBulkEditComplete={onBulkEditComplete}
            />
        </MemoryRouter>,
    );
}

/** Otevře accordion sekci semaforu (controlled Accordion, item 10). */
const openSemaforSection = () => {
    fireEvent.click(screen.getByText("Změna semaforu"));
};

beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        if (url.includes(EDIT_TIMESTAMPS_URL)) {
            return Promise.resolve(jsonResponse({
                success: true,
                data: [
                    {id: 1, edit_timestamp: 100},
                    {id: 2, edit_timestamp: 101},
                ],
            }));
        }
        if (url.includes("/unassignedAuthors")) {
            return Promise.resolve(jsonResponse({success: true, data: []}));
        }
        if (url.includes("/api/react/atlas/common/phytochorions")) {
            return Promise.resolve(jsonResponse({success: true, data: []}));
        }
        return Promise.resolve(jsonResponse({success: true}));
    });
    vi.stubGlobal("fetch", fetchMock);
    onBulkEditComplete = vi.fn();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
});

describe("BulkEdit – potvrzovací flow (F.3)", () => {
    it("zobrazí chybu a nic neodešle, když není vybraný semafor", async () => {
        renderBulkEdit();
        openSemaforSection();

        fireEvent.click(screen.getByRole("button", {name: "Změnit semafor"}));

        expect(await screen.findByText("Vyberte nový semafor.")).toBeVisible();
        expect(callsTo(EDIT_TIMESTAMPS_URL)).toHaveLength(0);
        expect(onBulkEditComplete).not.toHaveBeenCalled();
    });

    it("zrušení potvrzovacího dialogu nespustí dávku", async () => {
        renderBulkEdit();
        openSemaforSection();

        fireEvent.change(screen.getByDisplayValue("Vyberte nový stav..."), {target: {value: "3"}});
        fireEvent.click(screen.getByRole("button", {name: "Změnit semafor"}));

        const confirmMessage = "Opravdu chcete změnit semafor pro všechny vybrané záznamy?";
        expect(await screen.findByText(confirmMessage)).toBeVisible();

        fireEvent.click(screen.getByRole("button", {name: "Zrušit"}));

        await waitFor(() => {
            expect(screen.queryByText(confirmMessage)).not.toBeInTheDocument();
        });
        expect(callsTo(EDIT_TIMESTAMPS_URL)).toHaveLength(0);
        expect(onBulkEditComplete).not.toHaveBeenCalled();
    });

    it("potvrzení spustí dávku, PATCHuje všechny záznamy a zavolá onBulkEditComplete", async () => {
        renderBulkEdit();
        openSemaforSection();

        fireEvent.change(screen.getByDisplayValue("Vyberte nový stav..."), {target: {value: "3"}});
        fireEvent.click(screen.getByRole("button", {name: "Změnit semafor"}));
        fireEvent.click(await screen.findByRole("button", {name: "Ano"}));

        await waitFor(() => {
            expect(onBulkEditComplete).toHaveBeenCalledTimes(1);
        });

        expect(callsTo(EDIT_TIMESTAMPS_URL)).toHaveLength(1);
        const patchCalls = fetchMock.mock.calls.filter(([url, init]) =>
            String(url).match(/\/api\/react\/atlas\/record\/\d+$/) !== null
            && (init?.method ?? "GET") === "PATCH");
        expect(patchCalls.map(([url]) => String(url))).toEqual([
            "/api/react/atlas/record/1",
            "/api/react/atlas/record/2",
        ]);

        // zpráva dávky i rozbalitelný souhrn úspěšných ID
        expect(await screen.findByText("Akce (změna semaforu) připravena. Hotovo: 2 úspěšně, 0 neúspěšně (celkem 2).")).toBeVisible();
        expect(await screen.findByText("Úspěšně upravené záznamy (2)")).toBeVisible();
    });
});
