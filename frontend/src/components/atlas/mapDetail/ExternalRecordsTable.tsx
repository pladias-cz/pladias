import {Button, Table} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {RecordGbifMinimal} from '@/models/AtlasRecords';
import {DataTableFilterCell} from '@/core/dataTable';
import {
    applyExternalTableControls,
    countMatchingRecords,
    externalSearchFields,
} from './recordTableFiltering';
import type {ExternalSortKey, RecordTableFilter} from './recordTableFiltering';
import './RecordsTable.scss';

/**
 * URL detailu záznamu podle zdroje: ČBS záznamy nesou iNaturalist observation id
 * (z tabulky gbif.geoserver_inat_cbs_main), záznamy GBIF/iNaturalist GBIF
 * occurrence id (z tabulky gbif.records) – jen ČBS tedy odkazuje na iNaturalist.
 */
function externalRecordDetailUrl(record: Pick<RecordGbifMinimal, 'id' | 'project'>): string {
    return record.project === 'cbs'
        ? `https://www.inaturalist.org/observations/${record.id}`
        : `https://www.gbif.org/occurrence/${record.id}`;
}

interface ExternalRecordsTableProps {
    records: RecordGbifMinimal[];
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
    tableName?: string;
    registerScrollFn?: (scrollFn: (recordId: number) => void) => void;
}

/** Filtrované sloupce externí tabulky (ID a souřadnice se nefiltrují). */
type ExternalFilterId = 'quadrantLetter' | 'institution' | 'date' | 'finders';

export function ExternalRecordsTable({
                                         records,
                                         highlightedRecordId,
                                         onRecordHover,
                                         registerScrollFn
                                     }: ExternalRecordsTableProps) {
    const {t} = useTranslation();
    const rowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});
    const [columnFilters, setColumnFilters] = useState<RecordTableFilter[]>([]);
    const [sort, setSort] = useState<{ key: ExternalSortKey; descending: boolean } | null>(null);

    // Register scroll function for map hover to use. Hooks must run before the
    // early return below (rules-of-hooks); with empty records the registered
    // scroll function simply finds no row – harmless no-op.
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

    const filterValueOf = (filterId: RecordTableFilter['id']) =>
        columnFilters.find(filter => filter.id === filterId)?.value ?? '';

    const setFilterValue = (filterId: RecordTableFilter['id'], value: string) => {
        setColumnFilters(prev => prev.some(filter => filter.id === filterId)
            ? prev.map(filter => (filter.id === filterId ? {...filter, value} : filter))
            : [...prev, {id: filterId, value}]);
    };

    const hasActiveFilters = columnFilters.some(filter => filter.value.trim() !== '');

    const handleSort = (key: ExternalSortKey) => {
        setSort(prev => (prev && prev.key === key
            ? {key, descending: !prev.descending}
            : {key, descending: false}));
    };

    const visibleRecords = useMemo(
        () => applyExternalTableControls(records, columnFilters, sort?.key ?? null, sort?.descending ?? false),
        [records, columnFilters, sort],
    );
    const matchingCount = useMemo(
        () => countMatchingRecords(records.map(externalSearchFields), columnFilters),
        [records, columnFilters],
    );

    // Hooks must stay above the early return (rules-of-hooks); the empty tab
    // renders nothing – same contract as PladiasRecordsTable
    if (records.length === 0) {
        return null;
    }

    /** Hlavička sloupce: název + ovládací prvek filtru, řaditelná kliknutím. */
    const renderHeader = (
        filterId: ExternalFilterId,
        label: string,
        title: string,
        placeholder: string,
        sortKey: ExternalSortKey,
    ) => {
        const indicator = sort && sort.key === sortKey ? (sort.descending ? ' 🔽' : ' 🔼') : '';
        return (
            <th
                title={placeholder}
                style={{cursor: 'pointer'}}
                className="cursor-pointer select-none"
                onClick={event => {
                    // klik do filtru nesmí přepnout řazení
                    if (!(event.target instanceof HTMLElement && event.target.closest('input,select'))) {
                        handleSort(sortKey);
                    }
                }}
            >
                <div title={title}>{label}{indicator}</div>
                <DataTableFilterCell
                    control="text"
                    value={filterValueOf(filterId)}
                    onChange={value => setFilterValue(filterId, value)}
                    placeholder={placeholder}
                />
            </th>
        );
    };

    return (
        <>
            <Table striped bordered hover size="sm">
            <thead>
            <tr>
                <th>{t('atlas.mapDetail.recordId')}</th>
                {/* písmeno kvadrantu – výchozí řazení ze serveru, dále filter + sort */}
                {renderHeader('quadrantLetter', t('atlas.mapDetail.squareAbbrev'), t('atlas.mapDetail.quadrant'),
                    t('atlas.mapDetail.filter.quadrantLetter'), 'quadrantLetter')}
                {renderHeader('institution', t('atlas.mapDetail.source'), t('atlas.mapDetail.source'),
                    t('atlas.mapDetail.filter.institution'), 'institution')}
                {renderHeader('date', t('atlas.mapDetail.year'), t('atlas.mapDetail.year'),
                    t('atlas.mapDetail.filter.date'), 'date')}
                <th>{t('atlas.mapDetail.latitude')}</th>
                <th>{t('atlas.mapDetail.longitude')}</th>
                {renderHeader('finders', t('atlas.mapDetail.collectors'), t('atlas.mapDetail.collectors'),
                    t('atlas.mapDetail.filter.finders'), 'finders')}
            </tr>
            </thead>
            <tbody>
            {visibleRecords.map((record) => {
                const isHighlighted = highlightedRecordId === record.id;
                return (
                    <tr
                        key={record.id}
                        ref={(el) => {
                            rowRefs.current[record.id] = el;
                        }}
                        className={`${isHighlighted ? 'table-active highlight-row' : ''}`}
                        onMouseEnter={() => onRecordHover?.(record.id)}
                        onMouseLeave={() => onRecordHover?.(null)}
                    >
                        <td>
                            <a href={externalRecordDetailUrl(record)} target="_blank"
                               rel="noopener noreferrer">
                                {record.id}
                            </a>
                        </td>
                        <td>
                            {record.quadrantLetter || '-'}
                        </td>
                        <td>
                            <span className="text-uppercase fw-semibold">{record.project}</span>
                        </td>
                        <td>
                            {record.year || t('atlas.mapDetail.unknownYear')}
                        </td>
                        <td className="text-nowrap">
                            {record.latitude.toFixed(4)}
                        </td>
                        <td className="text-nowrap">
                            {record.longitude.toFixed(4)}
                        </td>
                        <td>
                            {record.recordedBy || '-'}
                        </td>
                    </tr>
                );
            })}
            </tbody>
        </Table>
        {(hasActiveFilters || sort !== null) && (
            <div className="d-flex align-items-center gap-2 mt-1">
                {hasActiveFilters && (
                    <small className="text-muted">
                        {t('atlas.mapDetail.filter.matching', {count: matchingCount, total: records.length})}
                    </small>
                )}
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                        setColumnFilters([]);
                        setSort(null);
                    }}
                >
                    {t('common.table.clearFilters')}
                </Button>
            </div>
        )}
        </>
    );
}

export default ExternalRecordsTable;
