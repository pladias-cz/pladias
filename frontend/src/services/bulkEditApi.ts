/**
 * Hromadné úpravy záznamů z výsledků vyhledávání – etalon service vrstvy
 * (docs/refactoring.md, sekce D: vzor přesunut z components/atlas/search/).
 * Komponenta (BulkEdit) nezná URL ani tvar požadavků.
 */

import {apiPatch, apiPost, ensureSuccess} from "./apiClient";
import type {ApiResult} from "@/models/ApiResponse";
import type {BulkRecordVersion} from "@/components/atlas/search/bulkEditOperations";

type RecordEditTimestampRow = {
    id?: number;
    recordId?: number;
    edit_timestamp?: number | string | null;
    editTimestamp?: number | string | null;
};

const toFormData = (payloadEntries: Array<[string, FormDataEntryValue]>) => {
    const formData = new FormData();
    for (const [key, value] of payloadEntries) {
        formData.append(key, value);
    }
    return formData;
};

const parseTimestamp = (value: number | string | null | undefined): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return 0;
};

const parseRecordVersion = (row: RecordEditTimestampRow): BulkRecordVersion | null => {
    const rawId = row.id ?? row.recordId;
    if (typeof rawId !== "number" || !Number.isFinite(rawId)) {
        return null;
    }

    const timestamp = parseTimestamp(row.edit_timestamp ?? row.editTimestamp);
    return {
        id: rawId,
        lastEditTimestampNum: timestamp,
    };
};

const patchRecordField = async (
    record: BulkRecordVersion,
    key: string,
    value: string,
    errorMessage: string,
): Promise<void> => {
    const payload = await apiPatch<ApiResult>(`/api/react/atlas/record/${record.id}`, {
        key,
        value,
        lastEditTimestampNum: record.lastEditTimestampNum,
    }, {errorMessage});
    ensureSuccess(payload, errorMessage);
};

export async function fetchRecordEditTimestamps(payloadEntries: Array<[string, FormDataEntryValue]>): Promise<BulkRecordVersion[]> {
    const payload = await apiPost<ApiResult<RecordEditTimestampRow[]>>(
        "/api/react/atlas/search/records-edit-timestamps",
        toFormData(payloadEntries),
        {errorMessage: "Failed to load editable records"},
    );
    ensureSuccess(payload, "Failed to load editable records");

    const rows = Array.isArray(payload.data) ? payload.data : [];
    return rows
        .map(parseRecordVersion)
        .filter((record): record is BulkRecordVersion => record != null);
}

export async function moveCoordinates(record: BulkRecordVersion, latitude: number, longitude: number, gpsPrecision: number): Promise<void> {
    const payload = await apiPost<ApiResult>("/api/react/atlas/record/moveCoordinates", {
        recordId: record.id,
        latitude,
        longitude,
        gpsPrecision,
        lastEditTimestampNum: record.lastEditTimestampNum,
    }, {errorMessage: "Failed to move record"});
    ensureSuccess(payload, "Failed to move record");
}

export async function updateCoordsPrecision(record: BulkRecordVersion, gpsPrecision: number): Promise<void> {
    await patchRecordField(record, "COORDSPRECISION", gpsPrecision.toString(), "Failed to update coords precision");
}

export async function updateDate(record: BulkRecordVersion, date: string): Promise<void> {
    await patchRecordField(record, "DATE", date, "Failed to update date");
}

export async function updatePhytochorion(record: BulkRecordVersion, phytochorionId: string): Promise<void> {
    await patchRecordField(record, "PHYTOCHORION", phytochorionId, "Failed to update phytochorion");
}

export async function updateLocality(record: BulkRecordVersion, locality: string): Promise<void> {
    await patchRecordField(record, "LOCALITY", locality, "Failed to update locality");
}

export async function updateNearestTownName(record: BulkRecordVersion, nearestTownName: string): Promise<void> {
    await patchRecordField(record, "NEARESTTOWNNAME", nearestTownName, "Failed to update nearest town");
}

export async function updateSource(record: BulkRecordVersion, source: string): Promise<void> {
    await patchRecordField(record, "SOURCE", source, "Failed to update source");
}

export async function updateNote(record: BulkRecordVersion, note: string): Promise<void> {
    await patchRecordField(record, "IMPORTCOMMENT", note, "Failed to update note");
}

export async function updateFinder(record: BulkRecordVersion, finderId: string): Promise<void> {
    await patchRecordField(record, "ADDFINDER", finderId, "Failed to add finder");
}

export async function updateTaxon(record: BulkRecordVersion, taxonId: string): Promise<void> {
    await patchRecordField(record, "TAXON", taxonId, "Failed to update taxon");
}

export async function updateValidationStatus(record: BulkRecordVersion, statusValue: string): Promise<void> {
    await patchRecordField(record, "VALIDATION_STATUS", statusValue, "Failed to update validation status");
}
