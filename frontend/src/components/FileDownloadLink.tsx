/**
 * Odkaz pro stažení generovaného souboru (exporty, přílohy, snapshoty, mapy) –
 * sdílený UI vzor podle downloads stránky: kliknutí zobrazí spinner a zablokuje
 * jen tento odkaz (ostatní odkazy v tabulce zůstávají aktivní, stahování můžou
 * běžet souběžně), soubor jde přes `apiDownload` + `downloadBlob`, takže chyba
 * z backendu skončí jako toast místo uložení chybového těla jako souboru.
 *
 * Nahrazuje přímé `<a href>` na file endpointy – viz docs/conventions.md
 * (sekce downloads). Service funkci předává volající (`fetchFile`), komponenta
 * nezná URL ani tvar požadavku.
 */

import {useRef, useState} from 'react';
import type {ComponentProps, MouseEvent, ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Button, Spinner} from 'react-bootstrap';

import type {DownloadedFile} from '@/services/apiClient';
import {downloadBlob} from '@/core/dataTable/export';
import {notifyApiError} from '@/stores/notificationStore';

/** Varianty react-bootstrap tlačítka – `link` jako textový odkaz, `primary` pro zvýraznění. */
type LinkVariant = ComponentProps<typeof Button>['variant'];

interface FileDownloadLinkProps {
    /** Service funkce vracející soubor přes `apiDownload` (volající drží URL). */
    fetchFile: () => Promise<DownloadedFile>;
    /** Fallback hláška toastu při chybě; výchozí sdílený `download.downloadFailed`. */
    errorMessage?: string;
    /** Vizuální varianta; default `link` – vzhled textového odkazu jako na downloads stránce. */
    variant?: LinkVariant;
    /** Velikost tlačítka (např. `sm` v kompaktních tabulkách). */
    size?: 'sm';
    /** Třídy tlačítka; default `p-0` (odkaz bez odsazení). */
    className?: string;
    /** Tooltip (např. u ikonových odkazů bez textu). */
    title?: string;
    children: ReactNode;
}

function FileDownloadLink({
    fetchFile,
    errorMessage,
    variant = 'link',
    size,
    className = 'p-0',
    title,
    children,
}: FileDownloadLinkProps) {
    const {t} = useTranslation();
    const [downloading, setDownloading] = useState(false);
    // ref kopie stavu – funguje i mezi dvěma kliknutími před re-renderem
    // (disabled atribut se v DOMu objeví až po překreslení)
    const downloadingRef = useRef(false);

    async function handleClick(event: MouseEvent<HTMLButtonElement>) {
        // klik v buňce DataTable nesmí spustit akci řádku (např. výběr)
        event.stopPropagation();

        // ochrana proti dvojkliku – disabled tlačítko obvykle click nepustí,
        // ale změna DOMu je asynchronní vůči druhému kliknutí
        if (downloadingRef.current) return;
        downloadingRef.current = true;

        setDownloading(true);
        try {
            const file = await fetchFile();
            downloadBlob(file.blob, file.filename);
        } catch (e) {
            notifyApiError(e, errorMessage ?? t('download.downloadFailed'));
        } finally {
            downloadingRef.current = false;
            setDownloading(false);
        }
    }

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            title={title}
            disabled={downloading}
            onClick={handleClick}
        >
            {downloading && <Spinner as="span" size="sm" animation="border" className="me-1"/>}
            {children}
        </Button>
    );
}

export default FileDownloadLink;
