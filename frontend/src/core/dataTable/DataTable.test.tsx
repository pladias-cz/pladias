/**
 * Testy jádrové komponenty DataTable:
 * render sloupců všech typů, filter row, řazení, paginace,
 * optimistic update checkboxů přes onToggle/onRowUpdate
 * a refetch aktuální stránky přes refreshKey.
 *
 * Data se podávají výhradně přes custom fetcher (bez síťových volání).
 */

import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {QueryClientProvider} from "@tanstack/react-query";
import {DataTable} from "./DataTable";
import {withQueryClient} from "@/test/withQueryClient";
import {createQueryClient} from "@/query/queryClient";
import type {DataTableColumnDef} from "./types";
import "@/i18n/i18n";

interface TestRow {
    id: number;
    name: string;
    category: string;
    active: boolean;
    count: number;
    createdAt: string;
    published: boolean;
}

const rows: TestRow[] = [
    {
        id: 1,
        name: "Vřesovec pleterný",
        category: "a",
        active: true,
        count: 1234.5,
        createdAt: "2026-10-21T10:30:00",
        published: false,
    },
    {
        id: 2,
        name: "Bělomech sivý",
        category: "b",
        active: false,
        count: 7,
        createdAt: "2026-01-02T08:15:00",
        published: true,
    },
];

function makeColumns(onToggle: (row: TestRow, checked: boolean) => Promise<void>): DataTableColumnDef<TestRow>[] {
    return [
        {
            type: "text",
            id: "name",
            accessor: "name",
            header: "Název",
            filterPlaceholder: "Filtr názvu",
        },
        {
            type: "text",
            id: "category",
            accessor: "category",
            header: "Kategorie",
            filterOptions: [
                {value: "a", label: "Typ A"},
                {value: "b", label: "Typ B"},
            ],
        },
        {
            type: "boolean",
            id: "active",
            accessor: "active",
            header: "Aktivní",
            trueLabel: "Aktivní: ano",
            falseLabel: "Aktivní: ne",
        },
        {
            type: "number",
            id: "count",
            accessor: "count",
            header: "Počet",
            formatOptions: {maximumFractionDigits: 0},
        },
        {
            type: "timestamp",
            id: "createdAt",
            accessor: "createdAt",
            header: "Vytvořeno",
        },
        {
            type: "action",
            id: "actions",
            header: "Akce",
            cellRenderer: (row: TestRow) => <button type="button">Detail {row.id}</button>,
        },
        {
            type: "checkbox",
            id: "published",
            accessor: "published",
            header: "Publikováno",
            onToggle,
        },
    ];
}

const paginationList = () => document.querySelector("ul.pagination") as HTMLElement;

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("DataTable", () => {
    it("vykreslí hlavičky, buňky všech typů sloupců a požádá fetcher o první stránku", async () => {
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 2}));
        render(withQueryClient(<DataTable endpoint="/test" columns={makeColumns(vi.fn(async () => undefined))} fetchData={fetcher}/>));

        expect(await screen.findByText("Vřesovec pleterný")).toBeInTheDocument();
        expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({
            page: 1,
            pageSize: 20,
            sorting: [],
            columnFilters: [],
        }));

        // hlavičky všech sloupců
        for (const header of ["Název", "Kategorie", "Aktivní", "Počet", "Vytvořeno", "Akce", "Publikováno"]) {
            expect(screen.getByText(header)).toBeInTheDocument();
        }

        // textové buňky
        expect(screen.getByText("Bělomech sivý")).toBeInTheDocument();

        // boolean s vlastními popisky
        expect(screen.getByText("Aktivní: ano")).toBeInTheDocument();
        expect(screen.getByText("Aktivní: ne")).toBeInTheDocument();

        // číselná buňka s formatOptions (cs locale, zaokrouhleno na celá čísla);
        // Intl vrací oddělovač U+00A0, DOM query normalizuje mezery → NFKC
        const formattedCount = new Intl.NumberFormat("cs", {maximumFractionDigits: 0}).format(1234.5);
        expect(screen.getByText(formattedCount.normalize("NFKC"))).toBeInTheDocument();
        expect(screen.getByText("7")).toBeInTheDocument();

        // timestamp ve formátu cs-CZ: "21. 10. 2026 10:30"
        expect(screen.getByText(/21\.\s*10\.\s*2026/)).toBeInTheDocument();
        expect(screen.getByText(/10:30/)).toBeInTheDocument();

        // action sloupec s vlastním renderem
        expect(screen.getByRole("button", {name: "Detail 1"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Detail 2"})).toBeInTheDocument();

        // checkboxy podle hodnoty pole
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes).toHaveLength(2);
        expect(checkboxes[0]).not.toBeChecked();
        expect(checkboxes[1]).toBeChecked();

        // rozsah řádků
        expect(screen.getByText("Zobrazeno od 1 do 2 z 2 řádků celkem")).toBeInTheDocument();
    });

    it("zobrazí spinner během načítání a prázdný stav, když fetcher nevrátí data", async () => {
        let resolveFetch!: (value: {data: TestRow[]; totalCount: number}) => void;
        const fetcher = vi.fn(() => new Promise<{data: TestRow[]; totalCount: number}>((resolve) => {
            resolveFetch = resolve;
        }));
        render(withQueryClient(<DataTable endpoint="/test" columns={makeColumns(vi.fn(async () => undefined))} fetchData={fetcher}/>));

        expect(screen.getByRole("status")).toBeInTheDocument();

        await act(async () => {
            resolveFetch({data: [], totalCount: 0});
        });
        expect(await screen.findByText("Nebyly nalezeny žádné údaje")).toBeInTheDocument();
    });

    it("odešle textový filtr, resetuje stránku na 1 a nabídne vymazání filtrů", async () => {
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 45}));
        render(withQueryClient(<DataTable endpoint="/test" columns={makeColumns(vi.fn(async () => undefined))} fetchData={fetcher}/>));

        expect(await screen.findByText("Vřesovec pleterný")).toBeInTheDocument();
        expect(screen.queryByText("Vymazat filtry")).not.toBeInTheDocument();

        // přechod na stránku 2 (totalPages se dosynchronizují v effectu → čekat na item)
        fireEvent.click(await within(paginationList()).findByText("2"));
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({page: 2}));
        });

        // filtr resetuje stránku na 1
        fireEvent.change(screen.getByPlaceholderText("Filtr názvu"), {target: {value: "vřes"}});
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({
                page: 1,
                columnFilters: [{id: "name", value: "vřes"}],
            }));
        });

        // vymazání filtrů vrátí prázdný filtr
        fireEvent.click(screen.getByText("Vymazat filtry"));
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({columnFilters: []}));
        });
    });

    it("boolean filtr i textový sloupec s filterOptions se renderují jako select", async () => {
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 2}));
        render(withQueryClient(<DataTable endpoint="/test" columns={makeColumns(vi.fn(async () => undefined))} fetchData={fetcher}/>));

        expect(await screen.findByText("Vřesovec pleterný")).toBeInTheDocument();

        // boolean i checkbox sloupec mají ve filter row Ano/Ne selecty;
        // [0] patří sloupci "active" (dřív v pořadí sloupců než "published")
        const booleanSelect = screen.getAllByRole("option", {name: "Ne"})[0].closest("select") as HTMLSelectElement;
        fireEvent.change(booleanSelect, {target: {value: "true"}});
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({
                columnFilters: expect.arrayContaining([{id: "active", value: "true"}]),
            }));
        });

        const categorySelect = screen.getByRole("option", {name: "Typ A"}).closest("select") as HTMLSelectElement;
        fireEvent.change(categorySelect, {target: {value: "b"}});
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({
                columnFilters: expect.arrayContaining([{id: "category", value: "b"}]),
            }));
        });
    });

    it("řazení přepíná vzestupně → sestupně → zrušeno a vždy refetchne", async () => {
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 2}));
        render(withQueryClient(<DataTable endpoint="/test" columns={makeColumns(vi.fn(async () => undefined))} fetchData={fetcher}/>));

        expect(await screen.findByText("Vřesovec pleterný")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Název").closest("th") as HTMLElement);
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({sorting: [{id: "name", desc: false}]}));
        });

        fireEvent.click(screen.getByText("Název 🔼").closest("th") as HTMLElement);
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({sorting: [{id: "name", desc: true}]}));
        });

        fireEvent.click(screen.getByText("Název 🔽").closest("th") as HTMLElement);
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({sorting: []}));
        });
    });

    it("paginace mění stránku i velikost stránky a přepočítává rozsah řádků", async () => {
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 45}));
        render(withQueryClient(<DataTable endpoint="/test" columns={makeColumns(vi.fn(async () => undefined))} fetchData={fetcher}/>));

        expect(await screen.findByText(/Zobrazeno od 1 do 20 z 45/)).toBeInTheDocument();

        // totalPages se dosynchronizují v effectu až po prvním renderu dat → čekat na item "3"
        fireEvent.click(await within(paginationList()).findByText("3"));
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({page: 3}));
        });
        expect(await screen.findByText(/Zobrazeno od 41 do 45 z 45/)).toBeInTheDocument();

        fireEvent.click(within(paginationList()).getByText("1"));
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({page: 1}));
        });

        // změna velikosti stránky se propaguje do dotazu
        fireEvent.change(screen.getByDisplayValue("20"), {target: {value: "10"}});
        await waitFor(() => {
            expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({pageSize: 10}));
        });
    });

    it("checkbox: optimistic update ještě před resolvenutím onToggle, pak onRowUpdate", async () => {
        let resolveToggle!: () => void;
        const togglePromise = new Promise<void>((resolve) => {
            resolveToggle = resolve;
        });
        const onToggle = vi.fn(() => togglePromise);
        const onRowUpdate = vi.fn(async () => undefined);
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 2}));
        render(
            withQueryClient(
                <DataTable
                    endpoint="/test"
                    columns={makeColumns(onToggle)}
                    fetchData={fetcher}
                    onRowUpdate={onRowUpdate}
                />
            )
        );

        const checkbox = (await screen.findAllByRole("checkbox"))[0];
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);

        // optimistic: zaškrtnuto okamžitě, dokud běží onToggle
        expect(checkbox).toBeChecked();
        expect(onToggle).toHaveBeenCalledWith(rows[0], true);
        expect(onRowUpdate).not.toHaveBeenCalled();

        await act(async () => {
            resolveToggle();
        });

        await waitFor(() => {
            expect(onRowUpdate).toHaveBeenCalledWith(rows[0], "published", true);
        });
        expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    });

    it("checkbox: rollback a chybová hláška při selhání onToggle", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const onToggle = vi.fn(async () => {
            throw new Error("Konflikt při ukládání");
        });
        const onRowUpdate = vi.fn(async () => undefined);
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 2}));
        render(
            withQueryClient(
                <DataTable
                    endpoint="/test"
                    columns={makeColumns(onToggle)}
                    fetchData={fetcher}
                    onRowUpdate={onRowUpdate}
                />
            )
        );

        const checkbox = (await screen.findAllByRole("checkbox"))[1];
        expect(checkbox).toBeChecked();

        fireEvent.click(checkbox);

        // rollback na původní hodnotu + alert s chybou
        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });
        expect(screen.getByText("Konflikt při ukládání")).toBeInTheDocument();
        expect(screen.getAllByRole("checkbox")[1]).toBeChecked();
        expect(onRowUpdate).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalled();
    });

    it("refreshKey: změna hodnoty vynutí znovunačtení stejné stránky (mutace mimo tabulku)", async () => {
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 2}));
        const columns = makeColumns(vi.fn(async () => undefined));
        // jeden klient pro oba rendery – rerender nesmí rozbít cache, jinak by se
        // fetch spustil kvůli novému klientovi, ne kvůli refreshKey
        const client = createQueryClient();
        const renderWithKey = (key: number) => (
            <QueryClientProvider client={client}>
                <DataTable endpoint="/test" columns={columns} fetchData={fetcher} refreshKey={key}/>
            </QueryClientProvider>
        );
        const {rerender} = render(renderWithKey(0));

        // mount: právě jedno načtení první stránky
        expect(await screen.findByText("Vřesovec pleterný")).toBeInTheDocument();
        expect(fetcher).toHaveBeenCalledTimes(1);

        // změna klíče = refetch stejné stránky (přesně jedno další zavolání)
        rerender(renderWithKey(1));
        await waitFor(() => {
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
        expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({page: 1}));

        // beze změny klíče se už nic nenačítá
        rerender(renderWithKey(1));
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
        });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("checkbox: řádky bez id – optimistic flip přepne jen kliknutý řádek", async () => {
        // Regrese: řádky bez pole `id` (identita undefined) nesmí fallback na id
        // nic matchnout (undefined === undefined) – kdysi se přepnuly všechny
        // checkboxy tabulky najednou.
        const noIdRows = [
            {taxonId: 101, name: "Vřesovec pleterný", published: false},
            {taxonId: 102, name: "Bělomech sivý", published: false},
        ];
        const onToggle = vi.fn(async () => undefined);
        const columns: DataTableColumnDef<(typeof noIdRows)[number]>[] = [
            {type: "text", id: "name", accessor: "name", header: "Název"},
            {type: "checkbox", id: "published", accessor: "published", header: "Publikováno", onToggle},
        ];
        const fetcher = vi.fn(async () => ({data: noIdRows, totalCount: 2}));
        render(
            withQueryClient(
                <DataTable endpoint="/test" columns={columns} fetchData={fetcher}/>
            )
        );

        const checkbox = (await screen.findAllByRole("checkbox"))[0];
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);

        // přepne se jen kliknutý řádek, druhý zůstává nedotčený
        expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
        expect(screen.getAllByRole("checkbox")[1]).not.toBeChecked();
        expect(onToggle).toHaveBeenCalledWith(noIdRows[0], true);
    });

    it("refreshKey: po refetchi se zahodí optimistická vrstva i při nezměněných datech", async () => {
        const onToggle = vi.fn(async () => undefined);
        const fetcher = vi.fn(async () => ({data: rows, totalCount: 2}));
        const columns = makeColumns(onToggle);
        // jeden klient pro oba rendery – refetch vrací tatáž data (structural
        // sharing zachová referenci queryData), optimistic vrstva musí padnout
        const client = createQueryClient();
        const renderWithKey = (key: number) => (
            <QueryClientProvider client={client}>
                <DataTable endpoint="/test" columns={columns} fetchData={fetcher} refreshKey={key}/>
            </QueryClientProvider>
        );
        const {rerender} = render(renderWithKey(0));

        const checkbox = (await screen.findAllByRole("checkbox"))[0];
        expect(checkbox).not.toBeChecked();

        // optimistický flip (onToggle resolve, refetch zatím neproběhl)
        fireEvent.click(checkbox);
        await waitFor(() => {
            expect(onToggle).toHaveBeenCalledWith(rows[0], true);
        });
        expect(screen.getAllByRole("checkbox")[0]).toBeChecked();

        // refreshKey refetchne tutáž data – optimistická vrstva se zahodí
        // a checkbox hlásí pravdu serveru
        rerender(renderWithKey(1));
        await waitFor(() => {
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
        await waitFor(() => {
            expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
        });
    });
});
