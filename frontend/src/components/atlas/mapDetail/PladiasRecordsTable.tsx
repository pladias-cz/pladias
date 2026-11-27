import {Button, Table} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {RecordPladias} from '@/models';
import type InstanceConfig from '@/models/InstanceConfig';
import './RecordsTable.scss';
import {HerbariumQualityCheckbox} from './HerbariumQualityCheckbox';
import {AddCommentModal} from './AddCommentModal';
import {ValidationStatusId, ValidationStatusMeta} from '@/core/validationStatus';
import RichTextMessage from '@/components/RichTextMessage';
import {ValidationStatusCheckboxes} from './ValidationStatusCheckboxes';
import {OriginalityStatusIcons} from './OriginalityStatusIcons';
import {IncludeInMapCheckbox} from './IncludeInMapCheckbox';
import {DataTableFilterCell, DataTableHeaderCell} from '@/core/dataTable';
import {getPhytochorions} from '@/services/searchApi';
import {useCatalogQuery} from '@/query/useCatalogQuery';
import type {PhytochorionOption} from '@/services/searchApi';
import {
    applyRecordTableControls,
    countMatchingRecords,
    pladiasSearchFields,
    sortableKeyOf,
} from './recordTableFiltering';
import type {RecordTableFilter} from './recordTableFiltering';
import {useInstanceConfig} from '@/context/InstanceConfigContext';
import {useUser} from '@/context/UserContext';
import {markCommentAsRead} from '@/services/recordApi';
import {notifyApiError} from '@/stores/notificationStore';

interface PladiasRecordsTableProps {
    records: RecordPladias[];
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
    onRecordCenter?: (record: RecordPladias) => void;
    registerScrollFn?: (scrollFn: (recordId: number) => void) => void;
    tableName?: string;
    onRecordUpdated?: (record: RecordPladias) => void;
    showTaxonName?: boolean;
    showExpandAllButton?: boolean;
    /** Řízená množina rozbalených řádků – vyhledávání ji potřebuje, aby mohlo tlačítko
     *  „Rozbalit vše“ vykreslit v jedné řádce s paginací (SearchResultsView). Bez zadání
     *  se použije interní state a tlačítko (showExpandAllButton) zůstane nad tabulkou. */
    expandedRecordIds?: Set<number>;
    /** Notifikace o změně množiny rozbalených řádků v řízeném režimu. */
    onExpandedRecordIdsChange?: (ids: Set<number>) => void;
    /** Kvadrant v buňce: mapDetail (záznamy jednoho čtverce) jen písmeno, výsledky z celé
     * republiky (vyhledávání, nové komentáře) plný kód, např. 6261b – ten je zároveň odkazem
     * na mapDetail daného taxonu a čtverce. Default: písmeno. */
    showFullQuadrantCode?: boolean;
    /** Aktivní řazení vyhledávání (sort klíč backendu); hlavičky řadí jen s onHeaderSort. */
    sort?: { sortBy: string | null; descending: boolean };
    /** Klik na řaditelnou hlavičku – předává sort klíč backendu. */
    onHeaderSort?: (sortBy: string) => void;
    /** Řádky ovládatelné uživatelem (mapDetail): řaditelné hlavičky a filtrovací řádka
     *  počítané na klientu. Vypnuto (default) = chování vyhledávání/nových komentářů:
     *  řadí backend přes `onHeaderSort`, filtry žádnou řádku nepřidávají. */
    enableColumnControls?: boolean;
}

// Helper function to determine visibility of UI elements based on validation status
// Matches legacy JS behavior from atlas_detailed_map.js
const getVisibilityByStatus = (record: RecordPladias, instanceConfig: InstanceConfig) => {
    const statusId = record.validationStatusId;
    const isProjectExcerptions = instanceConfig.isExcerptionProject(record.projectId);

    return {
        // IncludeInMap: shown for UNCERTAIN (1) and ACCEPTED (3), hidden for UNPROCESSED (0) and DECLINED (2)
        showIncludeInMap: statusId === ValidationStatusId.UNCERTAIN || statusId === ValidationStatusId.ACCEPTED,

        // HerbariumQuality: shown only for excerption projects (conf `atlas.excerptionProjectIds`), and for statuses UNCERTAIN (1), DECLINED (2), ACCEPTED (3)
        showHerbariumQuality: isProjectExcerptions &&
            (statusId === ValidationStatusId.UNCERTAIN ||
                statusId === ValidationStatusId.DECLINED ||
                statusId === ValidationStatusId.ACCEPTED),

        // Originality: shown only for ACCEPTED (3)
        showOriginality: statusId === ValidationStatusId.ACCEPTED,
    };
};

/**
 * Hlavička sloupce → sort klíč backendu (sortBy formuláře vyhledávání).
 * Sloupce Nálezci a Původ backend řadit neumí, zůstávají vždy neřaditelné.
 */
const SORTABLE_HEADERS: Record<string, string> = {
    taxon: 'taxonName',
    square: 'square',
    phytochorion: 'phytochorion',
    locality: 'locality',
    date: 'date',
    validationStatus: 'validationStatus',
};

/** Id hlavičky sloupce → id filtru/řadicího klíče (recordTableFiltering). */
const COLUMN_FILTER_IDS: Record<string, RecordTableFilter['id']> = {
    square: 'quadrantLetter',
    phytochorion: 'phytochorion',
    locality: 'locality',
    finders: 'finders',
    date: 'date',
    project: 'project',
    validationStatus: 'validationStatus',
};

/** Pořadí statusů ve filtru (shodné s ValidationStatusCheckboxes). */
const VALIDATION_STATUS_FILTER_IDS = [
    ValidationStatusId.ACCEPTED,
    ValidationStatusId.UNCERTAIN,
    ValidationStatusId.DECLINED,
    ValidationStatusId.UNPROCESSED,
] as const;

/** Filtr fytochorionu – typeahead nad názvy číselníku („17. Čechy“); filtruje se
 * wildcardem do čísla i názvu, proto se vybírá label, ne id. */
function phytochorionNameOptions(phytochorions: readonly PhytochorionOption[]): Array<{ value: string; label: string }> {
    return phytochorions
        .filter(phytochorion => (phytochorion.name ?? '') !== '')
        .map(phytochorion => ({value: phytochorion.name, label: phytochorion.name}));
}

/** Placeholdry textových filtrů sloupců. */
const FILTER_PLACEHOLDERS: Partial<Record<RecordTableFilter['id'], string>> = {
    quadrantLetter: 'atlas.mapDetail.filter.quadrantLetter',
    locality: 'atlas.mapDetail.filter.locality',
    finders: 'atlas.mapDetail.filter.finders',
    date: 'atlas.mapDetail.filter.date',
    project: 'atlas.mapDetail.filter.project',
};

export function PladiasRecordsTable({
                                        records,
                                        highlightedRecordId,
                                        onRecordHover,
                                        onRecordCenter,
                                        registerScrollFn,
                                        onRecordUpdated,
                                        showTaxonName = false,
                                        showExpandAllButton = false,
                                        expandedRecordIds,
                                        onExpandedRecordIdsChange,
                                        showFullQuadrantCode = false,
                                        sort,
                                        onHeaderSort,
                                        enableColumnControls = false
                                    }: PladiasRecordsTableProps) {
    const {t} = useTranslation();
    const user = useUser();
    const instanceConfig = useInstanceConfig();
    const isVascular = instanceConfig.isVascular;
    const [internalExpandedIds, setInternalExpandedIds] = useState<Set<number>>(new Set());
    const [readCommentIds, setReadCommentIds] = useState<Set<number>>(new Set());
    const [markingCommentIds, setMarkingCommentIds] = useState<Set<number>>(new Set());
    const [commentModalRecordId, setCommentModalRecordId] = useState<number | null>(null);
    const rowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

    // Ovládání řádků (mapDetail): filtry sloupců a lokální řazení. Číselníky
    // (fytochoriony, projekty) se načítají centrálně a cachují (CACHED_CATALOGS)
    // a filtrují se klientsky v záznamech čtverce.
    const [columnFilters, setColumnFilters] = useState<RecordTableFilter[]>([]);
    const [localSort, setLocalSort] = useState<{ columnId: string; descending: boolean } | null>(null);
    // Dropdown projektového filtru (sloupec Původ): jen názvy projektů skutečně
    // zastoupených v tomto čtverci (bez duplicit, seřazené česky) – číselník
    // všech projektů by nabízel i projekty, které tady žádné záznamy nemají.
    // Filtr porovnává část názvu v projectName, takže uživatel může zadat i
    // libovolný substring bez výběru z nápovědy.
    const projectNameOptions = useMemo(() => {
        const seen = new Set<string>();
        return records
            .map(record => record.projectName)
            .filter((name): name is string => {
                if (name === null || name === undefined || name === '' || seen.has(name)) {
                    return false;
                }
                seen.add(name);
                return true;
            })
            .map(name => ({value: name, label: name}))
            .sort((a, b) => a.label.localeCompare(b.label, 'cs'));
    }, [records]);
    const phytochorions = useCatalogQuery<PhytochorionOption>(
        ['phytochorions'], getPhytochorions, {enabled: enableColumnControls && isVascular});
    const phytochorionOptions = useMemo(
        () => (enableColumnControls && isVascular ? phytochorionNameOptions(phytochorions) : []),
        [phytochorions, enableColumnControls, isVascular],
    );

    /** Id filtru sloupce; sloupce bez filtru (Taxon) → null. */
    const filterIdOf = (columnId: string): RecordTableFilter['id'] | null =>
        COLUMN_FILTER_IDS[columnId] ?? null;

    const filterValueOf = (columnId: string): string => {
        const filterId = filterIdOf(columnId);
        return columnFilters.find(filter => filter.id === filterId)?.value ?? '';
    };

    const hasActiveFilters = columnFilters.some(filter => filter.value.trim() !== '');

    const setFilterValue = (columnId: string, value: string) => {
        const filterId = filterIdOf(columnId);
        if (filterId === null) {
            return;
        }
        setColumnFilters(prev => {
            const exists = prev.some(filter => filter.id === filterId);
            return exists
                ? prev.map(filter => (filter.id === filterId ? {...filter, value} : filter))
                : [...prev, {id: filterId, value}];
        });
    };

    const clearColumnFilters = () => {
        setColumnFilters([]);
        setLocalSort(null);
    };

    /** Klik na hlavičku: asc → desc → vzestupně od znovu (cyklus jako DataTable). */
    const handleLocalSort = (columnId: string) => {
        setLocalSort(prev => {
            if (!prev || prev.columnId !== columnId) {
                return {columnId, descending: false};
            }
            return {columnId, descending: !prev.descending};
        });
    };

    /** Zobrazené řádky: filtry + řazení na klientu (data celého čtverce už jsou v paměti). */
    const visibleRecords = useMemo(() => {
        if (!enableColumnControls) {
            return records;
        }
        const sortKey = localSort !== null ? sortableKeyOf(filterIdOf(localSort.columnId) ?? '') : null;
        return applyRecordTableControls(records, columnFilters, sortKey, localSort?.descending ?? false);
    }, [records, columnFilters, localSort, enableColumnControls]);

    const matchingCount = useMemo(
        () => countMatchingRecords(records.map(pladiasSearchFields), columnFilters),
        [records, columnFilters],
    );

    /** Směr aktivního řazení sloupce (jen v režimu lokálního řazení). */
    const directionFor = (columnId: string): 'asc' | 'desc' | null => {
        if (!enableColumnControls) {
            return null;
        }
        const sortKey = sortableKeyOf(filterIdOf(columnId) ?? '');
        if (localSort === null || sortKey === null || sortableKeyOf(filterIdOf(localSort.columnId) ?? '') !== sortKey) {
            return null;
        }
        return localSort.descending ? 'desc' : 'asc';
    };

    /** Stav řazení hlavičky: lokální (mapDetail), nebo serverové (vyhledávání). */
    const sortIndicatorFor = (columnId: string): 'asc' | 'desc' | null => {
        if (enableColumnControls) {
            return directionFor(columnId);
        }
        const sortBy = SORTABLE_HEADERS[columnId];
        return sortBy != null && sortBy === sort?.sortBy ? (sort?.descending ? 'desc' : 'asc') : null;
    };

    // Řízený režim rozbalení (vyhledávání): o rozbalených řádcích rozhoduje rodič,
    // který tlačítko „Rozbalit vše“ vykresluje ve svém toolbatu paginace; jinak
    // interní state (mapDetail, nové komentáře). Přechody vedou vždy přes setExpandedIds.
    const effectiveExpandedIds = expandedRecordIds ?? internalExpandedIds;

    const setExpandedIds = (updater: (prev: Set<number>) => Set<number>) => {
        const next = updater(effectiveExpandedIds);
        if (expandedRecordIds !== undefined) {
            onExpandedRecordIdsChange?.(next);
            return;
        }
        setInternalExpandedIds(next);
    };

    const isAllExpanded = records.length > 0 && effectiveExpandedIds.size === records.length;

    // Hooks must stay above any conditional return (rules-of-hooks). Prune ids of rows
    // that disappeared from `records` – render-phase update guarded by comparison
    // (React docs: adjusting state when a prop changes, without an effect).
    const [prevRecords, setPrevRecords] = useState(records);
    if (records !== prevRecords) {
        setPrevRecords(records);
        // nová data (přepnutí kvadrantu, refetch) = nový základ pro řazení i filtry:
        // InfoPanel tabulku přelistovává přes key, proto se stav filtrů vrací do výchozího
        // stavu; bez toho by filtr zůstal aktivní nad záznamy jiného taxonu/čtverce
        setColumnFilters([]);
        setLocalSort(null);
        // v řízeném režimu prune řeší rodič – dítě nesmí měnit stav rodiče během renderu
        if (expandedRecordIds === undefined) {
            const validRecordIds = new Set(records.map((record) => record.id));
            setInternalExpandedIds((prev) => {
                const next = new Set(Array.from(prev).filter((id) => validRecordIds.has(id)));
                return next.size === prev.size ? prev : next;
            });
        }
    }

    const toggleExpand = (recordId: number) => {
        const record = records.find(r => r.id === recordId);
        if (record && onRecordCenter) {
            onRecordCenter(record);
        }

        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(recordId)) {
                next.delete(recordId);
            } else {
                next.add(recordId);
            }
            return next;
        });

        // Scroll to the row when explicitly clicking to expand
        if (rowRefs.current[recordId]) {
            rowRefs.current[recordId]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    };

    const toggleExpandAll = () => {
        if (isAllExpanded) {
            setExpandedIds(() => new Set());
            return;
        }

        setExpandedIds(() => new Set(records.map((record) => record.id)));
    };

    const handleMarkCommentAsRead = async (commentId: number) => {
        setMarkingCommentIds((prev) => {
            const next = new Set(prev);
            next.add(commentId);
            return next;
        });

        try {
            await markCommentAsRead(commentId, user.id);
            setReadCommentIds((prev) => {
                const next = new Set(prev);
                next.add(commentId);
                return next;
            });
        } catch (error) {
            notifyApiError(error, t('atlas.mapDetail.markCommentAsReadError'));
        } finally {
            setMarkingCommentIds((prev) => {
                const next = new Set(prev);
                next.delete(commentId);
                return next;
            });
        }
    };

    // Register scroll function for map hover to use
    useEffect(() => {
        if (registerScrollFn) {
            const scrollFn = (recordId: number) => {
                if (rowRefs.current[recordId]) {
                    rowRefs.current[recordId]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }
            };
            registerScrollFn(scrollFn);
        }
    }, [registerScrollFn]);

    const handleHeaderSort = (columnId: string) => {
        const sortBy = SORTABLE_HEADERS[columnId];
        if (sortBy != null && onHeaderSort) {
            onHeaderSort(sortBy);
        }
    };

    /** Hlavička sloupce: s ovládáním řádků (mapDetail) nebo s `onHeaderSort`
     * (vyhledávání) klikatelná buňka `DataTableHeaderCell` – indikátor, tooltip,
     * kurzor; jinak původní plain <th>. V režimu `enableColumnControls` se do
     * hlavičky vkládá i ovládací prvek filtru (`renderFilterControl`); tooltip se
     * v tom režimu přebírá z placeholdru filtru, aby nekolidoval s řazením. */
    const renderHeader = (columnId: string, label: string, title?: string, filterPlaceholder?: string) => {
        if (!onHeaderSort && !enableColumnControls) {
            return <th title={title}>{label}</th>;
        }
        const sortKey = enableColumnControls ? sortableKeyOf(filterIdOf(columnId) ?? '') : SORTABLE_HEADERS[columnId];
        const canSort = sortKey != null;
        const onSort = enableColumnControls ? handleLocalSort : handleHeaderSort;
        const indicator = sortIndicatorFor(columnId);
        // sloupec bez filtru (Taxon) → hlavička jen s labellem
        if (filterIdOf(columnId) === null) {
            return (
                <DataTableHeaderCell
                    label={label}
                    columnId={columnId}
                    sortIndicator={indicator}
                    canSort={canSort}
                    onSort={onSort}
                    title={title}
                />
            );
        }
        // řadit klikem jen mimo ovládací prvky filtru (input/select uvnitř <th>)
        const handleHeaderClick = (event: React.MouseEvent<HTMLTableCellElement>) => {
            if (!canSort || event.target instanceof HTMLElement && event.target.closest('input,select')) {
                return;
            }
            onSort(columnId);
        };
        return (
            <th
                title={filterPlaceholder ?? title}
                style={{cursor: canSort ? 'pointer' : 'default'}}
                onClick={handleHeaderClick}
                className={canSort ? 'cursor-pointer select-none' : ''}
            >
                <div title={title}>{label}{indicator === 'asc' ? ' 🔼' : indicator === 'desc' ? ' 🔽' : ''}</div>
                {enableColumnControls && renderFilterControl(columnId)}
            </th>
        );
    };

    /** Ovládací prvek filtru sloupce: select statusu a projektů, typeahead fytochorionu,
     * textové filtry písmeno / obec / sběratel / rok. */
    const renderFilterControl = (columnId: string) => {
        const filterId = filterIdOf(columnId);
        if (filterId === null) {
            return null;
        }
        const value = filterValueOf(columnId);
        const onChange = (next: string) => setFilterValue(columnId, next);
        if (filterId === 'validationStatus') {
            const options = VALIDATION_STATUS_FILTER_IDS
                // Nevyřízený status vidí jen mapAdmin (stejně jako ValidationStatusCheckboxes)
                .filter(statusId => statusId !== ValidationStatusId.UNPROCESSED || user.isMapAdmin)
                .map(statusId => ({
                    value: String(statusId),
                    label: `${statusId} – ${t(ValidationStatusMeta[statusId].i18nKey as never)}`,
                }));
            return (
                <DataTableFilterCell
                    control="select"
                    value={value}
                    onChange={onChange}
                    placeholder={t('common.table.filter.all')}
                    options={options}
                />
            );
        }
        const placeholderKey = FILTER_PLACEHOLDERS[filterId];
        return (
                <DataTableFilterCell
                    control={filterId === 'phytochorion' || filterId === 'project' ? 'typeahead' : 'text'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholderKey !== undefined ? t(placeholderKey as never) : undefined}
                    options={filterId === 'phytochorion' ? phytochorionOptions
                        : filterId === 'project' ? projectNameOptions
                        : []}
                />
        );
    };

    if (records.length === 0) {
        return null;
    }

    return (
        <>
            {showExpandAllButton && (
                <div className="d-flex justify-content-end mb-2">
                    <Button variant="outline-secondary" size="sm" onClick={toggleExpandAll}>
                        {isAllExpanded ? t('atlas.mapDetail.collapseAll') : t('atlas.mapDetail.expandAll')}
                    </Button>
                </div>
            )}
            <Table striped bordered hover size="sm">
                <thead>
                <tr>
                    {showTaxonName && renderHeader('taxon', t('atlas.mapDetail.taxon'))}
                    {renderHeader('square', t('atlas.mapDetail.squareAbbrev'), t('atlas.mapDetail.quadrant'), t('atlas.mapDetail.filter.quadrantLetter'))}
                    {isVascular && renderHeader('phytochorion', t('atlas.mapDetail.phytochorionAbbrev'), t('atlas.mapDetail.phytochorion'), t('atlas.mapDetail.filter.phytochorion'))}
                    {renderHeader('locality', t('atlas.mapDetail.locality'), undefined, t('atlas.mapDetail.filter.locality'))}
                    {renderHeader('finders', t('atlas.mapDetail.collectors'), undefined, t('atlas.mapDetail.filter.finders'))}
                    {renderHeader('date', t('atlas.mapDetail.date'), undefined, t('atlas.mapDetail.filter.date'))}
                    {renderHeader('project', t('atlas.mapDetail.originality'), undefined, t('atlas.mapDetail.filter.project'))}
                    {renderHeader('validationStatus', t('atlas.mapDetail.validationStatus'), undefined, t('common.table.filter.all'))}
                </tr>
                </thead>
                <tbody>
                {visibleRecords.map((record) => {
                    const isHighlighted = highlightedRecordId === record.id;
                    const isExpanded = effectiveExpandedIds.has(record.id);
                    // plný kód kvadrantu (vyhledávání, nové komentáře) nese odkaz na mapDetail daného
                    // taxonu a čtverce – bez taxonu nebo kvadrantu zůstane prostý text
                    const mapDetailUrl = showFullQuadrantCode && record.taxonId != null && record.computedQuadrantCode
                        ? `/atlas/mapDetail/${record.taxonId}/${record.computedSquareCode ?? record.computedQuadrantCode.slice(0, -1)}`
                        : null;
                    return (
                        // `key` musí nést samotná položka mapy, tedy fragment – klíč
                        // na vnořeném <tr> React nehledá a hlásí chybějící key.
                        <React.Fragment key={record.id}>
                            <tr
                                ref={(el) => {
                                    rowRefs.current[record.id] = el;
                                }}
                                className={`${isHighlighted ? 'table-active highlight-row' : ''} ${isExpanded ? 'table-success' : ''}`}
                                onMouseEnter={() => onRecordHover?.(record.id)}
                                onMouseLeave={() => onRecordHover?.(null)}
                            >
                                {/* Kvadrant (a-d) dopočítaný z GPS prostorovým dotazem. Tooltip vždy nese celý kód
                                    (např. 6152a); v buňce jen písmeno (mapDetail – záznamy jednoho čtverce) nebo
                                    plný kód (vyhledávání, nové komentáře – záznamy z celé republiky) – plný kód
                                    je odkazem na mapDetail daného taxonu a čtverce (mapDetailUrl). */}
                                {/* Taxon má vlastní sloupec (vyhledávání, nové komentáře); mapDetail ho nezobrazuje. */}
                                {showTaxonName && (
                                    <td className="align-text-top">
                                        {record.taxonNameHtml
                                            ? <RichTextMessage html={record.taxonNameHtml}/>
                                            : (record.taxonNameLat ?? '-')}
                                    </td>
                                )}
                                <td className="align-text-top" title={record.computedQuadrantCode || ''}>
                                    {record.computedQuadrantCode
                                        ? (mapDetailUrl
                                            ? <Link to={mapDetailUrl}>{record.computedQuadrantCode}</Link>
                                            : (showFullQuadrantCode ? record.computedQuadrantCode : record.computedQuadrantCode.slice(-1)))
                                        : '-'}
                                </td>
                                {isVascular && (
                                    // Fytochorion: v buňce jen kód (phytoId), celý název nese tooltip.
                                    <td className="align-text-top"
                                        title={record.phytochorionName || ''}>
                                        {record.phytochorionPhytoId || '-'}
                                    </td>
                                )}
                                <td className="align-text-top">
                                    <button
                                        className="btn btn-link p-0 text-start"
                                        onClick={() => toggleExpand(record.id)}
                                        style={{textDecoration: 'none', color: 'inherit'}}
                                    >
                                        <b>
                                            {record.nearestTownText || record.nearestTownName || ''}
                                            {record.districtName && t('atlas.mapDetail.districtInline', {district: record.districtName})}
                                        </b>
                                        {record.locality && (<br/>)}
                                        {record.locality && (
                                            <span>
                                                     {record.locality.length > 100
                                                         ? `${record.locality.substring(0, 100)}...`
                                                         : record.locality}
                                             </span>
                                        )}
                                        {record.source && (
                                            <span><br/>
                                             <b>{t('atlas.mapDetail.sourceLower')}: </b>
                                                {record.source}
                                                <br/></span>
                                        )}
                                        {!isVascular && record.substrate && (
                                            <span><br/>
                                             <b>{t('atlas.mapDetail.substrate')}:</b> {record.substrate}<br/></span>
                                        )}

                                    </button>
                                    {record.herbariums.length > 0 && (
                                        <span><br/>
       <b>{t('atlas.mapDetail.herbariumLower')}:</b>{' '}
                                            {record.herbariums.map((herbarium, index) => (
                                                <React.Fragment key={herbarium.id}>
                                                    {index > 0 && ', '}

                                                    <span title={herbarium.label}>{herbarium.name}</span>
                                                </React.Fragment>
                                            ))}
                                            {/* Herbarium quality checkbox - visible based on validation status and project */}
                                            {(() => {
                                                const visibility = getVisibilityByStatus(record, instanceConfig);
                                                if (visibility.showHerbariumQuality) {
                                                    return <HerbariumQualityCheckbox record={record}
                                                                                     onRecordUpdated={onRecordUpdated}/>;
                                                }
                                                return null;
                                            })()}

                                    </span>
                                    )}
                                </td>
                                <td className="finders align-text-top">
                                    <p>
                                        <i>
                                            {record.recordAuthorsNames || '-'}
                                        </i>
                                    </p>
                                    {(record.unresolvedCommentsCount ?? 0) > 0 && (
                                        <p style={{fontSize: '80%'}}>
                                            <span className="bi bi-paperclip" aria-hidden="true"></span>
                                            {' '}{t('atlas.mapDetail.commented')}
                                        </p>
                                    )}
                                    {record.hasHistory && (
                                        <p style={{fontSize: '80%'}}>
                                            <span className="bi bi-pencil" aria-hidden="true"></span>
                                            {' '}{t('atlas.mapDetail.edited')}
                                        </p>
                                    )}
                                </td>
                                <td className="date align-text-top">
                                    {record.dateIso && (
                                        <span title="yyyy-M-d">{record.dateIso}</span>
                                    )}
                                </td>
                                <td className="align-text-top" style={{fontSize: '80%'}}>
                                    {record.projectName || '-'}
                                    {instanceConfig.isNdopProject(record.projectId) && record.originalId && (
                                        <>
                                            <br/>
                                            <a
                                                href={`http://portal.nature.cz/nd/find.php?akce=view&akce2=stopValidaci&karta_id=${record.originalId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                přímý odkaz
                                            </a>
                                        </>
                                    )}
                                    {instanceConfig.isExcerptionProject(record.projectId) && (
                                        <>
                                            <br />
                                            -- <br />
                                            {t('atlas.mapDetail.importedBy')} <b>{record.batchAuthorName}</b>
                                        </>
                                    )}

                                </td>
                                <td className="align-text-top">
                                    {record.canEditValidationFields ? (
                                        <ValidationStatusCheckboxes record={record} onRecordUpdated={onRecordUpdated}/>
                                    ) : (
                                        <div
                                            className="validation-status-info"
                                            style={{
                                                backgroundColor: record.validationStatusColor || '#808080',
                                                padding: '4px 8px',
                                                borderRadius: '3px',
                                                display: 'inline-block'
                                            }}
                                            title={record.validationStatusDescription || ''}
                                        >
                                            <span>{record.validationStatusId}</span>
                                            {record.remarkDoubt && (
                                                <span
                                                    className="fa fa-question"
                                                    aria-hidden="true"
                                                    title={record.remarkDoubt}
                                                    style={{marginLeft: '4px'}}
                                                ></span>
                                            )}
                                        </div>
                                    )}

                                </td>
                            </tr>
                            {isExpanded && (
                                <tr
                                    className="tablesorter-childRow"
                                    key={`child-${record.id}`}
                                    onMouseEnter={() => onRecordHover?.(record.id)}
                                    onMouseLeave={() => onRecordHover?.(null)}
                                >
                                    <td colSpan={(isVascular ? 5 : 6) + (showTaxonName ? 1 : 0)}
                                        style={{padding: '10px 20px', backgroundColor: '#f8f9fa'}}>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div>
                                                    <b>{t('atlas.mapDetail.originalName')}:</b>{' '}
                                                    {record.taxonOriginal}
                                                </div>
                                                <div>
                                                    <b>{t('atlas.mapDetail.localityLower')}:</b> {record.locality || ''}
                                                </div>
                                                {isVascular && (
                                                    <div>
                                                        <b>{t('atlas.mapDetail.nearestTownLower')}:</b> {record.nearestTownText || record.nearestTownName || '-'}
                                                        {record.districtName && t('atlas.mapDetail.districtInline', {district: record.districtName})}
                                                    </div>
                                                )}
                                                {record.latitude && record.longitude && (
                                                    <div>
                                                        <b>{t('atlas.mapDetail.gps')}: </b>
                                                        <a
                                                            href={`http://mapy.cz/turisticka?x=${record.longitude}&y=${record.latitude}&z=16&l=0&source=coor&id=${record.longitude}%2C${record.latitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {record.latitude.toFixed(6)} {record.longitude.toFixed(6)}
                                                        </a>
                                                        {record.gpsCoordsSource && (
                                                            <small> ({record.gpsCoordsSource})</small>
                                                        )}
                                                        <br/>
                                                        {record.gpsPrecision && (
                                                            <>
                                                                <b>{t('atlas.mapDetail.gpsPrecision')}:</b> {record.gpsPrecision} m</>
                                                        )}
                                                    </div>
                                                )}
                                                {(record.altitudeMin || record.altitudeMax) && (
                                                    <div>
                                                        <b>{t('atlas.mapDetail.altitude')}:</b>
                                                        {record.altitudeMin === record.altitudeMax
                                                            ? `${record.altitudeMax} m`
                                                            : `${record.altitudeMin} - ${record.altitudeMax} m`}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-6">
                                                {/* Importní poznámka (Record.comment) – pro kontrolu často klíčová
                                        pro třídění záznamů; v Excel exportech je, tady chyběla. */}
                                                {record.comment && (
                                                    <>
                                                        <br/>
                                                        <b>{t('atlas.mapDetail.comment')}:</b> {record.comment}
                                                    </>
                                                )}

                                                {(record.environment || record.remarkExcerption || record.remarkDoubt || record.remarkOther) && (
                                                    <div>
                                                        <b>{t('atlas.mapDetail.otherNotes')}:</b>
                                                        {record.environment && <><br/>{record.environment}</>}
                                                        {record.remarkExcerption && <><br/>{record.remarkExcerption}</>}
                                                        {record.remarkDoubt && <><br/>{record.remarkDoubt}</>}
                                                        {record.remarkOther && <><br/>{record.remarkOther}</>}
                                                    </div>
                                                )}
                                                <br/>
                                                <span className="fa fa-search" aria-hidden="true"></span>
                                                {' '}
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    as="a"
                                                    href={`/atlas/record/${record.id}`}
                                                    style={{padding: 0, textDecoration: 'none'}}
                                                >
                                                    {t('atlas.mapDetail.editRecordShowDetail')}
                                                </Button>
                                                {' | '}
                                                <Button
                                                    className="btn-primary"
                                                    size="sm"
                                                    onClick={() => setCommentModalRecordId(record.id)}
                                                    style={{padding: 0, textDecoration: 'none'}}
                                                >
                                                    {t('atlas.mapDetail.addComment')}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="row mt-3">
                                            <div className="col-md-6">
                                                {record.comments && record.comments.length > 0 && (
                                                    <div>
                                                        <b>{t('atlas.mapDetail.comments')}:</b>
                                                        {record.comments.map((comment) => (
                                                            <div key={comment.id} className="comment"
                                                                 style={{marginTop: '5px'}}>
                                                                <p style={{margin: '0', fontSize: '85%'}}>
                                                                <span
                                                                    className="comment-author">{comment.authorName}</span>
                                                                    <small> {comment.createTimestamp}</small>:
                                                                    {comment.linkedForCurrentUser && !readCommentIds.has(comment.id) && (
                                                                        <Button
                                                                            variant="outline-secondary"
                                                                            size="sm"
                                                                            style={{
                                                                                padding: '0 4px',
                                                                                marginLeft: '6px',
                                                                                lineHeight: 1
                                                                            }}
                                                                            aria-label={t('atlas.mapDetail.markCommentAsRead', {defaultValue: 'Označit komentář jako přečtený'})}
                                                                            title={t('atlas.mapDetail.markCommentAsRead', {defaultValue: 'Označit komentář jako přečtený'})}
                                                                            onClick={() => handleMarkCommentAsRead(comment.id)}
                                                                            disabled={markingCommentIds.has(comment.id)}
                                                                        >
                                                                            <span className="bi bi-eye"
                                                                                  aria-hidden="true"></span>
                                                                        </Button>
                                                                    )}
                                                                </p>
                                                                <p style={{margin: '2px 0 5px 10px'}}>{comment.message}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td colSpan={isVascular ? 2 : 1}>

                                        <small>{t('atlas.mapDetail.recordIdLabel')}: {record.id}</small>
                                        {record.originalId && (
                                            <>
                                                <br/><small>{t('atlas.mapDetail.externalIdLabel')}: {record.originalId}</small></>
                                        )}
                                        {/* Include in Map - conditionally rendered based on validation status */}
                                        {record.canEditValidationFields ? (
                                            (() => {
                                                const visibility = getVisibilityByStatus(record, instanceConfig);
                                                if (visibility.showIncludeInMap) {
                                                    return <IncludeInMapCheckbox record={record}
                                                                                 onRecordUpdated={onRecordUpdated}/>;
                                                }
                                                return <>
                                                    <br/><small>{t('atlas.mapDetail.includedInMapLabel')}: {record.includedInMap ? t('common.yes') : t('common.no')}</small></>;
                                            })()
                                        ) : (
                                            <>
                                                <br/><small>{t('atlas.mapDetail.includedInMapLabel')}: {record.includedInMap ? t('common.yes') : t('common.no')}</small></>
                                        )}
                                        <br/>

                                        {/* Herbarium Quality display - always show the text, but checkbox is conditional */}
                                        <small>{t('atlas.mapDetail.revisedHerbariumLabel')}: {record.herbariumQuality ? t('common.yes') : t('common.no')}</small>
                                        <br/>

                                        {/* Originality Status - conditionally rendered based on validation status */}
                                        <small>{t('atlas.mapDetail.originalOccurrenceLabel')}: </small>
                                        {record.canEditValidationFields ? (
                                            (() => {
                                                const visibility = getVisibilityByStatus(record, instanceConfig);
                                                if (visibility.showOriginality) {
                                                    return <OriginalityStatusIcons record={record}
                                                                                   onRecordUpdated={onRecordUpdated}/>;
                                                }
                                                return <span>-</span>;
                                            })()
                                        ) : (
                                            <span>{record.originalityStatusName || '-'}</span>
                                        )}

                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
                </tbody>
            </Table>
            {enableColumnControls && hasActiveFilters && (
                <div className="d-flex align-items-center gap-2 mt-1">
                    <small className="text-muted">
                        {t('atlas.mapDetail.filter.matching', {count: matchingCount, total: records.length})}
                    </small>
                    <Button variant="outline-secondary" size="sm" onClick={clearColumnFilters}>
                        {t('common.table.clearFilters')}
                    </Button>
                </div>
            )}
            {enableColumnControls && localSort !== null && (
                <div className="d-flex align-items-center gap-2 mt-1">
                    <small className="text-muted">
                        {t('atlas.mapDetail.filter.sorted', {
                            column: t((SORT_COLUMN_LABEL_KEYS[localSort.columnId] ?? 'atlas.mapDetail.records') as never),
                            order: t(localSort.descending ? 'common.table.sort.descending' : 'common.table.sort.ascending'),
                        })}
                    </small>
                    <Button variant="outline-secondary" size="sm" onClick={() => setLocalSort(null)}>
                        {t('atlas.mapDetail.filter.clearSort')}
                    </Button>
                </div>
            )}
            <AddCommentModal
                show={commentModalRecordId !== null}
                recordId={commentModalRecordId ?? 0}
                onHide={() => setCommentModalRecordId(null)}
            />
        </>
    );
}

export default PladiasRecordsTable;
/** Názvy sloupců ve stavu řazení pod tabulkou. */
const SORT_COLUMN_LABEL_KEYS: Record<string, string> = {
    square: 'atlas.mapDetail.quadrant',
    phytochorion: 'atlas.mapDetail.phytochorion',
    locality: 'atlas.mapDetail.locality',
    finders: 'atlas.mapDetail.collectors',
    date: 'atlas.mapDetail.date',
    project: 'atlas.mapDetail.originality',
    validationStatus: 'atlas.mapDetail.validationStatus',
};

/** Placeholdry textových filtrů sloupců. */
