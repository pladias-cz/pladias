/**
 * Registr widgetů dashboardu výsledků vyhledávání – jeden záznam = jeden grafický
 * přehled (barplot). Id widgetu je zároveň klíčem agregace na backendu (pole
 * `aggregates`) i klíčem do odpovědi; výběr aktivních widgetů je perzistentní
 * user setting (useDashboardWidgets). Nový přehled = záznam zde + agregace na
 * backendu (PageSearchService) + i18n titulek.
 */

export type DashboardWidgetId = 'year' | 'altitude' | 'license' | 'herbarium';

export type DashboardWidgetLayout = 'vertical' | 'horizontal';

/**
 * Zeleno-hnědá paleta kategorií filtrů – zrcadlí AdvancedSearch.scss
 * (.filter-chip--taxon/locality/origin/remarks, komentář „zeleno-hnědé tóny,
 * zvýšený kontrast"). Recharts potřebuje barvy jako hodnoty v JS (SVG atribut
 * fill neumí CSS proměnné), proto je paleta duplikovaná tady; při změně ve
 * SCSS aktualizovat i toto zrcadlo.
 */
const WIDGET_COLORS = {
    year: '#356636',
    altitude: '#5d6b2f',
    license: '#7a5a2e',
    herbarium: '#5c4a33',
} as const;

export interface DashboardWidgetDefinition {
    /** Id = klíč agregace na backendu (form.aggregates) i klíč do odpovědi. */
    id: DashboardWidgetId;
    /** Titulek karty i přepínacího tlačítka (i18n). */
    titleKey: string;
    /** Vertikální bary (timeline) vs horizontální (dlouhé kategoriální labely). */
    layout: DashboardWidgetLayout;
    /** Barva sloupců – zeleno-hnědá paleta kategorií filtrů (WIDGET_COLORS). */
    color: string;
}

export const DASHBOARD_WIDGETS: readonly DashboardWidgetDefinition[] = [
    {id: 'year', titleKey: 'atlas.advancedSearch.dashboard.widgets.year', layout: 'vertical', color: WIDGET_COLORS.year},
    {id: 'altitude', titleKey: 'atlas.advancedSearch.dashboard.widgets.altitude', layout: 'vertical', color: WIDGET_COLORS.altitude},
    {id: 'license', titleKey: 'atlas.advancedSearch.dashboard.widgets.license', layout: 'horizontal', color: WIDGET_COLORS.license},
    {id: 'herbarium', titleKey: 'atlas.advancedSearch.dashboard.widgets.herbarium', layout: 'horizontal', color: WIDGET_COLORS.herbarium},
];