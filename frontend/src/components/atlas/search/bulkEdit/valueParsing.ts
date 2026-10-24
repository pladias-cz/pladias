/**
 * Čisté parsery vstupů hromadných úprav: souřadnice
 * (desetinné i DMS, prefixy/suffixy hemisfér) a validace data.
 * Bez Reactu – testovatelné samostatně (valueParsing.test.ts).
 */

type CoordAxis = "lat" | "lon";

/** Zaokrouhlení na 8 desetinných míst (přesnost souřadnic v DB). */
export const formatCoord = (value: number): string => {
    const rounded = Math.round(value * 100_000_000) / 100_000_000;
    return rounded.toString();
};

/**
 * Parsuje souřadnici: "49.5", "N49.5", "49.5S", "49°30'", "49°30'30\"",
 * s normalizací unicode variant (º/′/″). Bez hemisféry se použije
 * `defaultHemisphere` a znaménko se normalizuje na kladné.
 * Vrací null pro prázdný/nesmyslný vstup nebo překročení rozsahu osy.
 */
export const parseCoordinate = (input: string, axis: CoordAxis, defaultHemisphere: "N" | "E"): number | null => {
    const trimmed = input.trim();
    if (!trimmed) {
        return null;
    }

    const upper = trimmed.toUpperCase();
    const prefixHemisphere = upper.match(/^[NSEW]/)?.[0] ?? "";
    const suffixHemisphere = upper.match(/[NSEW]$/)?.[0] ?? "";
    const hemisphere = suffixHemisphere || prefixHemisphere || defaultHemisphere;
    const isNegativeHemisphere = hemisphere === "S" || hemisphere === "W";
    const isPositiveHemisphere = hemisphere === "N" || hemisphere === "E";

    let valuePart = upper.replace(/^[NSEW]\s*/, "").replace(/\s*[NSEW]$/, "").trim();
    if (!valuePart) {
        return null;
    }

    const decimalMatch = valuePart.match(/^([+-]?\d+(?:\.\d+)?)$/);
    if (decimalMatch) {
        let decimal = Number.parseFloat(decimalMatch[1]);
        if (!Number.isFinite(decimal)) {
            return null;
        }

        if (isNegativeHemisphere) {
            decimal = -Math.abs(decimal);
        } else if (isPositiveHemisphere) {
            decimal = Math.abs(decimal);
        }

        const maxAbs = axis === "lat" ? 90 : 180;
        if (Math.abs(decimal) > maxAbs) {
            return null;
        }

        return decimal;
    }

    valuePart = valuePart.replace(/[º]/g, "°").replace(/[’′]/g, "'").replace(/[”″]/g, '"');
    const dmsMatch = valuePart.match(/^([+-]?\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)?\s*'?\s*(\d+(?:\.\d+)?)?\s*"?$/);
    if (!dmsMatch) {
        return null;
    }

    const degreesRaw = Number.parseFloat(dmsMatch[1]);
    const minutes = dmsMatch[2] ? Number.parseFloat(dmsMatch[2]) : 0;
    const seconds = dmsMatch[3] ? Number.parseFloat(dmsMatch[3]) : 0;
    if (!Number.isFinite(degreesRaw) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
        return null;
    }
    if (minutes >= 60 || seconds >= 60) {
        return null;
    }

    let decimal = Math.abs(degreesRaw) + minutes / 60 + seconds / 3600;
    if (isNegativeHemisphere) {
        decimal = -decimal;
    } else if (!isPositiveHemisphere && degreesRaw < 0) {
        decimal = -decimal;
    }

    const maxAbs = axis === "lat" ? 90 : 180;
    if (Math.abs(decimal) > maxAbs) {
        return null;
    }

    return decimal;
};

/**
 * Parsuje "lat, lon" / "lat; lon" do desetinných stupňů.
 * Vrací null, když chybí oddělovač nebo některá část není platná souřadnice.
 */
export const parseCoordinatePair = (raw: string): { lat: number; lon: number } | null => {
    const pairMatch = raw.trim().match(/^(.+?)\s*[;,]\s*(.+)$/);
    if (!pairMatch) {
        return null;
    }

    const lat = parseCoordinate(pairMatch[1].trim(), "lat", "N");
    const lon = parseCoordinate(pairMatch[2].trim(), "lon", "E");
    if (lat == null || lon == null) {
        return null;
    }

    return {lat, lon};
};

/** Validace data hromadné úpravy: prázdné, RRRR, RRRR-MM nebo RRRR-MM-DD. */
export const isValidDateValue = (value: string): boolean => {
    if (!value) {
        return true;
    }

    const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
    if (!datePattern.test(value)) {
        return false;
    }

    const parts = value.split("-");
    if (parts.length >= 2) {
        const month = Number.parseInt(parts[1], 10);
        if (month < 1 || month > 12) {
            return false;
        }
    }

    if (parts.length === 3) {
        const day = Number.parseInt(parts[2], 10);
        if (day < 1 || day > 31) {
            return false;
        }
    }

    return true;
};
