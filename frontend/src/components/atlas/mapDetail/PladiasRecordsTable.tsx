import {Button, Table} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import React, {useEffect, useRef, useState} from 'react';
import type {RecordPladias} from '@/models';
import type InstanceConfig from '@/models/InstanceConfig';
import './RecordsTable.scss';
import {HerbariumQualityCheckbox} from './HerbariumQualityCheckbox';
import {AddCommentModal} from './AddCommentModal';
import {ValidationStatusId} from '@/core/validationStatus';
import RichTextMessage from '@/components/RichTextMessage';
import {ValidationStatusCheckboxes} from './ValidationStatusCheckboxes';
import {OriginalityStatusIcons} from './OriginalityStatusIcons';
import {IncludeInMapCheckbox} from './IncludeInMapCheckbox';
import {DataTableHeaderCell} from '@/core/dataTable';
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
    /** Kvadrant v buňce: mapDetail (záznamy jednoho čtverce) jen písmeno, výsledky z celé
     * republiky (vyhledávání, nové komentáře) plný kód, např. 6261b. Default: písmeno. */
    showFullQuadrantCode?: boolean;
    /** Aktivní řazení vyhledávání (sort klíč backendu); hlavičky řadí jen s onHeaderSort. */
    sort?: { sortBy: string | null; descending: boolean };
    /** Klik na řaditelnou hlavičku – předává sort klíč backendu. */
    onHeaderSort?: (sortBy: string) => void;
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

export function PladiasRecordsTable({
                                        records,
                                        highlightedRecordId,
                                        onRecordHover,
                                        onRecordCenter,
                                        registerScrollFn,
                                        onRecordUpdated,
                                        showTaxonName = false,
                                        showExpandAllButton = false,
                                        showFullQuadrantCode = false,
                                        sort,
                                        onHeaderSort
                                    }: PladiasRecordsTableProps) {
    const {t} = useTranslation();
    const user = useUser();
    const instanceConfig = useInstanceConfig();
    const isVascular = instanceConfig.isVascular;
    const [expandedRecordIds, setExpandedRecordIds] = useState<Set<number>>(new Set());
    const [readCommentIds, setReadCommentIds] = useState<Set<number>>(new Set());
    const [markingCommentIds, setMarkingCommentIds] = useState<Set<number>>(new Set());
    const [commentModalRecordId, setCommentModalRecordId] = useState<number | null>(null);
    const rowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});
    const isAllExpanded = records.length > 0 && expandedRecordIds.size === records.length;

    // Hooks must run before the early return below (rules-of-hooks). With empty
    // records both effects are harmless no-ops: filtering expanded ids finds
    // nothing and the registered scroll function has no row to scroll to.
    useEffect(() => {
        const validRecordIds = new Set(records.map((record) => record.id));
        setExpandedRecordIds((prev) => {
            const next = new Set(Array.from(prev).filter((id) => validRecordIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [records]);

    const toggleExpand = (recordId: number) => {
        const record = records.find(r => r.id === recordId);
        if (record && onRecordCenter) {
            onRecordCenter(record);
        }

        setExpandedRecordIds((prev) => {
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
            setExpandedRecordIds(new Set());
            return;
        }

        setExpandedRecordIds(new Set(records.map((record) => record.id)));
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

    /** Hlavička sloupce: se zapnutým řazením standardní klikatelná buňka
     * (DataTableHeaderCell – indikátor, tooltip, kurzor), jinak původní plain <th>
     * (mapDetail řaditelné hlavičky nemá). */
    const renderHeader = (columnId: string, label: string, title?: string) => {
        if (!onHeaderSort) {
            return <th title={title}>{label}</th>;
        }
        const sortBy = SORTABLE_HEADERS[columnId];
        const isActive = sortBy != null && sortBy === sort?.sortBy;
        return (
            <DataTableHeaderCell
                label={label}
                columnId={columnId}
                sortIndicator={isActive ? (sort?.descending ? 'desc' : 'asc') : null}
                canSort={sortBy != null}
                onSort={handleHeaderSort}
                title={title}
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
                    {renderHeader('square', t('atlas.mapDetail.squareAbbrev'), t('atlas.mapDetail.quadrant'))}
                    {isVascular && renderHeader('phytochorion', t('atlas.mapDetail.phytochorionAbbrev'), t('atlas.mapDetail.phytochorion'))}
                    {renderHeader('locality', t('atlas.mapDetail.locality'))}
                    {renderHeader('finders', t('atlas.mapDetail.collectors'))}
                    {renderHeader('date', t('atlas.mapDetail.date'))}
                    {renderHeader('project', t('atlas.mapDetail.originality'))}
                    {renderHeader('validationStatus', t('atlas.mapDetail.validationStatus'))}
                </tr>
                </thead>
                <tbody>
                {records.map((record) => {
                    const isHighlighted = highlightedRecordId === record.id;
                    const isExpanded = expandedRecordIds.has(record.id);
                    return (
                        <>
                            <tr
                                key={record.id}
                                ref={(el) => {
                                    rowRefs.current[record.id] = el;
                                }}
                                className={`${isHighlighted ? 'table-active highlight-row' : ''} ${isExpanded ? 'table-success' : ''}`}
                                onMouseEnter={() => onRecordHover?.(record.id)}
                                onMouseLeave={() => onRecordHover?.(null)}
                            >
                                {/* Kvadrant (a-d) dopočítaný z GPS prostorovým dotazem. Tooltip vždy nese celý kód
                                    (např. 6152a); v buňce jen písmeno (mapDetail – záznamy jednoho čtverce) nebo
                                    plný kód (vyhledávání, nové komentáře – záznamy z celé republiky). */}
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
                                        ? (showFullQuadrantCode ? record.computedQuadrantCode : record.computedQuadrantCode.slice(-1))
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
                                            {isVascular
                                                ? (record.nearestTownText || record.nearestTownName || '')
                                                : (record.nearestTownName || '')}
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
                        </>
                    );
                })}
                </tbody>
            </Table>
            <AddCommentModal
                show={commentModalRecordId !== null}
                recordId={commentModalRecordId ?? 0}
                onHide={() => setCommentModalRecordId(null)}
            />
        </>
    );
}

export default PladiasRecordsTable;
