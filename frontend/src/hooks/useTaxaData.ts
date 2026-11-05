/**
 * Sdílený fetch dat tabulky taxonů pro DataTable (atlasAdmin TaxaList i atlas
 * TaxaList) – jeden hook s parametrem endpointu místo dřívější dvou diverzních
 * kopií (P1 konsistence, improvements.md §2.4).
 *
 * Samotné I/O a mapování parametrů dělá `services/mapAdminApi.getTaxaTable`
 * (konvence „I/O dělají jen src/services"); hook dodává jen stabilní identitu
 * callbacku pro `DataTable.fetchData` (`useTableData` volá fetcher uvnitř
 * vlastního `useQuery`) a centrální notifikaci chyb.
 */

import {useCallback} from 'react';
import {getTaxaTable, type TaxaTableParams, type TaxaTableData} from '@/services/mapAdminApi';
import {notifyApiError} from '@/stores/notificationStore';
import i18n from '@/i18n/i18n';

export interface UseTaxaDataOptions {
    /** `'/api/react/atlasadmin/taxa'` (admin) nebo `'/api/react/atlasadmin/taxa/user'` (revisor). */
    endpoint: string;
}

export function useTaxaData({endpoint}: UseTaxaDataOptions) {
    /**
     * Fetch taxa from API with server-side filtering (custom fetcher kontrakt
     * `DataTable.fetchData`). Chybu ohlásí toastem a vrátí prázdná data, aby
     * `useTableData` nezobrazoval React Query error místo tabulky.
     */
    const fetchTaxa = useCallback(
        async (params: TaxaTableParams): Promise<TaxaTableData> => {
            try {
                return await getTaxaTable(endpoint, params);
            } catch (err) {
                // aborted i centrálně ohlášené chyby notifyApiError tiše ignoruje
                notifyApiError(err, i18n.t('common.loadFailed'));
                return {data: [], totalCount: 0, filteredCount: 0};
            }
        },
        [endpoint],
    );

    return {fetchTaxa};
}
