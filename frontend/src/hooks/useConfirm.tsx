import React, {useCallback, useState} from "react";
import {ConfirmDialog, type ConfirmOptions} from "@/components/ConfirmDialog";

interface PendingConfirm {
    options: ConfirmOptions;
    resolve: (confirmed: boolean) => void;
}

/**
 * Imperativní potvrzení akce:
 *
 * ```tsx
 * const {confirm, dialog} = useConfirm();
 * if (!(await confirm({message: t("x.confirm")}))) return;
 * await deleteTaxon();
 * ...
 * return (<>{dialog}<ZbytekUI/></>); // {dialog} jednou v kořeni komponenty
 * ```
 *
 * Promise se řeší kliknutím na Ano/Zrušit i zavřením dialogu (esc, klik mimo) → `false`.
 */
export function useConfirm(): {confirm: (options: ConfirmOptions) => Promise<boolean>; dialog: React.ReactNode} {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setPending({options, resolve});
        });
    }, []);

    const settle = useCallback((confirmed: boolean) => {
        setPending((current) => {
            current?.resolve(confirmed);
            return null;
        });
    }, []);

    const dialog = pending ? (
        <ConfirmDialog
            {...pending.options}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
        />
    ) : null;

    return {confirm, dialog};
}