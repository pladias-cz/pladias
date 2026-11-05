/**
 * Testy FileDownloadLink (sdílený odkaz pro stahování generovaných souborů):
 * spinner + disabled během stahování, ochrana proti dvojkliku, uložení blobu
 * přes downloadBlob a chyby hlášené přes notifyApiError (toast). Service vrstva
 * (`fetchFile`) se mockuje – síť se v component testu nevolá.
 */

import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import FileDownloadLink from './FileDownloadLink';
import {downloadBlob} from '@/core/dataTable/export';
import {notifyApiError} from '@/stores/notificationStore';
import type {DownloadedFile} from '@/services/apiClient';
import '@/i18n/i18n';

vi.mock('@/core/dataTable/export', () => ({downloadBlob: vi.fn()}));
vi.mock('@/stores/notificationStore', () => ({notifyApiError: vi.fn()}));

const file = (name: string): DownloadedFile => ({
    blob: new Blob(['data'], {type: 'application/x-download'}),
    filename: name,
    contentType: 'application/x-download',
    headers: new Headers(),
});

function renderLink(fetchFile: () => Promise<DownloadedFile>, errorMessage?: string) {
    const {container} = render(
        <FileDownloadLink fetchFile={fetchFile} errorMessage={errorMessage}>
            stáhnout
        </FileDownloadLink>,
    );
    const button = screen.getByRole('button', {name: 'stáhnout'}) as HTMLButtonElement;
    return {container, button};
}

describe('FileDownloadLink', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('během stahování zobrazuje spinner, blokuje tlačítko a dvojklik ignoruje', async () => {
        let resolveFetch!: (file: DownloadedFile) => void;
        const fetchFile = vi.fn(() => new Promise<DownloadedFile>(resolve => {
            resolveFetch = resolve;
        }));

        const {container, button} = renderLink(fetchFile);

        await act(async () => {
            fireEvent.click(button);
            // druhý klik ještě před dokončením – tlačítko je disabled, handler se nevyvolá
            fireEvent.click(button);
        });

        expect(fetchFile).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(true);
        expect(container.querySelector('.spinner-border')).toBeInTheDocument();

        await act(async () => {
            resolveFetch(file('export.xlsx'));
        });

        await waitFor(() => expect(button.disabled).toBe(false));
        expect(fetchFile).toHaveBeenCalledTimes(1);
        expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'export.xlsx');
    });

    it('po selhání zobrazí toast a odkaz lze opakovat', async () => {
        const fetchFile = vi.fn()
            .mockRejectedValueOnce(new Error('export se nezdaril'))
            .mockResolvedValueOnce(file('retry.xlsx'));

        const {button} = renderLink(fetchFile, 'Stažení selhalo.');

        await act(async () => {
            fireEvent.click(button);
        });

        expect(notifyApiError).toHaveBeenCalledWith(expect.any(Error), 'Stažení selhalo.');
        expect(button.disabled).toBe(false);

        await act(async () => {
            fireEvent.click(button);
        });

        expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'retry.xlsx');
        expect(fetchFile).toHaveBeenCalledTimes(2);
    });
});
