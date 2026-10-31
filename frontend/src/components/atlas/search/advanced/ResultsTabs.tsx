/**
 * Čtyři taby výsledků: tabulkový výpis (SearchResultsView – paginace, řazení),
 * mapový výpis a dashboard (placeholdery připravovaných funkcí) a download
 * (volba exportního formátu). Tlačítko hromadných úprav je mimo taby (viditelné
 * pro všechny taby), panel se vykresluje v offcanvasu ze spodu jako doteď.
 */

import {useState, type ReactNode} from 'react';
import {Alert, Button, Form, Offcanvas, Tab, Tabs} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {SearchResultsView} from '../components/SearchResultsView';
import {ResultsMap} from './ResultsMap';
import type {SearchQuery} from '../hooks/useSearchQuery';
import {PAGE_SIZE_OPTIONS} from '../searchRequest';

/** Exportní formáty tabu Download – dnes aktivní jen Excel; další (CSV, GeoJSON) přidáním záznamu. */
const EXPORT_FORMATS = [
    {id: 'excel', labelKey: 'atlas.advancedSearch.download.formatExcel'},
] as const;

interface ResultsTabsProps {
    query: SearchQuery;
    /** BulkEdit panel (jen mapAdmin/bulkEditor) – tlačítko mimo taby, offcanvas ze spodu. */
    children?: ReactNode;
    onExport: () => void;
    exportLoading: boolean;
    exportMessage: string;
    /** Upozornění k Excel exportu podle práv uživatele. */
    exportHint: string;
}

export function ResultsTabs({
                                query,
                                children,
                                onExport,
                                exportLoading,
                                exportMessage,
                                exportHint,
                            }: ResultsTabsProps) {
    const {t} = useTranslation();
    const [format, setFormat] = useState<string>('excel');
    const [showBulkEdit, setShowBulkEdit] = useState(false);

    return (
        <div className="mt-3">
            {/* Hlavička výsledků: taby vlevo, hromadné úpravy vpravo (mimo taby). */}
            <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                <div className="flex-grow-1">
                    <Tabs defaultActiveKey="table">
                        <Tab
                            eventKey="table"
                            title={<span><i className="bi bi-table me-1" aria-hidden="true"/>{t('atlas.advancedSearch.tabs.table')}</span>}
                        >
                            <SearchResultsView
                                records={query.records}
                                totalCount={query.totalCount}
                                currentPage={query.currentPage}
                                pageSize={query.pageSize}
                                pageSizeOptions={PAGE_SIZE_OPTIONS}
                                isLoading={query.isLoading}
                                sortBy={query.sortBy}
                                sortDescending={query.sortOrder === 'desc'}
                                onPageChange={query.changePage}
                                onPageSizeChange={(size) => {
                                    void query.changePageSize(size);
                                }}
                                onSortChange={(nextSortBy, nextOrder) => {
                                    void query.changeSort(nextSortBy, nextOrder);
                                }}
                            />
                        </Tab>
                        {/* Mapový výpis: mřížka jako v MapPreview + markery centroidů
                            kvadrantů celého výsledku (agregace na backendu).
                            mountOnEnter = lazy load při prvním překliknutí na tab. */}
                        <Tab
                            eventKey="map"
                            title={<span><i className="bi bi-map me-1" aria-hidden="true"/>{t('atlas.advancedSearch.tabs.map')}</span>}
                            mountOnEnter
                        >
                            <ResultsMap payloadEntries={query.lastPayloadEntries}/>
                        </Tab>

                        {/* ponytail: dashboard agregovaných výsledků – až backend dodá agregace */}
                        <Tab
                            eventKey="dashboard"
                            title={<span><i className="bi bi-graph-up me-1" aria-hidden="true"/>{t('atlas.advancedSearch.tabs.dashboard')}</span>}
                        >
                            <Alert variant="info" className="mt-3">
                                <i className="bi bi-graph-up me-1" aria-hidden="true"/>
                                {t('atlas.advancedSearch.tabs.dashboardPlaceholder')}
                            </Alert>
                        </Tab>

                        <Tab
                            eventKey="download"
                            title={<span><i className="bi bi-download me-1" aria-hidden="true"/>{t('atlas.advancedSearch.tabs.download')}</span>}
                        >
                            <div className="mt-3">
                                <Form.Group className="mb-3" controlId="export-format">
                                    <Form.Label>{t('atlas.advancedSearch.download.formatLabel')}</Form.Label>
                                    {EXPORT_FORMATS.map((exportFormat) => (
                                        <Form.Check
                                            key={exportFormat.id}
                                            type="radio"
                                            name="export-format"
                                            label={t(exportFormat.labelKey)}
                                            checked={format === exportFormat.id}
                                            onChange={() => setFormat(exportFormat.id)}
                                        />
                                    ))}
                                    <Form.Text muted>{exportHint}</Form.Text>
                                </Form.Group>
                                <Button variant="primary" size="sm" onClick={onExport} disabled={exportLoading}>
                                    {exportLoading && (
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"/>
                                    )}
                                    {t('atlas.advancedSearch.download.submit')}
                                </Button>
                                {exportMessage && <div className="text-muted small mt-2">{exportMessage}</div>}
                            </div>
                        </Tab>
                    </Tabs>
                </div>

                {children && (
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        className="mt-1"
                        onClick={() => setShowBulkEdit(true)}
                    >
                        {t('atlas.search.bulkEdit.openButton')}
                    </Button>
                )}
            </div>

            {children && (
                <Offcanvas
                    show={showBulkEdit}
                    onHide={() => setShowBulkEdit(false)}
                    placement="bottom"
                    className="bulk-edit-offcanvas"
                >
                    <Offcanvas.Header closeButton closeLabel={t('common.close')}>
                        <Offcanvas.Title>{t('atlas.search.bulkEdit.title')}</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        {children}
                    </Offcanvas.Body>
                </Offcanvas>
            )}
        </div>
    );
}
