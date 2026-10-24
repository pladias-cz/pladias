/**
 * Testy cache číselníků v queryClient (výjimka z bez-cache politiky):
 *  - globální defaulty zůstávají bez cache (staleTime/gcTime 0, 'always'),
 *  - číselníky z CACHED_CATALOGS dostávají dle TTL správné staleTime/gcTime
 *    a refetchOnMount: true (globální 'always' by cachování zrušil),
 *  - immutable číselník se během session nenačítá znovu, necachovaný dotaz
 *    ano (fetchQuery).
 */

import {describe, expect, it, vi} from 'vitest';
import {createQueryClient} from './queryClient';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('createQueryClient – cache číselníků', () => {
    it('globální defaulty zůstávají bez cache', () => {
        const client = createQueryClient();
        const queriesDefaults = client.getDefaultOptions().queries ?? {};

        expect(queriesDefaults).toMatchObject({
            staleTime: 0,
            gcTime: 0,
            refetchOnMount: 'always',
        });
    });

    it('neměnné číselníky mají cache na celou session', () => {
        const client = createQueryClient();

        for (const key of ['phytochorions', 'revisionStatuses', 'publicationStatuses']) {
            expect(client.getQueryDefaults([key])).toMatchObject({
                staleTime: Infinity,
                gcTime: Infinity,
                refetchOnMount: true,
            });
        }
    });

    it('řídko se měnící číselníky mají 24h cache', () => {
        const client = createQueryClient();

        for (const key of ['herbariums', 'projects', 'institutions', 'licenses', 'taxonRanks']) {
            expect(client.getQueryDefaults([key])).toMatchObject({
                staleTime: DAY_MS,
                gcTime: DAY_MS,
                refetchOnMount: true,
            });
        }
    });

    it('immutable číselník se během session nenačítá znovu', async () => {
        const client = createQueryClient();
        const loader = vi.fn().mockResolvedValue([{id: 1}]);

        await client.fetchQuery({queryKey: ['phytochorions'], queryFn: loader});
        await client.fetchQuery({queryKey: ['phytochorions'], queryFn: loader});

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('necachovaný dotaz se načte znovu (výchozí bez cache)', async () => {
        const client = createQueryClient();
        const loader = vi.fn().mockResolvedValue([{id: 1}]);

        await client.fetchQuery({queryKey: ['taxonPublications'], queryFn: loader});
        await client.fetchQuery({queryKey: ['taxonPublications'], queryFn: loader});

        expect(loader).toHaveBeenCalledTimes(2);
    });
});

