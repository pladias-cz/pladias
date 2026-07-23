export type BulkRecordVersion = {
    id: number;
    lastEditTimestampNum: number;
};

export type BulkOperationFailure = {
    id: number;
    error: string;
};

export type BulkOperationProgress = {
    processed: number;
    total: number;
};

export type BulkOperationResult = {
    successIds: number[];
    failed: BulkOperationFailure[];
};

export async function runBulkOperationSequential(
    records: BulkRecordVersion[],
    operation: (record: BulkRecordVersion) => Promise<void>,
    onProgress?: (progress: BulkOperationProgress) => void,
): Promise<BulkOperationResult> {
    const successIds: number[] = [];
    const failed: BulkOperationFailure[] = [];

    for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        try {
            await operation(record);
            successIds.push(record.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            failed.push({id: record.id, error: message});
        } finally {
            onProgress?.({processed: index + 1, total: records.length});
        }
    }

    return {successIds, failed};
}
