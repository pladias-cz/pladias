/**
 * Excel export z tabu Download. Záměrně mimo useSearchQuery: excel payload
 * (export_type=excel) by zanesl do lastPayloadEntries a rozbil stránkování
 * tabulky (resolvePageSize by vynucovala exportní page size) – tab Download
 * tedy exportuje vlastní cestou, ale stejnou službou a hláškami.
 */

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {downloadBlob} from '@/core/dataTable/export';
import {ApiError} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';
import {exportSearchExcel} from '@/services/searchApi';
import {EXCEL_EXPORT_PAGE_SIZE} from '../searchRequest';

export function useAdvancedSearchExport() {
    const {t} = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    /** Spustí export nad zadaným FormData (filtry + export_type=excel + řazení). */
    const run = useCallback(async (formData: FormData) => {
        setIsLoading(true);
        setMessage('');
        try {
            const file = await exportSearchExcel(EXCEL_EXPORT_PAGE_SIZE, formData);
            // Selhání generování se backend snaží oznámit jako HTTP 500 s
            // JsonResult.error (apiDownload z toho vyhodí ApiError). Prázdné
            // tělo je pojistka na zbylé způsoby přerušení přenosu – stáhnout ho
            // znamenalo tvářit se, že export proběhl.
            if (file.blob.size === 0) {
                throw new ApiError(t('atlas.search.form.excelExportEmptyFile'));
            }

            downloadBlob(file.blob, file.filename);
            // Nula exportovaných řádků není úspěch ani při platném souboru – stejně
            // vypadá prázdný výsledek vyhledávání i polykaná chyba při načítání dat.
            if (file.recordsExported === 0) {
                setMessage(t('atlas.search.form.excelExportedNone'));
            } else if (file.totalRecords != null) {
                setMessage(file.recordsExported >= file.totalRecords
                    ? t('atlas.search.form.excelExportedAll', {recordsCount: file.recordsExported})
                    : t('atlas.search.form.excelExportedPartial', {
                        exported: file.recordsExported,
                        total: file.totalRecords,
                    }));
            }
        } catch (err) {
            notifyApiError(err, t('atlas.search.form.submitFailed'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    return {isLoading, message, run};
}
