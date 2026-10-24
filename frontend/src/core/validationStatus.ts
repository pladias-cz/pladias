export const ValidationStatusId = {
    UNPROCESSED: 0,
    UNCERTAIN: 1,
    DECLINED: 2,
    ACCEPTED: 3,
} as const;


export type ValidationStatusId =
    typeof ValidationStatusId[keyof typeof ValidationStatusId];

export type ValidationStatusI18nKey =
    | 'record.validation.unprocessed'
    | 'record.validation.uncertain'
    | 'record.validation.declined'
    | 'record.validation.accepted';

export const ValidationStatusMeta: Record<ValidationStatusId, {
    color: string;
    i18nKey: ValidationStatusI18nKey;
}> = {
    [ValidationStatusId.UNPROCESSED]: {
        color: '#bebebe',
        i18nKey: 'record.validation.unprocessed',
    },
    [ValidationStatusId.UNCERTAIN]: {
        color: '#EF7C09',
        i18nKey: 'record.validation.uncertain',
    },
    [ValidationStatusId.DECLINED]: {
        color: '#cc0000',
        i18nKey: 'record.validation.declined',
    },
    [ValidationStatusId.ACCEPTED]: {
        color: '#006600',
        i18nKey: 'record.validation.accepted',
    },
};