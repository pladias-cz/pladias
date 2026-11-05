/**
 * Chip jednoho filtru v horní řádce – button s názvem filtru a zformátovanou
 * hodnotou. Hover otevře popover se vstupem (FilterEditor) a focusne jeho
 * první relevantní vstup, klik popover „připíchne" (pinned) pro pohodlné
 * psaní, klik mimo / Esc zavře; kliknutí nebo psaní dovnitř popoveru ho také
 * připíchne, aby psaní nezavřelo mouseleave. Křížek maže hodnotu filtru
 * (chip zůstává viditelný).
 */

import {useEffect, useRef, useState} from 'react';
import {Button, Overlay, Popover} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {AutocompleteProvider} from '@/components/autocomplete/AutocompleteProvider';
import type {TaxonId} from '@/models/TaxonId';
import {formatFilterValue, getCompanionFilter} from './filterRegistry';
import type {FilterDefinition} from './filterRegistry';
import {FilterEditor} from './FilterEditor';
import type {FilterValue} from './types';
import type {TypeaheadOption} from '../types';

/** O kolik ms po opuštění chipu/popoveru se popover zavře (přesun myši mezi nimi). */
const CLOSE_DELAY_MS = 150;

/** Kolik snímků čekat na mount vstupu právě otevřeného popoveru (portál + transition). */
const FOCUS_RETRY_FRAMES = 10;

interface FilterChipProps {
    filter: FilterDefinition;
    value: FilterValue | undefined;
    onChange: (value: FilterValue) => void;
    onClear: () => void;
    /** Číselník pro typeahead filtr. */
    options?: TypeaheadOption[];
    /** Provider pro taxon autocomplete (jen taxonName). */
    taxonProvider?: AutocompleteProvider<TaxonId>;
    /** Hodnota a setter doprovodného filtru (podtaxony u taxonu). */
    companionValue?: FilterValue;
    onCompanionChange?: (value: FilterValue) => void;
    /** Zavření popoveru – spouštěč auto-vyhledávání (rozhoduje orchestrátor). */
    onPopoverClose?: () => void;
    /** Potvrzení hodnoty výběrem (autocomplete / typeahead / přepnutí checkboxu) – spouštěč auto-vyhledávání bez zavření popoveru. */
    onValueCommitted?: () => void;
}

export function FilterChip({
                               filter,
                               value,
                               onChange,
                               onClear,
                               options,
                               taxonProvider,
                               companionValue,
                               onCompanionChange,
                               onPopoverClose,
                               onValueCommitted,
                           }: FilterChipProps) {
    const {t} = useTranslation();
    const [show, setShow] = useState(false);
    const [pinned, setPinned] = useState(false);
    // cíl overlay jako state (callback refy) – čtení ref.current během renderu
    // zakazuje react-hooks/refs, Overlay potřebuje elementy až po prvním renderu
    const [target, setTarget] = useState<HTMLButtonElement | null>(null);
    const [chipElement, setChipElement] = useState<HTMLSpanElement | null>(null);
    const closeTimer = useRef<number | null>(null);

    // Doprovodný filtr (podtaxony) – existuje jen u taxonu.
    const companion = getCompanionFilter(filter.id);

    const valueText = formatFilterValue(filter, value);
    // dynamické klíče z registru – typované i18n je zná jen pro literály (vzor useSearchOptions)
    const label = t(filter.labelKey as never);

    const cancelClose = () => {
        if (closeTimer.current != null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    const openPopover = () => {
        cancelClose();
        setShow(true);
    };

    /** Zavření popoveru (mouseleave / klik mimo / Esc) – notifikuje auto-vyhledávání. */
    const close = () => {
        cancelClose();
        setShow(false);
        setPinned(false);
        onPopoverClose?.();
    };

    const scheduleClose = () => {
        if (pinned) {
            return;
        }
        cancelClose();
        closeTimer.current = window.setTimeout(close, CLOSE_DELAY_MS);
    };

    /** Klik na chip: připíchne popover pro psaní; druhý klik od připne (zavře mouseleave). */
    const handleTogglePin = () => {
        cancelClose();
        if (pinned) {
            setPinned(false);
        } else {
            setPinned(true);
            setShow(true);
        }
    };

    /**
     * Klik nebo klávesa (psaní) dovnitř popoveru ho připíchne – myš pak může
     * odejít, aniž by psaní zavřelo mouseleave.
     */
    const pinPopover = () => {
        cancelClose();
        setPinned(true);
    };

    // Čištění timeru při odmontování.
    useEffect(() => () => cancelClose(), []);

    // Otevřený popover focusne svůj první relevantní vstup (text, typeahead,
    // autocomplete…; checkbox ne) – psát lze rovnou bez kliknutí dovnitř.
    // Popover je v portálu na body; čeká se na jeho první napozicování
    // popperem (inline position) a focus jde s preventScroll – čerstvě
    // mountovaný popover leží před ním ve statické pozici na konci body a
    // obyčejný focus by odscrolloval stránku na její konec. Focus se navíc
    // nepřebírá, pokud uživatel píše jinde (přeběh myší přes řádku chipů
    // nesmí přepnout psaní do cizího pole); focus v jiném popoveru filtru
    // (umírající popover sousedního chipu po přeběhu) se za psaní jinde
    // nepovažuje – nový popover ho přebírá.
    useEffect(() => {
        if (!show) {
            return undefined;
        }
        let frame = 0;
        let attempts = 0;
        const focusInput = () => {
            const popover = document.getElementById(`filter-popover-${filter.id}`);
            if (popover == null || !popover.style.position) {
                if (attempts < FOCUS_RETRY_FRAMES) {
                    attempts += 1;
                    frame = window.requestAnimationFrame(focusInput);
                }
                return;
            }
            const active = document.activeElement;
            const typingElsewhere = active instanceof HTMLElement
                && active.closest('.filter-chip__popover') == null
                && (active.tagName === 'INPUT'
                    || active.tagName === 'TEXTAREA'
                    || active.tagName === 'SELECT'
                    || active.isContentEditable);
            if (!typingElsewhere) {
                popover.querySelector<HTMLElement>('input:not([type="checkbox"]), textarea')
                    ?.focus({preventScroll: true});
            }
        };
        focusInput();
        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [show, filter.id]);

    // Klik mimo chip i popover zavře popover (Esc také). Vlastní listener místo
    // Overlay rootClose – ten se v kombinaci s portalem chová nespolehlivě.
    // Pozice popoveru se neřeší přes ref (react-bootstrap Overlay při cloneElement
    // ref child elementu přepíše svým), ale přes CSS třídu – popover je v portálu
    // na body, closest ho najde od libovolného vnořeného elementu.
    useEffect(() => {
        if (!show) {
            return undefined;
        }
        const handleDocMouseDown = (event: MouseEvent) => {
            const node = event.target;
            if (node instanceof Element
                && (node.closest('.filter-chip__popover') != null || chipElement?.contains(node))) {
                // klik uvnitř popoveru nebo na chip (pin/unpin) nezavírá
                return;
            }
            close();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('mousedown', handleDocMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleDocMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    });

    return (
        <span
            ref={setChipElement}
            className={`filter-chip filter-chip--${filter.category}`}
            onMouseEnter={openPopover}
            onMouseLeave={scheduleClose}
        >
            <Button
                ref={setTarget}
                size="sm"
                variant="outline-secondary"
                className={`filter-chip__button ${valueText != null ? 'filter-chip__button--filled' : ''}`}
                onClick={handleTogglePin}
                aria-expanded={show}
                title={filter.titleKey ? t(filter.titleKey as never) : undefined}
            >
                {valueText != null ? `${label}: ${valueText}` : label}
            </Button>
            {valueText != null && (
                <button
                    type="button"
                    className="filter-chip__clear btn-close"
                    aria-label={t('atlas.advancedSearch.filterRow.clearValue')}
                    title={t('atlas.advancedSearch.filterRow.clearValue')}
                    onClick={onClear}
                />
            )}
            <Overlay target={target} show={show} placement="bottom">
                <Popover
                    id={`filter-popover-${filter.id}`}
                    className={`filter-chip__popover ${filter.kind === 'polygonMap' ? 'filter-chip__popover--wide' : ''}`}
                    onMouseEnter={openPopover}
                    onMouseLeave={scheduleClose}
                    onMouseDown={pinPopover}
                    onKeyDown={pinPopover}
                >
                    <Popover.Header as="h3">{filter.titleKey ? t(filter.titleKey as never) : label}</Popover.Header>
                    <Popover.Body>
                        <FilterEditor
                            filter={filter}
                            value={value}
                            onChange={onChange}
                            options={options}
                            taxonProvider={taxonProvider}
                            companion={companion}
                            companionValue={companionValue}
                            onCompanionChange={onCompanionChange}
                            onCommit={onValueCommitted}
                            onEnter={close}
                        />
                    </Popover.Body>
                </Popover>
            </Overlay>
        </span>
    );
}
