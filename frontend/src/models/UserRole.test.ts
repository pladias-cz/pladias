import {describe, expect, it, vi} from "vitest";
import {isUserRole, parseRoles, USER_ROLES} from "./UserRole";

describe("USER_ROLES", () => {
    it("mirrors the backend enum app/models/UserRole.java 1:1", () => {
        // Pořadí i obsah odpovídá FE kontraktu /api/react/config (UserRole.keysOf).
        expect([...USER_ROLES]).toEqual([
            "mapAdmin",
            "bulkEditor",
            "traitAdmin",
            "sysAdmin",
            "taxonAdmin",
            "asyncImporter",
            "biblioAdmin",
        ]);
    });
});

describe("isUserRole", () => {
    it("accepts known roles (lowercase keys as sent by the backend)", () => {
        expect(isUserRole("mapAdmin")).toBe(true);
        expect(isUserRole("biblioAdmin")).toBe(true);
    });

    it("rejects typos and case variants", () => {
        expect(isUserRole("sysadmin")).toBe(false);
        expect(isUserRole("MapAdmin")).toBe(false);
        expect(isUserRole("")).toBe(false);
    });
});

describe("parseRoles", () => {
    it("keeps known roles and drops unknown ones with a console warning (BE↔FE drift)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(parseRoles(["mapAdmin", "futureRole"])).toEqual(["mapAdmin"]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain("futureRole");

        warn.mockRestore();
    });

    it("handles missing payloads", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(parseRoles(undefined)).toEqual([]);
        expect(parseRoles(null)).toEqual([]);
        expect(warn).not.toHaveBeenCalled();

        warn.mockRestore();
    });
});
