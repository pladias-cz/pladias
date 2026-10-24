/**
 * Backendová obálka `JsonResult` (`utils/JsonResult.java`): `{success, data | message | error}`.
 *
 * Širší odpovědí téhle struktury také vyhoví – tabulkové endpointy přidávají
 * `totalCount`/`filteredCount` (vedle `data`), user settings přidávají `value`.
 * Indexový podpis je proto záměrně otevřený; pole mimo obálku čtou service moduly
 * (`src/services/*`), ne komponenty.
 */
export interface ApiResult<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;

    [key: string]: unknown;
}
