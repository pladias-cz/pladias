import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {LayerSwitcher} from "./LayerSwitcher";
import {useLayerStore} from "../store/layerStore";
import {saveUserSetting} from "@/services/settingsApi";
import "@/i18n/i18n";

/**
 * Testy přepínače vrstev: sbalený zabírá jen ikonku, panel se stromem skupin
 * se rozbalí při hoveru/kliknutí a po opuštění myší zase sbalí; zaškrtnutí
 * vrstvy zvýrazní řádek i celou skupinu (obdoba ExportTraitList) a uloží se
 * do uživatelských nastavení. Vitest bez globals: true nespouští auto-cleanup,
 * proto ručně. Prvky uvnitř rozbaleného panelu se klikají přes fireEvent –
 * user-event při přesunu kurzoru dispatchne mouseout bez relatedTarget, čímž
 * React vyvolá falešný onMouseLeave na kontejneru a panel by se sbalil
 * (v reálném prohlížeči k tomu nedochází).
 *
 * `@/services/settingsApi` je mocknuté, aby běžel skutečný useLayerManager
 * (správa vrstev, ukládání viditelnosti) bez síťových volání.
 */

vi.mock("@/services/settingsApi", () => ({
    getUserSetting: vi.fn(async () => null),
    saveUserSetting: vi.fn(async (_key: string, value: string) => value),
    resetUserSettings: vi.fn(async () => undefined),
    isBooleanSetting: vi.fn(() => false),
    mapBackendKeyToStateKey: vi.fn((key: string) => key),
}));

/** Každý test vlastní mapName – zustand store je globální a sdílí stav mezi testy. */
let mapSeq = 0;

function renderSwitcher() {
    mapSeq += 1;
    return render(
        <LayerSwitcher
            mapName={`test-map-${mapSeq}`}
            layerIds={["osm", "opentopo", "technical_quadrants"]}
            defaultVisibility={{osm: true, technical_quadrants: false}}
        />,
    );
}

afterEach(() => cleanup());

describe("LayerSwitcher", () => {
    it("je sbalený – viditelná jen ikonka, panel není ve DOM", () => {
        renderSwitcher();
        const toggle = screen.getByRole("button", {name: "Vrstvy mapy"});
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("checkbox")).toBeNull();
        expect(screen.queryByRole("radio")).toBeNull();
    });

    it("rozbalí se při hoveru a sbalí po odjetí myší", async () => {
        const user = userEvent.setup();
        renderSwitcher();
        const toggle = screen.getByRole("button", {name: "Vrstvy mapy"});

        await user.hover(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        // skupiny i s radio (Base Maps) i checkbox (General) vrstvami
        expect(screen.getByRole("button", {name: "Base Maps"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "General"})).toBeInTheDocument();

        await user.unhover(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("button", {name: "Base Maps"})).toBeNull();
    });

    it("rozbalí se i kliknutím na ikonku (cesta pro dotyková zařízení)", async () => {
        const user = userEvent.setup();
        renderSwitcher();
        await user.click(screen.getByRole("button", {name: "Vrstvy mapy"}));
        expect(screen.getByRole("button", {name: "Base Maps"})).toBeInTheDocument();
    });

    it("zaškrtnutí vrstvy zvýrazní skupinu a uloží viditelnost", async () => {
        const user = userEvent.setup();
        renderSwitcher();
        await user.click(screen.getByRole("button", {name: "Vrstvy mapy"}));

        // skupiny jsou defaultně sbalené – nejprve rozbalit General
        const generalHeader = screen.getByRole("button", {name: "General"});
        expect(generalHeader).not.toHaveClass("layer-switcher__group-header--selected");

        // Prvky uvnitř panelu klikáme přes fireEvent: user-event při přesunu
        // kurzoru (ikonka → panel) dispatchne mouseout bez relatedTarget, takže
        // React vyvolá onMouseLeave na kontejneru a panel se mezitím sbalí.
        // V reálném prohlížeči se na společném předkovi mouseleave nespustí.
        fireEvent.click(generalHeader);

        const grid = screen.getByRole("checkbox", {name: "Grid (quadrants)"});
        fireEvent.click(grid);

        expect(grid).toBeChecked();
        // řádek i hlavička skupiny jsou zvýrazněné zelenou (obdoba ExportTraitList)
        expect(grid.closest(".layer-switcher__layer")).toHaveClass("layer-switcher__layer--selected");
        expect(generalHeader).toHaveClass("layer-switcher__group-header--selected");
        // viditelnost se hned ukládá do uživatelských nastavení
        await waitFor(() => expect(saveUserSetting).toHaveBeenCalled());
    });

    it("radio skupina Base Maps přepíná právě jednu vrstvu", async () => {
        const user = userEvent.setup();
        renderSwitcher();
        await user.click(screen.getByRole("button", {name: "Vrstvy mapy"}));

        // rozbalit Base Maps a přepnout podklad (fireEvent – viz komentář výše)
        fireEvent.click(screen.getByRole("button", {name: "Base Maps"}));
        const osm = screen.getByRole("radio", {name: "OpenStreetMap"});
        const opentopo = screen.getByRole("radio", {name: "OpenTopoMap"});
        fireEvent.click(opentopo);

        expect(opentopo).toBeChecked();
        expect(osm).not.toBeChecked();
    });

    it("dynamická projektová vrstva ukáže „Projekt“ + název projektu místo ID", async () => {
        const user = userEvent.setup();
        mapSeq += 1;
        const mapName = `test-map-${mapSeq}`;
        render(
            <LayerSwitcher
                mapName={mapName}
                layerIds={["osm", "project_22"]}
            />,
        );

        await user.click(screen.getByRole("button", {name: "Vrstvy mapy"}));
        fireEvent.click(screen.getByRole("button", {name: "Projects"}));

        // před registrací vrstvy ve store je vidět jen fallback „Projekt“ + ID
        expect(screen.getByRole("checkbox", {name: "Projekt 22"})).toBeInTheDocument();

        // useProjectLayers zaregistruje vrstvu se skutečným titulkem (název +
        // počet záznamů) až asynchronně v effectu – bez změny layerIds se musí
        // titulek v panelu aktualizovat (regrese: dříve zůstalo „Project 22“)
        useLayerStore.getState().addLayer(mapName, "project_22", {title: "Testovací projekt (7)"});

        await waitFor(() =>
            expect(screen.getByRole("checkbox", {name: "Projekt Testovací projekt (7)"})).toBeInTheDocument(),
        );
        expect(screen.queryByRole("checkbox", {name: "Projekt 22"})).toBeNull();
    });
});
