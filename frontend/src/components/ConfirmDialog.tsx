import React from "react";
import {useTranslation} from "react-i18next";
import {Button, Modal} from "react-bootstrap";

/**
 * Potvrzovací dialog aplikace – náhrada
 * nativního potvrzovacího dialogu prohlížeče (blokující, nelokalizovatelné
 * styly, vizuálně cizí Bootstrap UI).
 *
 * Logiku (promise, otevírání) vlastní `hooks/useConfirm.tsx` – tohle je
 * prezentační modal. Použití:
 * ```tsx
 * const {confirm, dialog} = useConfirm();
 * ...
 * if (!(await confirm({message: t("x.confirm")}))) return;
 * await deleteTaxon();
 * ...
 * return (<>{dialog}<ZbytekUI/></>);
 * ```
 */

export interface ConfirmOptions {
    /** Text dotazu (string nebo React node – např. s <strong>). */
    message: React.ReactNode;
    /** Volitelný titulek; výchozí `common.confirm.title`. */
    title?: React.ReactNode;
    /** Volitelný label potvrzovacího tlačítka; výchozí `common.yes`. */
    confirmLabel?: React.ReactNode;
    /** Volitelný label rušícího tlačítka; výchozí `common.cancel`. */
    cancelLabel?: React.ReactNode;
    /** Varianta potvrzovacího tlačítka; výchozí `danger` (destruktivní akce). */
    confirmVariant?: "danger" | "primary" | "warning";
}

interface ConfirmDialogProps extends ConfirmOptions {
    onConfirm: () => void;
    onCancel: () => void;
}

/** Prezentační modal – veškerá logika (promise, otevírání) je v `useConfirm`. */
export function ConfirmDialog({
                                  message,
                                  title,
                                  confirmLabel,
                                  cancelLabel,
                                  confirmVariant = "danger",
                                  onConfirm,
                                  onCancel,
                              }: ConfirmDialogProps) {
    const {t} = useTranslation();

    return (
        <Modal show onHide={onCancel} centered>
            <Modal.Header closeButton>
                <Modal.Title>{title ?? t("common.confirm.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>{message}</Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onCancel}>
                    {cancelLabel ?? t("common.cancel")}
                </Button>
                <Button variant={confirmVariant} onClick={onConfirm}>
                    {confirmLabel ?? t("common.yes")}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ConfirmDialog;
