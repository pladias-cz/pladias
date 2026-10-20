import { Button, Card, Form, Spinner } from "react-bootstrap";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Taxon } from "@/models/Taxon";
import { type TaxonId } from "@/models/TaxonId";
import TaxaPossibleParentAutocomplete from "@/components/autocomplete/TaxaPossibleParentAutocomplete";
import { useConfirm } from "@/hooks/useConfirm";
import { useTranslation } from 'react-i18next';

interface Props {
    taxon: Taxon;
    onMoved: (updated: Taxon) => void;
}

export default function MoveTaxonCard({ taxon, onMoved }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { confirm, dialog } = useConfirm();

    const [selectedParentId, setSelectedParentId] = useState<TaxonId | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [moveError, setMoveError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    async function handleMove() {
        if (selectedParentId == null) return;

        setIsMoving(true);
        setMoveError(null);

        try {
            const res = await fetch(`/api/react/taxon/${taxon.id}/move`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ parentId: selectedParentId.id }),
            });

            if (!res.ok) {
                throw new Error(t("taxon.move.moveFailed"));
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.message ?? t("taxon.move.moveFailed"));
            }

            const updated: Taxon = json.data;
            onMoved(updated);
            setSelectedParentId(null);

        } catch (e) {
            setMoveError((e as Error).message);
        } finally {
            setIsMoving(false);
        }
    }

    async function handleDelete() {
        if (!(await confirm({
            message: t("taxon.move.deleteConfirm", { name: taxon.nameLat }),
            confirmLabel: t("common.delete"),
        }))) {
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const res = await fetch(`/api/react/taxon/${taxon.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error(t("taxon.move.deleteFailed"));
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.message ?? t("taxon.move.deleteFailed"));
            }

            navigate(`/user/taxaAdministration/${taxon.parentId}`);

        } catch (e) {
            setDeleteError((e as Error).message);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Card>
            {dialog}
            <Card.Header>{t("taxon.move.title", { name: taxon.nameLat })}</Card.Header>
            <Card.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>{t("taxon.move.newParent")}</Form.Label>
                        <TaxaPossibleParentAutocomplete
                            taxonId={taxon.id}
                            onSelect={setSelectedParentId}
                        />
                    </Form.Group>

                    {moveError && (
                        <div className="text-danger mb-2">
                            {moveError}
                        </div>
                    )}

                    <Button
                        onClick={handleMove}
                        disabled={selectedParentId == null || isMoving}
                    >
                        {isMoving ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                {t("taxon.move.moving")}
                            </>
                        ) : (
                            t("taxon.move.moveButton")
                        )}
                    </Button>
                </Form>

                <hr />

                <p>
                    {t("taxon.move.deleteDescription")}
                </p>

                {deleteError && (
                    <div className="text-danger mb-2">
                        {deleteError}
                    </div>
                )}

                <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            {t("taxon.move.deleting")}
                        </>
                    ) : (
                        t("taxon.move.deleteButton")
                    )}
                </Button>
            </Card.Body>
        </Card>
    );
}
