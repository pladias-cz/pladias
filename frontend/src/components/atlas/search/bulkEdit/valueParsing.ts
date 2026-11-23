/**
 * Čistý validátor data vstupu hromadných úprav. Bez Reactu – testovatelný
 * samostatně (valueParsing.test.ts). Parsery souřadnic přešly do
 * `core/coordinates/coordinateParsing.ts`, protože je kromě hromadné úpravy
 * používá i návrh nové polohy na detailu záznamu.
 */

/** Validace data hromadné úpravy: prázdné, RRRR, RRRR-MM nebo RRRR-MM-DD. */
export const isValidDateValue = (value: string): boolean => {
    if (!value) {
        return true;
    }

    const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
    if (!datePattern.test(value)) {
        return false;
    }

    const parts = value.split('-');
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
