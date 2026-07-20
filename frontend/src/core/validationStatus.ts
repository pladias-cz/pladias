export const ValidationStatusId = {
    UNPROCESSED: 0,
    UNCERTAIN: 1,
    DECLINED: 2,
    ACCEPTED: 3,
} as const;


export type ValidationStatusId =
    typeof ValidationStatusId[keyof typeof ValidationStatusId];

export const ValidationStatusMeta: Record<ValidationStatusId, {
    color: string;
    i18nKey: string;
}> = {
    [ValidationStatusId.UNPROCESSED]: {
        color: "#bebebe",
        i18nKey: "record.validationStatus.unprocessed",
    },
    [ValidationStatusId.UNCERTAIN]: {
        color: "#EF7C09",
        i18nKey: "record.validationStatus.uncertain",
    },
    [ValidationStatusId.DECLINED]: {
        color: "#cc0000",
        i18nKey: "record.validationStatus.declined",
    },
    [ValidationStatusId.ACCEPTED]: {
        color: "#006600",
        i18nKey: "record.validationStatus.accepted",
    },
};