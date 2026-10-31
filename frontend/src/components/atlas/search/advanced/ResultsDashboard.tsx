/**
 * Dashboard výsledků vyhledávání: agregované barploty (rok nálezu, nadmořská
 * výška, licence, herbář – další přibývají přes registr widgetů) nad CELÝM
 * výsledkem hledání, nezávisle na stránkování. Výběr aktivních widgetů je
 * perzistentní user setting (useDashboardWidgets, BE stored); dotaz na agregace
 * nese jen aktivní widgety (form.aggregates). Načítá se lazy – mount až při
 * prvním překliknutí na tab (mountOnEnter + React.lazy v ResultsTabs, takže
 * recharts chunk se stáhne až tehdy).
 */

import {useMemo} from 'react';
import {Alert, Button, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {searchAggregates} from '@/services/searchApi';
import {buildSearchFormData} from '../searchRequest';
import type {SearchPayloadEntries} from '../hooks/useSearchQuery';
import {useDashboardWidgets} from './useDashboardWidgets';
import {DashboardWidgetCard} from './DashboardWidgetCard';
import type {DashboardWidgetDefinition} from './dashboardWidgets';

interface ResultsDashboardProps {
    /** Filtry posledního hledání (query.lastPayloadEntries) – tentýž payload jako tabulkový výpis. */
    payloadEntries: SearchPayloadEntries;
}

export function ResultsDashboard({payloadEntries}: ResultsDashboardProps) {
    const {t} = useTranslation();
    const {widgets, activeIds, toggleWidget, loaded} = useDashboardWidgets();

    // FormData i klíče dotazu memoizované – změna výběru widgetů nebo nové
    // hledání přegeneruje dotaz (agregace se ptají jen na aktivní widgety).
    const activeKey = useMemo(() => activeIds.join(','), [activeIds]);
    const payloadKey = useMemo(() => JSON.stringify(payloadEntries), [payloadEntries]);
    const formData = useMemo(() => {
        const data = buildSearchFormData(payloadEntries, null, 'asc');
        data.append('aggregates', activeKey);
        return data;
    }, [payloadEntries, activeKey]);

    const {data: aggregates, isLoading, error} = useQuery({
        queryKey: ['searchAggregates', payloadKey, activeKey],
        queryFn: () => searchAggregates(formData),
        // loaded: čeká se na uložený výběr, aby dotaz neodstartoval s defaulty
        // (všechny widgety) a hned se nepřepočetl po načtení nastavení.
        enabled: loaded && payloadEntries.length > 0 && activeIds.length > 0,
    });

    const activeWidgets = useMemo<DashboardWidgetDefinition[]>(
        () => widgets.filter((widget) => activeIds.includes(widget.id)),
        [widgets, activeIds],
    );

    return (
        <div className="mt-3">
            {/* Výběr aktivních přehledů – perzistentní user setting (BE stored). */}
            <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label={t('atlas.advancedSearch.dashboard.toggleGroup')}>
                {widgets.map((widget) => {
                    const isActive = activeIds.includes(widget.id);
                    return (
                        <Button
                            key={widget.id}
                            type="button"
                            size="sm"
                            variant={isActive ? 'secondary' : 'outline-secondary'}
                            aria-pressed={isActive}
                            onClick={() => toggleWidget(widget.id)}
                        >
                            {t(widget.titleKey as never)}
                        </Button>
                    );
                })}
            </div>

            {error && (
                <Alert variant="danger">{t('atlas.advancedSearch.dashboard.loadFailed')}</Alert>
            )}
            {!error && activeWidgets.length === 0 && (
                <Alert variant="info">{t('atlas.advancedSearch.dashboard.noActive')}</Alert>
            )}

            {/* Karty zůstávají mountované i během (re)načítání – data se po resolve
                doplní na místě; běžící dotaz indikuje overlay se spinnerem (žádné
                blikání celé mřížky při přepnutí widgetu či novém hledání). */}
            {!error && activeWidgets.length > 0 && (
                <div className="position-relative">
                    <div className="row g-3">
                        {activeWidgets.map((widget) => (
                            <div className="col-lg-6" key={widget.id} data-testid={`dashboard-widget-${widget.id}`}>
                                <DashboardWidgetCard widget={widget} buckets={aggregates?.[widget.id] ?? []}/>
                            </div>
                        ))}
                    </div>
                    {isLoading && (
                        <div
                            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 rounded"
                            style={{zIndex: 5}}
                        >
                            <Spinner animation="border" role="status" variant="secondary">
                                <span className="visually-hidden">{t('common.loading')}</span>
                            </Spinner>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ResultsDashboard;