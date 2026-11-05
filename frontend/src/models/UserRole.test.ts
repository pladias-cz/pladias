import {beforeEach, describe, expect, it} from 'vitest';
import {isUserRole, parseRoles, USER_ROLES} from './UserRole';
import {getRecentLogEntries, resetLogger} from '@/services/logger';

describe('USER_ROLES', () => {
    it('mirrors the backend enum app/models/UserRole.java 1:1', () => {
        // Pořadí i obsah odpovídá FE kontraktu /api/react/config (UserRole.keysOf).
        expect([...USER_ROLES]).toEqual([
            'mapAdmin',
            'bulkEditor',
            'traitAdmin',
            'sysAdmin',
            'taxonAdmin',
            'asyncImporter',
            'biblioAdmin',
        ]);
    });
});

describe('isUserRole', () => {
    it('accepts known roles (lowercase keys as sent by the backend)', () => {
        expect(isUserRole('mapAdmin')).toBe(true);
        expect(isUserRole('biblioAdmin')).toBe(true);
    });

    it('rejects typos and case variants', () => {
        expect(isUserRole('sysadmin')).toBe(false);
        expect(isUserRole('MapAdmin')).toBe(false);
        expect(isUserRole('')).toBe(false);
    });
});

describe('parseRoles', () => {
    beforeEach(() => {
        resetLogger();
    });

    it('keeps known roles and drops unknown ones with a logger warning (BE↔FE drift)', () => {
        expect(parseRoles(['mapAdmin', 'futureRole'])).toEqual(['mapAdmin']);

        const logged = getRecentLogEntries();
        expect(logged).toHaveLength(1);
        expect(logged[0].level).toBe('warn');
        expect(logged[0].context).toEqual({role: 'futureRole'});
    });

    it('handles missing payloads', () => {
        expect(parseRoles(undefined)).toEqual([]);
        expect(parseRoles(null)).toEqual([]);
        expect(getRecentLogEntries()).toHaveLength(0);
    });
});
