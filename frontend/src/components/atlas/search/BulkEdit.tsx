import {useMemo, useState} from "react";
import {Accordion} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type { RecordPladias } from "@/models";
import "./BulkEdit.css";

type SemaforOption = {
    value: string;
    label: string;
};

type BulkEditProps = {
    records: RecordPladias[];
    totalCount?: number | null;
};

export default function BulkEdit({records, totalCount}: BulkEditProps) {
    const {t} = useTranslation();
    const [activeKey, setActiveKey] = useState<string>("0");
    const [rawCoords, setRawCoords] = useState<string>("");
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

    const recordIds = useMemo(() => records.map((record) => record.id), [records]);
    const effectiveRecordCount = totalCount ?? recordIds.length;
    const canRunActions = effectiveRecordCount > 0;
    const semaforOptions = useMemo<SemaforOption[]>(() => ([
        {value: "0", label: t("atlas.search.bulkEdit.semaforOptions.unreviewed")},
        {value: "1", label: t("atlas.search.bulkEdit.semaforOptions.uncertain")},
        {value: "2", label: t("atlas.search.bulkEdit.semaforOptions.rejected")},
        {value: "3", label: t("atlas.search.bulkEdit.semaforOptions.accepted")},
    ]), [t]);

    const parseRawCoords = () => {
        const pair = rawCoords
            .trim()
            .replace(/\s+/g, "")
            .split(/[;,]/)
            .map((value) => value.trim())
            .filter(Boolean);

        if (pair.length === 2) {
            setNewLat(pair[0]);
            setNewLon(pair[1]);
            setFormMessage(t("atlas.search.bulkEdit.messages.coordsPrefilled"));
            return;
        }

        setFormMessage(t("atlas.search.bulkEdit.messages.coordsParseFailed"));
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

    const submitCoordsChange = () => {
        if (!newLat || !newLon) {
            setFormMessage(t("atlas.search.bulkEdit.messages.coordsRequired"));
            return;
        }
        applyAction(t("atlas.search.bulkEdit.messages.locationChangeReady", {buffer: coordBuffer}));
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
                                            className="form-control"
                                            value={rawCoords}
                                            onChange={(event) => setRawCoords(event.target.value)}
                                            placeholder={t("atlas.search.bulkEdit.sections.positionBuffer.rawCoordsPlaceholder")}
                                        />
                                        <button type="button" className="btn btn-outline-secondary" onClick={parseRawCoords}>{t("atlas.search.bulkEdit.sections.positionBuffer.parseButton")}</button>
                                    </div>
                                </div>

                                <div className="row g-2 mb-2">
                                    <div className="col-md-4">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.latLabel")}</label>
                                        <input type="text" className="form-control" value={newLat} onChange={(event) => setNewLat(event.target.value)} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.lonLabel")}</label>
                                        <input type="text" className="form-control" value={newLon} onChange={(event) => setNewLon(event.target.value)} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.bufferLabel")}</label>
                                        <input type="text" className="form-control" value={coordBuffer} onChange={(event) => setCoordBuffer(event.target.value)} />
                                    </div>
                                </div>

                                <button type="button" className="btn btn-warning btn-sm" onClick={submitCoordsChange}>
                                    {t("atlas.search.bulkEdit.sections.positionBuffer.submitButton")}
                                </button>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="1" className="bulk-edit-card">
                    <Accordion.Header>{t("atlas.search.bulkEdit.sections.buffer.title")}</Accordion.Header>
                    <Accordion.Body>
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

            {formMessage && <div className="alert alert-secondary mt-3 mb-0">{formMessage}</div>}
        </section>
    );
}