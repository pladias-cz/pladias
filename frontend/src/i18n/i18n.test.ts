import {describe, expect, it} from "vitest";
import i18n from "./i18n";

describe("i18n", () => {
    it("initializes with cs as the default language", () => {
        expect(i18n.language).toBe("cs");
        expect(i18n.t("user.playMessages.submit")).toBe("Uložit");
    });

    it("falls back to cs for languages without translations (en/pl are empty on purpose)", () => {
        expect(i18n.t("user.playMessages.submit", {lng: "en"})).toBe("Uložit");
    });
});