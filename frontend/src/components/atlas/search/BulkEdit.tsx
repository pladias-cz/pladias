import {useCallback, useMemo, useState} from "react";
import {Accordion, ProgressBar} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type { RecordPladias } from "@/models";
import {fetchRecordEditTimestamps, moveCoordinates} from "./bulkEditApi";
import {runBulkOperationSequential, type BulkOperationFailure} from "./bulkEditOperations";
import "./BulkEdit.css";

type SemaforOption = {
    value: string;
    label: string;
};

type BulkEditProps = {
    records: RecordPladias[];
    totalCount?: number | null;
    searchPayloadEntries: Array<[string, FormDataEntryValue]>;
};

type BulkOperationSummary = {
    operationName: string;
    successIds: number[];
    failed: BulkOperationFailure[];
};

const MAX_BULK_EDIT_RECORDS = 1000;
const NOT_IMPLEMENTED_TEXT = "neimplementováno";

type CoordAxis = "lat" | "lon";

const formatCoord = (value: number): string => {
    const rounded = Math.round(value * 100_000_000) / 100_000_000;
    return rounded.toString();
};

const parseCoordinate = (input: string, axis: CoordAxis, defaultHemisphere: "N" | "E"): number | null => {
    const trimmed = input.trim();
    if (!trimmed) {
        return null;
    }

    const upper = trimmed.toUpperCase();
    const prefixHemisphere = upper.match(/^[NSEW]/)?.[0] ?? "";
    const suffixHemisphere = upper.match(/[NSEW]$/)?.[0] ?? "";
    const hemisphere = suffixHemisphere || prefixHemisphere || defaultHemisphere;
    const isNegativeHemisphere = hemisphere === "S" || hemisphere === "W";
    const isPositiveHemisphere = hemisphere === "N" || hemisphere === "E";

    let valuePart = upper.replace(/^[NSEW]\s*/, "").replace(/\s*[NSEW]$/, "").trim();
    if (!valuePart) {
        return null;
    }

    const decimalMatch = valuePart.match(/^([+-]?\d+(?:\.\d+)?)$/);
    if (decimalMatch) {
        let decimal = Number.parseFloat(decimalMatch[1]);
        if (!Number.isFinite(decimal)) {
            return null;
        }

        if (isNegativeHemisphere) {
            decimal = -Math.abs(decimal);
        } else if (isPositiveHemisphere) {
            decimal = Math.abs(decimal);
        }

        const maxAbs = axis === "lat" ? 90 : 180;
        if (Math.abs(decimal) > maxAbs) {
            return null;
        }

        return decimal;
    }

    valuePart = valuePart.replace(/[º]/g, "°").replace(/[’′]/g, "'").replace(/[”″]/g, '"');
    const dmsMatch = valuePart.match(/^([+-]?\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)?\s*'?\s*(\d+(?:\.\d+)?)?\s*"?$/);
    if (!dmsMatch) {
        return null;
    }

    const degreesRaw = Number.parseFloat(dmsMatch[1]);
    const minutes = dmsMatch[2] ? Number.parseFloat(dmsMatch[2]) : 0;
    const seconds = dmsMatch[3] ? Number.parseFloat(dmsMatch[3]) : 0;
    if (!Number.isFinite(degreesRaw) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
        return null;
    }
    if (minutes >= 60 || seconds >= 60) {
        return null;
    }

    let decimal = Math.abs(degreesRaw) + minutes / 60 + seconds / 3600;
    if (isNegativeHemisphere) {
        decimal = -decimal;
    } else if (!isPositiveHemisphere && degreesRaw < 0) {
        decimal = -decimal;
    }

    const maxAbs = axis === "lat" ? 90 : 180;
    if (Math.abs(decimal) > maxAbs) {
        return null;
    }

    return decimal;
};

export default function BulkEdit({records, totalCount, searchPayloadEntries}: BulkEditProps) {
    const {t} = useTranslation();
    const [activeKey, setActiveKey] = useState<string>("0");
    const [rawCoords, setRawCoords] = useState<string>("");
    const [rawCoordsError, setRawCoordsError] = useState<string>("");
    const [requiredCoordErrors, setRequiredCoordErrors] = useState<{lat: boolean; lon: boolean; buffer: boolean}>({
        lat: false,
        lon: false,
        buffer: false,
    });
    const [newLon, setNewLon] = useState<string>("");
    const [newLat, setNewLat] = useState<string>("");
    const [coordBuffer, setCoordBuffer] = useState<string>("200");
    const [bufferSingle, setBufferSingle] = useState<string>("200");
    const [newDate, setNewDate] = useState<string>("");
    const [newPhytochorion, setNewPhytochorion] = useState<string>("");
    const [newLocality, setNewLocality] = useState<string>("");
    const [newNearestTownName, setNewNearestTownName] = useState<string>("");
    const [newSource, setNewSource] = useState<string>("");
    const [newImportComment, setNewImportComment] = useState<string>("");
    const [newFinder, setNewFinder] = useState<string>("");
    const [newTaxon, setNewTaxon] = useState<string>("");
    const [newSemafor, setNewSemafor] = useState<string>("");
    const [formMessage, setFormMessage] = useState<string>("");
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [batchProgress, setBatchProgress] = useState<{processed: number; total: number}>({processed: 0, total: 0});
    const [batchSummary, setBatchSummary] = useState<BulkOperationSummary | null>(null);

    const recordIds = useMemo(() => records.map((record) => record.id), [records]);
    const effectiveRecordCount = totalCount ?? recordIds.length;
    const canRunActions = effectiveRecordCount > 0;
    const semaforOptions = useMemo<SemaforOption[]>(() => ([
        {value: "0", label: t("atlas.search.bulkEdit.semaforOptions.unreviewed")},
        {value: "1", label: t("atlas.search.bulkEdit.semaforOptions.uncertain")},
        {value: "2", label: t("atlas.search.bulkEdit.semaforOptions.rejected")},
        {value: "3", label: t("atlas.search.bulkEdit.semaforOptions.accepted")},
    ]), [t]);

    const progressPercent = batchProgress.total > 0
        ? Math.round((batchProgress.processed / batchProgress.total) * 100)
        : 0;

    const parseRawCoords = () => {
        setRawCoordsError("");
        const pairMatch = rawCoords.trim().match(/^(.+?)\s*[;,]\s*(.+)$/);
        if (!pairMatch) {
            const errorMessage = t("atlas.search.bulkEdit.messages.coordsParseFailed");
            setRawCoordsError(errorMessage);
            setFormMessage(errorMessage);
            return;
        }

        const pair = [pairMatch[1].trim(), pairMatch[2].trim()];

        const lat = parseCoordinate(pair[0], "lat", "N");
        const lon = parseCoordinate(pair[1], "lon", "E");

        if (lat == null || lon == null) {
            const errorMessage = t("atlas.search.bulkEdit.messages.coordsParseFailed");
            setRawCoordsError(errorMessage);
            setFormMessage(errorMessage);
            return;
        }

        setNewLat(formatCoord(lat));
        setNewLon(formatCoord(lon));
        setRequiredCoordErrors((prev) => ({...prev, lat: false, lon: false}));
        setRawCoordsError("");
        setFormMessage(t("atlas.search.bulkEdit.messages.coordsPrefilled"));
    };

    const applyAction = (message: string) => {
        if (!canRunActions) {
            setFormMessage(t("atlas.search.bulkEdit.messages.noRecords"));
            return;
        }

        setFormMessage(t("atlas.search.bulkEdit.messages.actionPrepared", {
            message,
            count: effectiveRecordCount,
        }));
    };

    const executeBulkOperation = useCallback(async (
        operationName: string,
        operation: (record: {id: number; lastEditTimestampNum: number}) => Promise<void>,
    ) => {
        if (!canRunActions) {
            setFormMessage(t("atlas.search.bulkEdit.messages.noRecords"));
            return;
        }
        if (searchPayloadEntries.length === 0) {
            setFormMessage(t("atlas.search.bulkEdit.messages.searchFirst"));
            return;
        }

        setIsRunning(true);
        setBatchProgress({processed: 0, total: 0});
        setBatchSummary(null);
        setFormMessage(t("atlas.search.bulkEdit.messages.loadingCandidates"));

        try {
            const candidates = await fetchRecordEditTimestamps(searchPayloadEntries);
            if (candidates.length === 0) {
                setFormMessage(t("atlas.search.bulkEdit.messages.noRecords"));
                return;
            }
            if (candidates.length > MAX_BULK_EDIT_RECORDS) {
                setFormMessage(t("atlas.search.bulkEdit.messages.tooManyRecords", {
                    count: candidates.length,
                    max: MAX_BULK_EDIT_RECORDS,
                }));
                return;
            }

            const result = await runBulkOperationSequential(candidates, operation, (progress) => {
                setBatchProgress(progress);
            });

            setBatchSummary({
                operationName,
                successIds: result.successIds,
                failed: result.failed,
            });
            setFormMessage(t("atlas.search.bulkEdit.messages.batchFinished", {
                operationName,
                success: result.successIds.length,
                failed: result.failed.length,
                total: candidates.length,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t("atlas.search.bulkEdit.messages.batchStartFailed");
            setFormMessage(errorMessage);
        } finally {
            setIsRunning(false);
        }
    }, [canRunActions, searchPayloadEntries, t]);

    const submitCoordsChange = async () => {
        const latMissing = newLat.trim() === "";
        const lonMissing = newLon.trim() === "";
        const bufferMissing = coordBuffer.trim() === "";
        setRequiredCoordErrors({
            lat: latMissing,
            lon: lonMissing,
            buffer: bufferMissing,
        });

        if (latMissing || lonMissing) {
            setFormMessage(t("atlas.search.bulkEdit.messages.coordsRequired"));
            return;
        }
        if (bufferMissing) {
            setFormMessage(t("atlas.search.bulkEdit.messages.invalidBuffer"));
            return;
        }

        const latitude = Number.parseFloat(newLat);
        const longitude = Number.parseFloat(newLon);
        const gpsPrecision = Number.parseInt(coordBuffer, 10);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            setFormMessage(t("atlas.search.bulkEdit.messages.coordsParseFailed"));
            return;
        }
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            setFormMessage(t("atlas.search.bulkEdit.messages.coordsParseFailed"));
            return;
        }
        if (!Number.isFinite(gpsPrecision) || gpsPrecision <= 0) {
            setFormMessage(t("atlas.search.bulkEdit.messages.invalidBuffer"));
            return;
        }

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.locationChangeReady", {buffer: coordBuffer}),
            (record) => moveCoordinates(record, latitude, longitude, gpsPrecision),
        );
    };

    const submitSemafor = () => {
        if (!newSemafor) {
            setFormMessage(t("atlas.search.bulkEdit.messages.selectSemafor"));
            return;
        }

        if (!window.confirm(t("atlas.search.bulkEdit.messages.confirmSemafor"))) {
            return;
        }

        applyAction(t("atlas.search.bulkEdit.messages.semaforChangeReady"));
    };

    return (
        <section className="bulk-edit-panel p-3 p-lg-4 mt-4 w-100">
            <h4 className="bulk-edit-title mb-3">{t("atlas.search.bulkEdit.title")}</h4>
            <div className="bulk-edit-warning alert mb-3">
                {t("atlas.search.bulkEdit.warning")}
            </div>

            <div className="alert alert-info mb-3">
                {t("atlas.search.bulkEdit.selectedRecords", {count: effectiveRecordCount})}: <strong>{effectiveRecordCount}</strong>
            </div>

            {(isRunning || batchProgress.total > 0) && (
                <div className="mt-3 mb-3">
                    <div className="small text-muted mb-1">
                        {t("atlas.search.bulkEdit.messages.batchProgress", {
                            processed: batchProgress.processed,
                            total: batchProgress.total,
                        })}
                    </div>
                    <ProgressBar now={progressPercent} label={`${progressPercent}%`} animated={isRunning} />
                </div>
            )}

            {batchSummary && (
                <div className="mt-3 mb-3">
                    <details>
                        <summary>{t("atlas.search.bulkEdit.messages.showSuccessfulIds", {count: batchSummary.successIds.length})}</summary>
                        <div className="small mt-2">{batchSummary.successIds.join(", ") || "-"}</div>
                    </details>
                    <details className="mt-2">
                        <summary>{t("atlas.search.bulkEdit.messages.showFailedIds", {count: batchSummary.failed.length})}</summary>
                        <div className="small mt-2">
                            {batchSummary.failed.length === 0
                                ? "-"
                                : batchSummary.failed.map((item) => `${item.id} (${item.error})`).join(", ")}
                        </div>
                    </details>
                </div>
            )}

            {formMessage && <div className="alert alert-secondary mt-3 mb-3">{formMessage}</div>}

            <Accordion
                activeKey={activeKey}
                onSelect={(eventKey) => typeof eventKey === "string" && setActiveKey(eventKey)}
                alwaysOpen={false}
                className="bulk-edit-accordion"
            >
                <Accordion.Item eventKey="0" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.positionBuffer.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="mb-2">
                                    <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.rawCoordsLabel")}</label>
                                    <div className="d-flex gap-2">
                                        <input
                                            type="text"
                                            className={`form-control ${rawCoordsError ? "is-invalid" : ""}`}
                                            value={rawCoords}
                                            onChange={(event) => {
                                                setRawCoords(event.target.value);
                                                if (rawCoordsError) {
                                                    setRawCoordsError("");
                                                }
                                            }}
                                            placeholder={t("atlas.search.bulkEdit.sections.positionBuffer.rawCoordsPlaceholder")}
                                        />
                                        <button type="button" className="btn btn-outline-secondary" onClick={parseRawCoords}>{t("atlas.search.bulkEdit.sections.positionBuffer.parseButton")}</button>
                                    </div>
                                    {rawCoordsError && <div className="invalid-feedback d-block">{rawCoordsError}</div>}
                                </div>

                                <div className="row g-2 mb-2">
                                    <div className="col-md-4">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.latLabel")}</label>
                                        <input
                                            type="text"
                                            className={`form-control ${requiredCoordErrors.lat ? "is-invalid" : ""}`}
                                            value={newLat}
                                            onChange={(event) => {
                                                setNewLat(event.target.value);
                                                if (requiredCoordErrors.lat && event.target.value.trim() !== "") {
                                                    setRequiredCoordErrors((prev) => ({...prev, lat: false}));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.lonLabel")}</label>
                                        <input
                                            type="text"
                                            className={`form-control ${requiredCoordErrors.lon ? "is-invalid" : ""}`}
                                            value={newLon}
                                            onChange={(event) => {
                                                setNewLon(event.target.value);
                                                if (requiredCoordErrors.lon && event.target.value.trim() !== "") {
                                                    setRequiredCoordErrors((prev) => ({...prev, lon: false}));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.bufferLabel")}</label>
                                        <input
                                            type="text"
                                            className={`form-control ${requiredCoordErrors.buffer ? "is-invalid" : ""}`}
                                            value={coordBuffer}
                                            onChange={(event) => {
                                                setCoordBuffer(event.target.value);
                                                if (requiredCoordErrors.buffer && event.target.value.trim() !== "") {
                                                    setRequiredCoordErrors((prev) => ({...prev, buffer: false}));
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <button type="button" className="btn btn-warning btn-sm" onClick={() => void submitCoordsChange()} disabled={isRunning}>
                                    {t("atlas.search.bulkEdit.sections.positionBuffer.submitButton")}
                                </button>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="1" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.buffer.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.buffer.label")}</label>
                                        <input type="text" className="form-control" value={bufferSingle} onChange={(event) => setBufferSingle(event.target.value)} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.bufferChangeReady", {value: bufferSingle}))}>
                                        {t("atlas.search.bulkEdit.sections.buffer.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="2" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.date.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.date.label")}</label>
                                        <input type="text" className="form-control" value={newDate} onChange={(event) => setNewDate(event.target.value)} placeholder={t("atlas.search.bulkEdit.sections.date.placeholder")} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.dateChangeReady", {value: newDate || t("atlas.search.bulkEdit.emptyValue")}))}>
                                        {t("atlas.search.bulkEdit.sections.date.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="3" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.phytochorion.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.phytochorion.label")}</label>
                                        <input type="text" className="form-control" value={newPhytochorion} onChange={(event) => setNewPhytochorion(event.target.value)} placeholder={t("atlas.search.bulkEdit.sections.phytochorion.placeholder")} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.phytochorionChangeReady", {value: newPhytochorion || t("atlas.search.bulkEdit.emptyValue")}))}>
                                        {t("atlas.search.bulkEdit.sections.phytochorion.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="4" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.locality.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.locality.label")}</label>
                                        <input type="text" className="form-control" value={newLocality} onChange={(event) => setNewLocality(event.target.value)} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.localityChangeReady"))}>
                                        {t("atlas.search.bulkEdit.sections.locality.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="5" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.nearestTown.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.nearestTown.label")}</label>
                                        <input type="text" className="form-control" value={newNearestTownName} onChange={(event) => setNewNearestTownName(event.target.value)} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.nearestTownChangeReady", {value: newNearestTownName || t("atlas.search.bulkEdit.emptyValue")}))}>
                                        {t("atlas.search.bulkEdit.sections.nearestTown.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="6" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.source.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.source.label")}</label>
                                        <input type="text" className="form-control" value={newSource} onChange={(event) => setNewSource(event.target.value)} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.sourceChangeReady"))}>
                                        {t("atlas.search.bulkEdit.sections.source.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="7" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.note.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.note.label")}</label>
                                        <input type="text" className="form-control" value={newImportComment} onChange={(event) => setNewImportComment(event.target.value)} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.noteChangeReady"))}>
                                        {t("atlas.search.bulkEdit.sections.note.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="8" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.finder.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <p className="small text-muted">{t("atlas.search.bulkEdit.sections.finder.helper")}</p>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.finder.label")}</label>
                                        <input type="text" className="form-control" value={newFinder} onChange={(event) => setNewFinder(event.target.value)} placeholder={t("atlas.search.bulkEdit.sections.finder.placeholder")} />
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={() => applyAction(t("atlas.search.bulkEdit.messages.finderAddReady"))}>
                                        {t("atlas.search.bulkEdit.sections.finder.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="9" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.taxon.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <p className="small text-muted">{t("atlas.search.bulkEdit.sections.taxon.helper")}</p>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.taxon.label")}</label>
                                        <input type="text" className="form-control" value={newTaxon} onChange={(event) => setNewTaxon(event.target.value)} placeholder={t("atlas.search.bulkEdit.sections.taxon.placeholder")} />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-warning btn-sm"
                                        onClick={() => {
                                            if (!window.confirm(t("atlas.search.bulkEdit.messages.confirmTaxon"))) {
                                                return;
                                            }
                                            applyAction(t("atlas.search.bulkEdit.messages.taxonChangeReady"));
                                        }}
                                    >
                                        {t("atlas.search.bulkEdit.sections.taxon.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="10" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.semafor.title")}</Accordion.Header>
                    <Accordion.Body>
                                <div className="alert alert-warning py-2 px-3 mb-3">{NOT_IMPLEMENTED_TEXT}</div>
                                <p className="small text-muted">
                                    {t("atlas.search.bulkEdit.sections.semafor.helper")}
                                </p>
                                <div className="d-flex gap-2 align-items-end">
                                    <div className="flex-grow-1">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.semafor.label")}</label>
                                        <select
                                            className="form-select"
                                            value={newSemafor}
                                            onChange={(event) => setNewSemafor(event.target.value)}
                                        >
                                            <option value="">{t("atlas.search.bulkEdit.sections.semafor.placeholder")}</option>
                                            {semaforOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button type="button" className="btn btn-warning btn-sm" onClick={submitSemafor}>
                                        {t("atlas.search.bulkEdit.sections.semafor.submitButton")}
                                    </button>
                                </div>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>

        </section>
    );
}