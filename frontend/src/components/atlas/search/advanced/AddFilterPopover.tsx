/**
 * „+" tlačítko s popoverem pro individuální zapnutí dalších filtrů –
 * kategorie ve sloupcích (grid), přepnutí filtru popover nezavírá
 * (multi-toggle), zavření klikem na tlačítko, klikem mimo nebo Esc.
 *
 * Nahrazuje react-bootstrap Dropdown: ten se s autoClose="outside" po
 * otevření nedal zavřít klikem na toggle (zavření na mousedown a
 * následný click na toggle ho hned znovu otevřel) a jeho menu
 * nepodporovalo rozložení do sloupců. Zavírání řeší vlastní listener –
 * Overlay rootClose se v kombinaci s portalem chová nespolehlivě.
 */

import {useEffect, useState} from 'react';
import {Button, Overlay, Popover} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {FILTER_CATEGORIES, type FilterDefinition} from './filterRegistry';
import type {FilterId} from './types';

interface AddFilterPopoverProps {
    /** Aplikovatelné filtry (bez companion) v pořadí registru. */
    filters: readonly FilterDefinition[];
    visibleIds: readonly FilterId[];
    onToggleVisibility: (id: FilterId) => void;
}

export function AddFilterPopover({filters, visibleIds, onToggleVisibility}: AddFilterPopoverProps) {
    const {t} = useTranslation();
    const [show, setShow] = useState(false);
    // cíl overlay jako state (callback ref) – vzor FilterChip
    const [target, setTarget] = useState<HTMLButtonElement | null>(null);

    // Klik mimo tlačítko i popover (nebo Esc) zavře popover. Pozice popoveru se
    // neřeší přes ref (react-bootstrap Overlay při cloneElement ref child elementu
    // přepíše svým), ale přes CSS třídu – popover je v portálu na body.
    useEffect(() => {
        if (!show) {
            return undefined;
        }
        const handleDocMouseDown = (event: MouseEvent) => {
            const node = event.target;
            if (node instanceof Element
                && (node.closest('.filter-add-popover') != null || target?.contains(node))) {
                return;
            }
            setShow(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShow(false);
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
        <>
            <Button
                ref={setTarget}
                size="sm"
                variant="outline-secondary"
                aria-expanded={show}
                title={t('atlas.advancedSearch.filterRow.addFilterTitle')}
                onClick={() => setShow((wasShown) => !wasShown)}
            >
                <i className="bi bi-plus-lg" aria-hidden="true"/>&nbsp;{t('atlas.advancedSearch.filterRow.addFilter')}
            </Button>
            <Overlay target={target} show={show} placement="bottom">
                <Popover id="add-filter-popover" className="filter-add-popover">
                    <Popover.Header as="h3">{t('atlas.advancedSearch.filterRow.addFilterTitle')}</Popover.Header>
                    <Popover.Body>
                        <div className="filter-add__grid">
                            {FILTER_CATEGORIES.map(({category, labelKey}) => (
                                <div key={category} className={`filter-add__category filter-add__category--${category}`}>
                                    <div className="filter-add__category-header">{t(labelKey as never)}</div>
                                    {filters
                                        .filter((filter) => filter.category === category)
                                        .map((filter) => {
                                            const isVisible = visibleIds.includes(filter.id);
                                            return (
                                                <button
                                                    key={filter.id}
                                                    type="button"
                                                    className={`filter-add__item ${isVisible ? 'filter-add__item--visible' : ''}`}
                                                    aria-pressed={isVisible}
                                                    onClick={() => onToggleVisibility(filter.id)}
                                                >
                                                    <i className="bi bi-check2" aria-hidden="true"/>
                                                    {t(filter.labelKey as never)}
                                                </button>
                                            );
                                        })}
                                </div>
                            ))}
                        </div>
                    </Popover.Body>
                </Popover>
            </Overlay>
        </>
    );
}
