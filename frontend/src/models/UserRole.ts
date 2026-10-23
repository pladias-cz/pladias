/**
 * Jediný zdroj pravdy pro názvy rolí na FE.
 *
 * Zrcadlí backendový enum `app/models/UserRole.java` 1:1 – role vlastní backend,
 * frontend je jen konzumuje (docs/gotchas.md „Role vlastní backend“). Při přidání
 * role na BE sem patří jeden řádek; zapomenutí odhalí `parseRoles` jako runtime
 * varování o driftu BE ↔ FE.
 */

import {logWarn} from "@/services/logger";

export const USER_ROLES = [
    "mapAdmin",
    "bulkEditor",
    "traitAdmin",
    "sysAdmin",
    "taxonAdmin",
    "asyncImporter",
    "biblioAdmin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const KNOWN_ROLES: ReadonlySet<string> = new Set(USER_ROLES);

/** Type guard pro jednotlivé role (BE posílá vždy přesně tyto klíče, malými písmeny). */
export function isUserRole(value: string): value is UserRole {
    return KNOWN_ROLES.has(value);
}

/**
 * Runtime kontrola driftu BE ↔ FE: neznámou roli zaloguje centrálním loggerem
 * a zahodí (route se jen zavře, ale ve startovním logu je vidět příčina).
 */
export function parseRoles(raw: readonly string[] | undefined | null): UserRole[] {
    const parsed: UserRole[] = [];
    for (const role of raw ?? []) {
        if (isUserRole(role)) {
            parsed.push(role);
        } else {
            logWarn(
                "Neznámá role z backendu – FE union v src/models/UserRole.ts nedrží krok s app/models/UserRole.java.",
                {role},
            );
        }
    }
    return parsed;
}
