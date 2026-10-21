/**
 * Veškerá logika hromadných úprav záznamů (E.3 z refactor.md): stav polí
 * jednotlivých akcí, číselníky (fytochoriony, nálezci, semafor, taxony),
 * guardy dávky (limit záznamů, naplněné vyhledávání), potvrzovací dialogy
 * a průběh + souhrn dávky.
 *
 * Komponenta `BulkEdit` je čistá kompozice; síťová volání vlastní
 * `services/bulkEditApi`, sekvenční běh dávky `bulkEditOperations`.
 * Parsery vstupů jsou čisté funkce v `valueParsing.ts` (s testy).
 */
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {createTaxaImportableProvider} from "@/components/autocomplete/TaxaImportableProvider";
import {useConfirm} from "@/hooks/useConfirm";
import type {RecordPladias} from "@/models";
import type {TaxonId} from "@/models/TaxonId";
import {
    fetchRecordEditTimestamps,
    moveCoordinates,
    updateCoordsPrecision,
    updateDate,
    updatePhytochorion,
    updateLocality,
    updateNearestTownName,
    updateSource,
    updateNote,
    updateFinder,
    updateTaxon,
    updateValidationStatus,
} from "@/services/bulkEditApi";
import {getPhytochorions, type PhytochorionOption} from "@/services/searchApi";
import {getUnassignedAuthors} from "@/services/recordApi";
import {runBulkOperationSequential, type BulkRecordVersion} from "../bulkEditOperations";
import {formatCoord, isValidDateValue, parseCoordinatePair} from "./valueParsing";
import type {BulkOperationSummary, SemaforOption} from "./types";
import type {TypeaheadOption} from "../types";

/** Bezpečnostní strop dávky – nad limit raději upravit ručně po menších kusech. */
export const MAX_BULK_EDIT_RECORDS = 1000;

export interface UseBulkEditParams {
    records: RecordPladias[];
    totalCount?: number | null;
    searchPayloadEntries: Array<[string, FormDataEntryValue]>;
    onBulkEditComplete?: () => Promise<void> | void;
}

/**
 * Stav + akce hromadných úprav. Pole mění `change*` wrappery (nastavení
 * hodnoty + smazání chyby políčka), akce spouští `submit*` (validace →
 * případný confirm dialog → `executeBulkOperation`).
 */
export function useBulkEdit({records, totalCount, searchPayloadEntries, onBulkEditComplete}: UseBulkEditParams) {
    const {t} = useTranslation();
    const {confirm, dialog: confirmDialog} = useConfirm();

    // poloha + buffer (sekce 0 a 1)
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
    const [bufferSingleError, setBufferSingleError] = useState<boolean>(false);
    // validace ostatních polí
    const [dateSingleError, setDateSingleError] = useState<boolean>(false);
    const [phytochorionError, setPhytochorionError] = useState<boolean>(false);
    const [localityError, setLocalityError] = useState<boolean>(false);
    const [nearestTownError, setNearestTownError] = useState<boolean>(false);
    const [finderError, setFinderError] = useState<boolean>(false);
    const [taxonError, setTaxonError] = useState<boolean>(false);
    const [semaforError, setSemaforError] = useState<boolean>(false);
    // hodnoty polí
    const [newDate, setNewDate] = useState<string>("");
    const [phytochorions, setPhytochorions] = useState<PhytochorionOption[]>([]);
    const [selectedPhytochorion, setSelectedPhytochorion] = useState<TypeaheadOption[]>([]);
    const [newLocality, setNewLocality] = useState<string>("");
    const [newNearestTownName, setNewNearestTownName] = useState<string>("");
    const [newSource, setNewSource] = useState<string>("");
    const [newImportComment, setNewImportComment] = useState<string>("");
    const [finderOptions, setFinderOptions] = useState<TypeaheadOption[]>([]);
    const [selectedFinder, setSelectedFinder] = useState<TypeaheadOption[]>([]);
    const [selectedTaxon, setSelectedTaxon] = useState<TaxonId | null>(null);
    const [newSemafor, setNewSemafor] = useState<string>("");
    // běh dávky
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
    const taxonProvider = useMemo(
        () => createTaxaImportableProvider(t("atlas.search.form.taxonAutocompletePlaceholder")),
        [t],
    );
    const phytochorionOptions = useMemo<TypeaheadOption[]>(() => (
        phytochorions.map((phytochorion) => ({id: phytochorion.rowid, label: phytochorion.name}))
    ), [phytochorions]);

    useEffect(() => {
        let isMounted = true;

        const loadPhytochorions = async () => {
            try {
                const options = await getPhytochorions();
                if (isMounted) {
                    setPhytochorions(options);
                }
            } catch {
                // Pole zůstane použitelné s prázdným číselníkem.
            }
        };

        loadPhytochorions();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadFinders = async () => {
            const firstRecordId = recordIds[0];
            if (firstRecordId == null) {
                if (isMounted) {
                    setFinderOptions([]);
                    setSelectedFinder([]);
                }
                return;
            }

            try {
                const authors = await getUnassignedAuthors(firstRecordId);
                const options = authors.map((author) => ({
                    id: author.id as string | number,
                    label: author.name,
                }));

                if (isMounted) {
                    setFinderOptions(options);
                    setSelectedFinder([]);
                }
            } catch {
                if (isMounted) {
                    setFinderOptions([]);
                    setSelectedFinder([]);
                }
            }
        };

        void loadFinders();
        return () => {
            isMounted = false;
        };
    }, [recordIds]);

    const progressPercent = batchProgress.total > 0
        ? Math.round((batchProgress.processed / batchProgress.total) * 100)
        : 0;

    // --- onChange wrappery: hodnota + smazání chyby políčka ---

    const changeRawCoords = (value: string) => {
        setRawCoords(value);
        if (rawCoordsError) {
            setRawCoordsError("");
        }
    };

    const changeNewLat = (value: string) => {
        setNewLat(value);
        if (requiredCoordErrors.lat && value.trim() !== "") {
            setRequiredCoordErrors((prev) => ({...prev, lat: false}));
        }
    };

    const changeNewLon = (value: string) => {
        setNewLon(value);
        if (requiredCoordErrors.lon && value.trim() !== "") {
            setRequiredCoordErrors((prev) => ({...prev, lon: false}));
        }
    };

    const changeCoordBuffer = (value: string) => {
        setCoordBuffer(value);
        if (requiredCoordErrors.buffer && value.trim() !== "") {
            setRequiredCoordErrors((prev) => ({...prev, buffer: false}));
        }
    };

    const changeBufferSingle = (value: string) => {
        setBufferSingle(value);
        if (bufferSingleError && value.trim() !== "") {
            setBufferSingleError(false);
        }
    };

    const changeNewDate = (value: string) => {
        setNewDate(value);
        if (dateSingleError && value.trim() !== "" && isValidDateValue(value.trim())) {
            setDateSingleError(false);
        }
    };

    const changeSelectedPhytochorion = (selected: TypeaheadOption[]) => {
        setSelectedPhytochorion(selected);
        if (phytochorionError && selected.length > 0) {
            setPhytochorionError(false);
        }
    };

    const changeNewLocality = (value: string) => {
        setNewLocality(value);
        if (localityError && value.trim() !== "") {
            setLocalityError(false);
        }
    };

    const changeNewNearestTownName = (value: string) => {
        setNewNearestTownName(value);
        if (nearestTownError && value.trim() !== "") {
            setNearestTownError(false);
        }
    };

    const changeNewSource = (value: string) => {
        setNewSource(value);
    };

    const changeNewImportComment = (value: string) => {
        setNewImportComment(value);
    };

    const changeSelectedFinder = (selected: TypeaheadOption[]) => {
        setSelectedFinder(selected);
        if (finderError && selected.length > 0) {
            setFinderError(false);
        }
    };

    const changeSelectedTaxon = (taxon: TaxonId | null) => {
        setSelectedTaxon(taxon);
        if (taxonError && taxon != null) {
            setTaxonError(false);
        }
    };

    const changeNewSemafor = (value: string) => {
        setNewSemafor(value);
        if (semaforError && value !== "") {
            setSemaforError(false);
        }
    };

    /** Naparsuje surové souřadnice a předplní lat/lon. */
    const parseRawCoords = () => {
        setRawCoordsError("");
        const parsed = parseCoordinatePair(rawCoords);
        if (parsed == null) {
            const errorMessage = t("atlas.search.bulkEdit.messages.coordsParseFailed");
            setRawCoordsError(errorMessage);
            setFormMessage(errorMessage);
            return;
        }

        setNewLat(formatCoord(parsed.lat));
        setNewLon(formatCoord(parsed.lon));
        setRequiredCoordErrors((prev) => ({...prev, lat: false, lon: false}));
        setRawCoordsError("");
        setFormMessage(t("atlas.search.bulkEdit.messages.coordsPrefilled"));
    };

    // --- běh dávky ---

    const executeBulkOperation = useCallback(async (
        operationName: string,
        operation: (record: BulkRecordVersion) => Promise<void>,
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

            if (onBulkEditComplete) {
                await onBulkEditComplete();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t("atlas.search.bulkEdit.messages.batchStartFailed");
            setFormMessage(errorMessage);
        } finally {
            setIsRunning(false);
        }
    }, [canRunActions, onBulkEditComplete, searchPayloadEntries, t]);

    // --- submit akce jednotlivých sekcí ---

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

    const submitSemafor = async () => {
        if (!newSemafor) {
            setSemaforError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.selectSemafor"));
            return;
        }

        setSemaforError(false);

        if (!(await confirm({message: t("atlas.search.bulkEdit.messages.confirmSemafor")}))) {
            return;
        }

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.semaforChangeReady"),
            (record) => updateValidationStatus(record, newSemafor),
        );
    };

    const submitBufferChange = async () => {
        const trimmed = bufferSingle.trim();
        const gpsPrecision = Number.parseInt(trimmed, 10);

        if (!trimmed || !Number.isFinite(gpsPrecision) || gpsPrecision <= 0) {
            setBufferSingleError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.invalidBuffer"));
            return;
        }

        setBufferSingleError(false);
        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.bufferChangeReady", {value: trimmed}),
            (record) => updateCoordsPrecision(record, gpsPrecision),
        );
    };

    const submitDateChange = async () => {
        const value = newDate.trim();

        if (!value) {
            setDateSingleError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.requiredDate", {defaultValue: "Datum je povinné."}));
            return;
        }

        if (!isValidDateValue(value)) {
            setDateSingleError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.invalidDateFormat"));
            return;
        }

        setDateSingleError(false);
        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.dateChangeReady", {value: value || t("atlas.search.bulkEdit.emptyValue")}),
            (record) => updateDate(record, value),
        );
    };

    const submitPhytochorionChange = async () => {
        const selectedOption = selectedPhytochorion[0];
        if (!selectedOption) {
            setPhytochorionError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.selectPhytochorion", {defaultValue: "Vyberte fytochorion."}));
            return;
        }

        setPhytochorionError(false);
        const value = String(selectedOption.id);
        const label = selectedOption.label;

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.phytochorionChangeReady", {value: label}),
            (record) => updatePhytochorion(record, value),
        );
    };

    const submitLocalityChange = async () => {
        const value = newLocality.trim();

        if (!value) {
            setLocalityError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.requiredLocality", {defaultValue: "Lokalita je povinná."}));
            return;
        }

        setLocalityError(false);

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.localityChangeReady"),
            (record) => updateLocality(record, value),
        );
    };

    const submitNearestTownChange = async () => {
        const value = newNearestTownName.trim();

        if (!value) {
            setNearestTownError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.requiredNearestTown", {defaultValue: "Nejbližší obec je povinná."}));
            return;
        }

        setNearestTownError(false);

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.nearestTownChangeReady", {value: value || t("atlas.search.bulkEdit.emptyValue")}),
            (record) => updateNearestTownName(record, value),
        );
    };

    const submitSourceChange = async () => {
        const value = newSource.trim();

        if (!value && !(await confirm({message: t("atlas.search.bulkEdit.messages.confirmEmptySource")}))) {
            return;
        }

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.sourceChangeReady"),
            (record) => updateSource(record, value),
        );
    };

    const submitNoteChange = async () => {
        const value = newImportComment.trim();

        if (!value && !(await confirm({message: t("atlas.search.bulkEdit.messages.confirmEmptyNote")}))) {
            return;
        }

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.noteChangeReady"),
            (record) => updateNote(record, value),
        );
    };

    const submitFinderAdd = async () => {
        const selectedFinderId = selectedFinder[0]?.id;

        if (selectedFinderId == null) {
            setFinderError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.selectFinder", {defaultValue: "Vyberte nálezce."}));
            return;
        }

        setFinderError(false);

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.finderAddReady"),
            (record) => updateFinder(record, String(selectedFinderId)),
        );
    };

    const submitTaxonChange = async () => {
        if (selectedTaxon == null) {
            setTaxonError(true);
            setFormMessage(t("atlas.search.bulkEdit.messages.selectTaxon", {defaultValue: "Vyberte taxon."}));
            return;
        }

        setTaxonError(false);

        if (!(await confirm({message: t("atlas.search.bulkEdit.messages.confirmTaxon")}))) {
            return;
        }

        await executeBulkOperation(
            t("atlas.search.bulkEdit.messages.taxonChangeReady"),
            (record) => updateTaxon(record, String(selectedTaxon.id)),
        );
    };

    return {
        // potvrzovací dialog (vykresluje BulkEdit)
        confirmDialog,
        // počty a běh dávky
        effectiveRecordCount,
        isRunning,
        batchProgress,
        progressPercent,
        batchSummary,
        formMessage,
        // číselníky
        semaforOptions,
        taxonProvider,
        phytochorionOptions,
        finderOptions,
        // poloha + buffer
        rawCoords,
        rawCoordsError,
        changeRawCoords,
        parseRawCoords,
        newLat,
        newLon,
        coordBuffer,
        requiredCoordErrors,
        changeNewLat,
        changeNewLon,
        changeCoordBuffer,
        submitCoordsChange,
        bufferSingle,
        bufferSingleError,
        changeBufferSingle,
        submitBufferChange,
        // datum
        newDate,
        dateSingleError,
        changeNewDate,
        submitDateChange,
        // fytochorion
        selectedPhytochorion,
        phytochorionError,
        changeSelectedPhytochorion,
        submitPhytochorionChange,
        // lokalita
        newLocality,
        localityError,
        changeNewLocality,
        submitLocalityChange,
        // nejbližší obec
        newNearestTownName,
        nearestTownError,
        changeNewNearestTownName,
        submitNearestTownChange,
        // zdroj
        newSource,
        changeNewSource,
        submitSourceChange,
        // poznámka
        newImportComment,
        changeNewImportComment,
        submitNoteChange,
        // nálezce
        selectedFinder,
        finderError,
        changeSelectedFinder,
        submitFinderAdd,
        // taxon
        taxonError,
        changeSelectedTaxon,
        submitTaxonChange,
        // semafor
        newSemafor,
        semaforError,
        changeNewSemafor,
        submitSemafor,
    };
}

export type UseBulkEditResult = ReturnType<typeof useBulkEdit>;
