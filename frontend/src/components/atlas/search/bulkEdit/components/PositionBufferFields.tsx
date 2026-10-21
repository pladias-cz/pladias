/**
 * Sekce "Poloha + buffer" (accordion item 0) – nejkomplexnější pole:
 * surové souřadnice k naparsování (lat, lon / DMS s hemisférami) a poté
 * lat/lon/buffer s validací povinnosti. Logiku (včetně parseru) vlastní
 * useBulkEdit, tady je jen layout.
 */
import {useTranslation} from "react-i18next";
import type {UseBulkEditResult} from "../useBulkEdit";

export function PositionBufferFields({bulkEdit}: {bulkEdit: UseBulkEditResult}) {
    const {t} = useTranslation();
    const {requiredCoordErrors} = bulkEdit;

    return (
        <>
            <div className="mb-2">
                <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.rawCoordsLabel")}</label>
                <div className="d-flex gap-2">
                    <input
                        type="text"
                        className={`form-control ${bulkEdit.rawCoordsError ? "is-invalid" : ""}`}
                        value={bulkEdit.rawCoords}
                        onChange={(event) => bulkEdit.changeRawCoords(event.target.value)}
                        placeholder={t("atlas.search.bulkEdit.sections.positionBuffer.rawCoordsPlaceholder")}
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={bulkEdit.parseRawCoords}>
                        {t("atlas.search.bulkEdit.sections.positionBuffer.parseButton")}
                    </button>
                </div>
                {bulkEdit.rawCoordsError && <div className="invalid-feedback d-block">{bulkEdit.rawCoordsError}</div>}
            </div>

            <div className="row g-2 mb-2">
                <div className="col-md-4">
                    <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.latLabel")}</label>
                    <input
                        type="text"
                        className={`form-control ${requiredCoordErrors.lat ? "is-invalid" : ""}`}
                        value={bulkEdit.newLat}
                        onChange={(event) => bulkEdit.changeNewLat(event.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.lonLabel")}</label>
                    <input
                        type="text"
                        className={`form-control ${requiredCoordErrors.lon ? "is-invalid" : ""}`}
                        value={bulkEdit.newLon}
                        onChange={(event) => bulkEdit.changeNewLon(event.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <label className="form-label">{t("atlas.search.bulkEdit.sections.positionBuffer.bufferLabel")}</label>
                    <input
                        type="text"
                        className={`form-control ${requiredCoordErrors.buffer ? "is-invalid" : ""}`}
                        value={bulkEdit.coordBuffer}
                        onChange={(event) => bulkEdit.changeCoordBuffer(event.target.value)}
                    />
                </div>
            </div>

            <button type="button" className="btn btn-warning btn-sm" onClick={() => void bulkEdit.submitCoordsChange()} disabled={bulkEdit.isRunning}>
                {t("atlas.search.bulkEdit.sections.positionBuffer.submitButton")}
            </button>
        </>
    );
}
