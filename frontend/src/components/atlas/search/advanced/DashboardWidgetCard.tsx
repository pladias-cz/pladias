
/**
 * Karta jednoho widgetu dashboardu: titulek + barplot (recharts). Vertikální
 * layout pro „timeline" agregace (rok nálezu, výšková pásma), horizontální pro
 * kategoriální s dlouhými labely (licence, herbáře). Sloupce nesou barvu
 * widgetu – zeleno-hnědou paletu kategorií filtrů (dashboardWidgets).
 */

import {Card} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {DashboardBucket} from '@/services/searchApi';
import type {DashboardWidgetDefinition} from './dashboardWidgets';

interface DashboardWidgetCardProps {
    widget: DashboardWidgetDefinition;
    buckets: DashboardBucket[];
}

const TICK_STYLE = {fontSize: 11};

export function DashboardWidgetCard({widget, buckets}: DashboardWidgetCardProps) {
    const {t} = useTranslation();

    // recharts: label null = hodnota nezadána (přeloží se); klíč kvůli možným duplicitám
    const data = buckets.map((bucket, index) => ({
        name: bucket.label ?? t('atlas.advancedSearch.dashboard.notSpecified'),
        count: bucket.count,
        key: `${bucket.label ?? 'null'}-${index}`,
    }));
    const seriesName = t('atlas.advancedSearch.dashboard.recordCount');

    return (
        <Card className="h-100">
            <Card.Header className="small fw-semibold">{t(widget.titleKey as never)}</Card.Header>
            <Card.Body>
                <div style={{height: 300}}>
                    {widget.layout === 'vertical' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{top: 8, right: 12, left: 4, bottom: 4}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={64}
                                    tick={TICK_STYLE}
                                />
                                <YAxis allowDecimals={false} tick={TICK_STYLE}/>
                                <Tooltip/>
                                <Bar dataKey="count" name={seriesName} fill={widget.color}/>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{top: 4, right: 12, left: 4, bottom: 4}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" allowDecimals={false} tick={TICK_STYLE}/>
                                <YAxis type="category" dataKey="name" width={120} tick={TICK_STYLE}/>
                                <Tooltip/>
                                <Bar dataKey="count" name={seriesName} fill={widget.color}/>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
}
