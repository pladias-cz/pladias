/**
 * Průběh a výsledek dávky hromadné úpravy: progress bar, rozbalitelné
 * seznamy úspěšných/neúspěšných záznamů (odkazy do detailu) a zpráva
 * formuláře (validace i výsledek dávky).
 */
import {Link} from "react-router-dom";
import {ProgressBar} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type {BulkOperationSummary} from "../types";

interface BulkEditBatchStatusProps {
    isRunning: boolean;
    batchProgress: { processed: number; total: number };
    progressPercent: number;
    batchSummary: BulkOperationSummary | null;
    formMessage: string;
}

export function BulkEditBatchStatus({
                                        isRunning,
                                        batchProgress,
                                        progressPercent,
                                        batchSummary,
                                        formMessage
                                    }: BulkEditBatchStatusProps) {
    const {t} = useTranslation();

    return (
        <>
            {(isRunning || batchProgress.total > 0) && (
                <div className="mt-3 mb-3">
                    <div className="small text-muted mb-1">
                        {t("atlas.search.bulkEdit.messages.batchProgress", {
                            processed: batchProgress.processed,
                            total: batchProgress.total,
                        })}
                    </div>
                    <ProgressBar now={progressPercent} label={`${progressPercent}%`} animated={isRunning}/>
                </div>
            )}

            {batchSummary && (
                <div className="mt-3 mb-3">
                    <details>
                        <summary>{t("atlas.search.bulkEdit.messages.showSuccessfulIds", {count: batchSummary.successIds.length})}</summary>
                        <div className="small mt-2">
                            {batchSummary.successIds.length === 0
                                ? "-"
                                : batchSummary.successIds.map((id, index) => (
                                    <span key={id}>
                                        {index > 0 && ", "}
                                        <Link to={`/atlas/record/${id}`} target="_blank"
                                              rel="noopener noreferrer">{id}</Link>
                                    </span>
                                ))}
                        </div>
                    </details>
                    <details className="mt-2">
                        <summary>{t("atlas.search.bulkEdit.messages.showFailedIds", {count: batchSummary.failed.length})}</summary>
                        <div className="small mt-2">
                            {batchSummary.failed.length === 0
                                ? "-"
                                : batchSummary.failed.map((item, index) => (
                                    <span key={item.id}>
                                        {index > 0 && ", "}
                                        <Link to={`/atlas/record/${item.id}`} target="_blank"
                                              rel="noopener noreferrer">{item.id}</Link>
                                        {" ("}
                                        {item.error}
                                        {")"}
                                    </span>
                                ))}
                        </div>
                    </details>
                </div>
            )}

            {formMessage && <div className="alert alert-secondary mt-3 mb-3">{formMessage}</div>}
        </>
    );
}
