export const OriginalityStatusId = {
    NATIVE: 1,
    CULTIVATED: 2,
    NONNATIVE: 3,
    UNPROCESSED: 4,
} as const;


export type OriginalityStatusId =
    typeof OriginalityStatusId[keyof typeof OriginalityStatusId];

export const OriginalityStatusMeta: Record<OriginalityStatusId, {
    color: string;
    icon: string;
    i18nKey: string;
}> = {
    [OriginalityStatusId.NATIVE]: {
        color: "#000000",
        icon: "bi bi-houses",
        i18nKey: "record.originalityStatus.native",
    },
    [OriginalityStatusId.CULTIVATED]: {
        color: "#909090",
        icon: "bi bi-tree",
        i18nKey: "record.originalityStatus.cultivated",
    },
    [OriginalityStatusId.NONNATIVE]: {
        color: "#bbbb00",
        icon: "bi bi-car-front",
        i18nKey: "record.originalityStatus.nonnative",
    },
    [OriginalityStatusId.UNPROCESSED]: {
        color: "#ff6600",
        icon: "bi bi-question-octagon",
        i18nKey: "record.originalityStatus.unprocessed",
    },
};