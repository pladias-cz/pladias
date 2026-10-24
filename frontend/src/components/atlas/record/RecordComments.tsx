import {Card, Table, Row, Col, Spinner, Button, Modal, Form} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {getRecordComments, createComment, updateComment, resolveComment, deleteComment} from "@/services/recordApi";
import {apiErrorMessage} from "@/services/apiClient";
import type {RecordComment} from '@/models/RecordComment';
import {useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useConfirm} from "@/hooks/useConfirm";
import {useUser} from "@/context/UserContext";

interface RecordCommentsProps {
    recordId: number;
    canResolveComments: boolean; // Server-computed flag (backend: Record.isUserElligibleToEditEverything)
}

export default function RecordComments({recordId, canResolveComments}: RecordCommentsProps) {
    const {t} = useTranslation();
    const user = useUser();
    const {confirm, dialog} = useConfirm();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingComment, setEditingComment] = useState<RecordComment | null>(null);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // komentáře záznamu – bez cache (sekce J), načtení při mountu; po mutacích
    // se seznam obnoví invalidací stejného klíče
    const {data: comments, isPending: loading, error} = useQuery({
        queryKey: ["recordComments", recordId],
        queryFn: () => getRecordComments(recordId),
    });
    const loadError = error ? apiErrorMessage(error, t("record.commentsLoadFailed")) : null;

    const nonDeletedComments = (comments ?? []).filter(c => !c.deleted);

    // Permission checks (matching backend logic)
    const canEditComments = !!user;

    // Updating a comment's text requires the same permission as resolving it
    // (backend RecordCommentController.updateComment checks record.isUserElligibleToEditEverything,
    // i.e. mapAdmin / taxon supervisor incl. parent taxa / project manager - NOT the comment author)
    const canUpdateComment = canResolveComments;

    const canDeleteComment = (comment: RecordComment): boolean => {
        if (!user) return false;
        // Author can delete their own comment (same as backend deleteComment line 181)
        if (comment.authorId && user.id === comment.authorId) return true;
        // MapAdmin can delete any comment (same as backend)
        if (user.isMapAdmin) return true;
        return false;
    };

    const formatDateTime = (timestamp: string | null): string => {
        if (!timestamp) return '-';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch {
            return timestamp;
        }
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;

        setSubmitting(true);
        setActionError(null);

        try {
            if (editingComment) {
                await updateComment(editingComment.id, newComment.trim());
            } else {
                await createComment(recordId, newComment.trim());
            }
            setNewComment("");
            setEditingComment(null);
            setShowModal(false);
            // Refresh comments – invalidace spustí refetch query
            await queryClient.invalidateQueries({queryKey: ["recordComments", recordId]});
        } catch (err) {
            setActionError(apiErrorMessage(err, t("record.commentActionFailed")));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditComment = (comment: RecordComment) => {
        setEditingComment(comment);
        setNewComment(comment.message ?? "");
        setActionError(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingComment(null);
    };

    const handleResolveComment = async (commentId: number) => {
        try {
            await resolveComment(commentId);
            // Refresh comments – invalidace spustí refetch query
            await queryClient.invalidateQueries({queryKey: ["recordComments", recordId]});
        } catch (err) {
            setActionError(apiErrorMessage(err, t("record.commentActionFailed")));
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!(await confirm({
            message: t("record.confirmDeleteComment"),
            confirmLabel: t("common.delete"),
        }))) {
            return;
        }

        try {
            await deleteComment(commentId);
            // Refresh comments – invalidace spustí refetch query
            await queryClient.invalidateQueries({queryKey: ["recordComments", recordId]});
        } catch (err) {
            setActionError(apiErrorMessage(err, t("record.commentActionFailed")));
        }
    };

    if (loading) {
        return (
            <Row className="mb-3">
                <Col>
                    <Card>
                        <Card.Body className="text-center py-4">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </Spinner>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        );
    }

    if (loadError) {
        return (
            <Row className="mb-3">
                <Col>
                    <Card border="danger">
                        <Card.Body className="text-center py-4">
                            <span className="text-danger">{t("common.error")}: {loadError}</span>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        );
    }

    return (
        <Row className="mb-3">
            <Col>
                <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <strong>
                            {t("record.comments")}{' '}
                            ({nonDeletedComments.filter(c => c.resolved === false).length} {t("record.unresolved")})
                        </strong>
                        {canEditComments && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    setEditingComment(null);
                                    setNewComment("");
                                    setShowModal(true);
                                }}
                            >
                                {t("record.addComment")}
                            </Button>
                        )}
                    </Card.Header>
                    <Card.Body>
                        <Table striped bordered hover size="sm">
                            <thead>
                            <tr>
                                <th>{t("record.commentAuthor")}</th>
                                <th>{t("record.commentMessage")}</th>
                                <th>{t("record.commentDate")}</th>
                                <th>{t("record.commentResolved")}</th>
                                <th>{t("record.resolvedBy")}</th>
                                <th>{t("record.resolvedWhen")}</th>
                                {canEditComments && <th>{t("common.actions")}</th>}
                            </tr>
                            </thead>
                            <tbody>
                            {nonDeletedComments.length === 0 ? (
                                <tr>
                                    <td colSpan={canEditComments ? 7 : 6} className="text-center text-muted">
                                        {t("common.noData")}
                                    </td>
                                </tr>
                            ) : (
                                nonDeletedComments.map((comment) => (
                                    <tr key={comment.id}>
                                        <td>{comment.authorName ?? '-'}</td>
                                        <td>{comment.message ?? '-'}</td>
                                        <td>
                                            {comment.createTimestamp
                                                ? new Date(comment.createTimestamp).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td>
                                            {comment.resolved
                                                ? t("common.yes")
                                                : t("common.no")}
                                        </td>
                                        <td>
                                            {comment.resolvedByName ?? '-'}
                                        </td>
                                        <td>
                                            {comment.resolved && comment.resolvedTimestamp
                                                ? formatDateTime(comment.resolvedTimestamp)
                                                : '-'}
                                        </td>
                                        {canEditComments && (
                                            <td>
                                                {/* Edit button: same permission as resolve (mapAdmin / supervisor incl. parent taxa / project manager), NOT the comment author */}
                                                {canUpdateComment && (
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-1"
                                                        onClick={() => handleEditComment(comment)}
                                                    >
                                                        {t("common.edit")}
                                                    </Button>
                                                )}
                                                {/* Resolve button: server-computed permission (mapAdmin / supervisor incl. parent taxa / project manager) */}
                                                {!comment.resolved && canResolveComments && (
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        className="me-1"
                                                        onClick={() => handleResolveComment(comment.id)}
                                                    >
                                                        {t("record.resolve")}
                                                    </Button>
                                                )}
                                                {/* Delete button: for comment author OR MapAdmin */}
                                                {canDeleteComment(comment) && (
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                    >
                                                        {t("common.delete")}
                                                    </Button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </Col>

            {/* Add / Edit Comment Modal */}
            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingComment ? t("record.editComment") : t("record.addComment")}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="newComment">
                            <Form.Label>{t("record.commentMessage")}</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={t("record.commentPlaceholder") || ""}
                            />
                        </Form.Group>
                        {actionError && (
                            <Form.Text className="text-danger">{actionError}</Form.Text>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || submitting}
                    >
                        {submitting ? t("common.saving") : t("common.save")}
                    </Button>
                </Modal.Footer>
            </Modal>
            {dialog}
        </Row>
    );
}
