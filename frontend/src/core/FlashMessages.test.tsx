import {cleanup, render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import FlashMessages from './FlashMessages';
import {useNotificationStore} from '@/stores/notificationStore';
import type {InstanceMessage} from '@/models/InstanceMessage';
import '@/i18n/i18n';

/**
 * Testy převodu zpráv instance na Toasty (sekce A + F): první načtení,
 * změna obsahu (přidání/zrušení zprávy), resynchronizace při návratu do
 * záložky a hláška o nedostupnosti heartbeatu. Vitest bez globals: true
 * nespouští auto-cleanup, proto ručně.
 */

const store = () => useNotificationStore.getState();
/** Obsah notifikací bez id a html – pro snadné porovnání. */
const shown = () =>
    store().notifications.map(({type, message}) => ({type, message}));

/** Skrytá/viditelná záložka – jsdom property jsou read-only proto přes getter. */
let tabHidden = false;
const setTabHidden = (value: boolean) => {
    tabHidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
};

const maintenance: InstanceMessage[] = [{type: 'warning', text: 'Plánovaná údržba v pátek.'}];

beforeEach(() => {
    tabHidden = false;
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (tabHidden ? 'hidden' : 'visible'),
    });
});

afterEach(() => {
    cleanup();
    store().clear();
});

describe('FlashMessages', () => {
    it('renders nothing and pushes messages as toasts on first load', () => {
        const {container} = render(<FlashMessages messages={maintenance}/>);

        expect(container).toBeEmptyDOMElement();
        expect(shown()).toEqual([{type: 'warning', message: 'Plánovaná údržba v pátek.'}]);
    });

    it('opens toasts for new messages only and closes removed ones on content change', () => {
        const {rerender} = render(<FlashMessages messages={maintenance}/>);

        const withNew: InstanceMessage[] = [...maintenance, {type: 'info', text: 'Nová mapa.'}];
        rerender(<FlashMessages messages={withNew}/>);
        expect(shown()).toEqual([
            {type: 'warning', message: 'Plánovaná údržba v pátek.'},
            {type: 'info', message: 'Nová mapa.'},
        ]);

        // zrušená zpráva zavře svůj toast, zbývající se neduplikuje
        rerender(<FlashMessages messages={[{type: 'info', text: 'Nová mapa.'}]}/>);
        expect(shown()).toEqual([{type: 'info', message: 'Nová mapa.'}]);
    });

    it('re-shows the current messages when the user returns to the tab', () => {
        render(<FlashMessages messages={maintenance}/>);
        const firstId = store().notifications[0].id;

        setTabHidden(true); // odchod ze záložky – nic se nemění
        expect(store().notifications[0].id).toBe(firstId);

        setTabHidden(false); // návrat do záložky – toast se zobrazí znovu (nové id)
        expect(shown()).toEqual([{type: 'warning', message: 'Plánovaná údržba v pátek.'}]);
        expect(store().notifications[0].id).not.toBe(firstId);
    });

    it('warns about an unavailable heartbeat and closes the toast on recovery', () => {
        const {rerender} = render(<FlashMessages messages={[]} unavailable/>);
        expect(shown()).toEqual([
            {type: 'warning', message: 'Zprávy o stavu instance jsou momentálně nedostupné.'},
        ]);

        rerender(<FlashMessages messages={[]}/>);
        expect(shown()).toEqual([]);
    });
});