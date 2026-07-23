import type {BulkRecordVersion} from "./bulkEditOperations";

type RecordEditTimestampRow = {
    id?: number;
    recordId?: number;
    edit_timestamp?: number | string | null;
    editTimestamp?: number | string | null;
};

type JsonResponse<T> = {
    success?: boolean;
    data?: T;
    message?: string;
    error?: string;
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

export async function fetchRecordEditTimestamps(payloadEntries: Array<[string, FormDataEntryValue]>): Promise<BulkRecordVersion[]> {
    const response = await fetch("/api/react/atlas/search/records-edit-timestamps", {
        method: "POST",
        body: toFormData(payloadEntries),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.message || payload?.error || "Failed to load editable records";
        throw new Error(message);
    }

    const typedPayload = payload as JsonResponse<RecordEditTimestampRow[]> | RecordEditTimestampRow[];
    const rows = Array.isArray(typedPayload)
        ? typedPayload
        : Array.isArray(typedPayload.data)
            ? typedPayload.data
            : [];

    if (!Array.isArray(rows)) {
        throw new Error("Invalid response format");
    }

    return rows
        .map(parseRecordVersion)
        .filter((record): record is BulkRecordVersion => record != null);
}

export async function moveCoordinates(record: BulkRecordVersion, latitude: number, longitude: number, gpsPrecision: number): Promise<void> {
    const response = await fetch("/api/react/atlas/record/moveCoordinates", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            recordId: record.id,
            latitude,
            longitude,
            gpsPrecision,
            lastEditTimestampNum: record.lastEditTimestampNum,
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.message || payload?.error || "Failed to move record";
        throw new Error(message);
    }

    if (!payload?.success) {
        const message = payload?.message || payload?.error || "Failed to move record";
        throw new Error(message);
    }
}
