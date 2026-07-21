import {Button, Table} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import React, {useEffect, useRef, useState} from 'react';
import type { RecordPladias } from '@/models';
import './RecordsTable.scss';
import {HerbariumQualityCheckbox} from './HerbariumQualityCheckbox';
import {AddCommentModal} from './AddCommentModal';
import {ValidationStatusId} from "@/core/validationStatus.ts";
import {ValidationStatusCheckboxes} from './ValidationStatusCheckboxes';
import {OriginalityStatusIcons} from './OriginalityStatusIcons';
import {IncludeInMapCheckbox} from './IncludeInMapCheckbox';
import {useInstanceConfig} from '@/context/InstanceConfigContext';

interface PladiasRecordsTableProps {
    records: RecordPladias[];
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
    onRecordCenter?: (record: RecordPladias) => void;
    registerScrollFn?: (scrollFn: (recordId: number) => void) => void;
    tableName?: string;
    onRecordUpdated?: (record: RecordPladias) => void;
    showTaxonName?: boolean;
}

// Project ID for atlas excerptions (herbarium quality checkbox visibility)
const ATLAS_EXCERPTIONS_PROJECT_ID = 14;

// Helper function to determine visibility of UI elements based on validation status
// Matches legacy JS behavior from atlas_detailed_map.js
const getVisibilityByStatus = (record: RecordPladias) => {
    const statusId = record.validationStatusId;
    const isProjectExcerptions = record.projectId === ATLAS_EXCERPTIONS_PROJECT_ID;

    return {
        // IncludeInMap: shown for UNCERTAIN (1) and ACCEPTED (3), hidden for UNPROCESSED (0) and DECLINED (2)
        showIncludeInMap: statusId === ValidationStatusId.UNCERTAIN || statusId === ValidationStatusId.ACCEPTED,

        // HerbariumQuality: shown only for project 14, and for statuses UNCERTAIN (1), DECLINED (2), ACCEPTED (3)
        showHerbariumQuality: isProjectExcerptions &&
                             (statusId === ValidationStatusId.UNCERTAIN ||
                              statusId === ValidationStatusId.DECLINED ||
                              statusId === ValidationStatusId.ACCEPTED),

        // Originality: shown only for ACCEPTED (3)
        showOriginality: statusId === ValidationStatusId.ACCEPTED,
    };
};

export function PladiasRecordsTable({
                                        records,
                                        highlightedRecordId,
                                        onRecordHover,
                                        onRecordCenter,
                                        registerScrollFn,
                                        onRecordUpdated,
                                        showTaxonName = false
                                    }: PladiasRecordsTableProps) {
    const {t} = useTranslation();
    const config = useInstanceConfig() as {isVascular?: boolean};
    const isVascular = Boolean(config.isVascular);
    const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
    const [commentModalRecordId, setCommentModalRecordId] = useState<number | null>(null);
    const rowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

    if (records.length === 0) {
        return null;
    }

    const toggleExpand = (recordId: number) => {
        const record = records.find(r => r.id === recordId);
        if (record && onRecordCenter) {
            onRecordCenter(record);
        }
        setExpandedRecordId(expandedRecordId === recordId ? null : recordId);

        // Scroll to the row when explicitly clicking to expand
        if (rowRefs.current[recordId]) {
            rowRefs.current[recordId]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
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

    return (
        <>
            <Table striped bordered hover size="sm">
                <thead>
                <tr>
                    <th title={t("atlas.mapDetail.square")}>Kv.</th>
                    {isVascular && (
                        <th title={t("atlas.mapDetail.phytochorion")}>Fyt.</th>
                    )}
                    <th>{t("atlas.mapDetail.locality")}</th>
                    <th>{t("atlas.mapDetail.collectors")}</th>
                    <th>{t("atlas.mapDetail.date")}</th>
                    <th>{t("atlas.mapDetail.originality")}</th>
                    <th>{t("atlas.mapDetail.validationStatus")}</th>
                </tr>
                </thead>
                <tbody>
                {records.map((record) => {
                    const isHighlighted = highlightedRecordId === record.id;
                    const isExpanded = expandedRecordId === record.id;
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
                                 <td className="align-text-top">
                                     {record.computedQuadrantCode || '-'}
                                 </td>
                                 {isVascular && (
                                     <td className="align-text-top"
                                         title={record.phytochorionName || ""}>
                                         {record.phytochorionName || '-'}
                                     </td>
                                 )}
                                 <td className="align-text-top">
                                    <button
                                        className="btn btn-link p-0 text-start"
                                        onClick={() => toggleExpand(record.id)}
                                        style={{textDecoration: 'none', color: 'inherit'}}
                                     >
                                          {showTaxonName && record.taxonNameHtml && (
                                              <>
                                                  <span dangerouslySetInnerHTML={{ __html: record.taxonNameHtml }} />
                                                  <br />
                                              </>
                                          )}
                                          <b>
                                             {isVascular
                                                 ? (record.nearestTownText || record.nearestTownName || '')
                                                 : (record.nearestTownName || '')}
                                             {record.districtName && `, okres ${record.districtName}`}
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
                                             <b>pramen: </b>
                                                 {record.source}
                                                 <br/></span>
                                         )}
                                         {!isVascular && record.substrate && (
                                             <span><br/>
                                             <b>Substrát:</b> {record.substrate}<br/></span>
                                         )}

                                     </button>
                                     {record.herbariums.length > 0 && (
                                        <span><br/>
        <b>herbář:</b>{" "}
                                            {record.herbariums.map((herbarium, index) => (
                                                <React.Fragment key={herbarium.id}>
                                                    {index > 0 && ", "}

                                                    <span title={herbarium.label}>{herbarium.name}</span>
                                                </React.Fragment>
                                            ))}
                                             {/* Herbarium quality checkbox - visible based on validation status and project */}
                                             {(() => {
                                                 const visibility = getVisibilityByStatus(record);
                                                 if (visibility.showHerbariumQuality) {
                                                     return <HerbariumQualityCheckbox record={record} onRecordUpdated={onRecordUpdated} />;
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
                                            {" "}komentovaný
                                        </p>
                                    )}
                                    {record.hasHistory && (
                                        <p style={{fontSize: '80%'}}>
                                            <span className="bi bi-pencil" aria-hidden="true"></span>
                                            {" "}editovaný
                                        </p>
                                    )}
                                </td>
                                <td className="date align-text-top">
                                    {record.dateIso && (
                                        <span title="yyyy-M-d">{record.dateIso}</span>
                                    )}
                                </td>
                                <td className="align-text-top" style={{fontSize: '80%'}}>
                                    {record.projectName || '-'}<br/>
                                    -- <br/>
                                    importoval <b>{record.batchAuthorName}</b>

                                </td>
                                <td className="align-text-top">
                                    {record.canEdit ? (
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
                                    <td colSpan={isVascular ? 5 : 6} style={{padding: '10px 20px', backgroundColor: '#f8f9fa'}}>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div>
                                                    <b>původní jméno:</b>{' '}
                                                    {record.taxonOriginal}
                                                </div>
                                                <div><b>lokalita:</b> {record.locality || ''}</div>
                                                {isVascular && (
                                                    <div><b>nejbližší
                                                        obec:</b> {record.nearestTownText || record.nearestTownName || '-'}
                                                        {record.districtName && `, okres ${record.districtName}`}
                                                    </div>
                                                )}
                                                {record.latitude && record.longitude && (
                                                    <div>
                                                        <b>GPS: </b>
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
                                                            <><b>polohová přesnost:</b> {record.gpsPrecision} m</>
                                                        )}
                                                    </div>
                                                )}
                                                {(record.altitudeMin || record.altitudeMax) && (
                                                    <div>
                                                        <b>nadmořská výška: </b>
                                                        {record.altitudeMin === record.altitudeMax
                                                            ? `${record.altitudeMax} m`
                                                            : `${record.altitudeMin} - ${record.altitudeMax} m`}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-6">
                                                {(record.environment || record.remarkExcerption || record.remarkDoubt || record.remarkOther) && (
                                                    <div>
                                                        <b>ostatní poznámky:</b>
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
                                                    editovat záznam/zobrazit detail
                                                </Button>
                                                {' | '}
                                                <Button
                                                    className="btn-primary"
                                                    size="sm"
                                                    onClick={() => setCommentModalRecordId(record.id)}
                                                    style={{padding: 0, textDecoration: 'none'}}
                                                >
                                                    přidat komentář
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="row mt-3">
                                            <div className="col-md-6">
                                                {record.comments && record.comments.length > 0 && (
                                                    <div>
                                                        <b>Komentáře:</b>
                                                        {record.comments.map((comment) => (
                                                            <div key={comment.id} className="comment"
                                                                 style={{marginTop: '5px'}}>
                                                                <p style={{margin: '0', fontSize: '85%'}}>
                                                                <span
                                                                    className="comment-author">{comment.authorName}</span>
                                                                    <small> {comment.createTimestamp}</small>:
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

                                        <small>ID záznamu: {record.id}</small>
                                        {record.originalId && (
                                            <><br/><small>Externí ID: {record.originalId}</small></>
                                        )}
                                        {/* Include in Map - conditionally rendered based on validation status */}
                                        {record.canEdit ? (
                                            (() => {
                                                const visibility = getVisibilityByStatus(record);
                                                if (visibility.showIncludeInMap) {
                                                    return <IncludeInMapCheckbox record={record} onRecordUpdated={onRecordUpdated} />;
                                                }
                                                return <><br/><small>Zahrnut do mapy: {record.includedInMap ? 'ANO' : 'NE'}</small></>;
                                            })()
                                        ) : (
                                            <><br/><small>Zahrnut do mapy: {record.includedInMap ? 'ANO' : 'NE'}</small></>
                                        )}
                                        <br/>

                                        {/* Herbarium Quality display - always show the text, but checkbox is conditional */}
                                        <small>Revidovaný herbář: {record.herbariumQuality ? 'ANO' : 'NE'}</small>
                                        <br/>

                                         {/* Originality Status - conditionally rendered based on validation status */}
                                         <small>Původní výskyt: </small>
                                         {record.canEdit ? (
                                             (() => {
                                                 const visibility = getVisibilityByStatus(record);
                                                 if (visibility.showOriginality) {
                                                     return <OriginalityStatusIcons record={record} onRecordUpdated={onRecordUpdated} />;
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
