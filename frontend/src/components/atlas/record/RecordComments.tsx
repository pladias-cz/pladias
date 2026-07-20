import {Card, Table, Row, Col, Spinner, Button, Modal, Form} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {fetchRecordComments, createComment, resolveComment, deleteComment} from "./recordService";
import type { RecordComment } from '@/models/RecordComment';
import {useState, useEffect} from "react";
import {useUser} from "@/context/UserContext";

interface RecordCommentsProps {
    recordId: number;
    recordTaxonId?: number; // For permission checks
}

export default function RecordComments({recordId, recordTaxonId}: RecordCommentsProps) {
    const {t} = useTranslation();
    const user = useUser();
    const [comments, setComments] = useState<RecordComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        
        fetchRecordComments(recordId)
            .then(data => {
                setComments(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [recordId]);

    const nonDeletedComments = comments.filter(c => !c.deleted);

    // Permission checks (matching backend logic)
    const canEditComments = !!user;
    
    const canResolveComment = (comment: RecordComment): boolean => {
        if (!user) return false;
        if (comment.resolved) return false;
        if (!recordTaxonId) return false;
        
        // Match backend: isUserElligibleToEditEverything
        // 1. MapAdmin can resolve anything
        if (user.isMapAdmin) return true;
        
        // 2. User must be a supervisor of THIS specific taxon (not just any TaxonAdmin)
        // Note: isTaxonAdmin alone is NOT enough - they must supervise this taxon
        return user.supervisedTaxonIds.includes(recordTaxonId);
    };

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
            await createComment(recordId, newComment.trim());
            setNewComment("");
            setShowModal(false);
            // Refresh comments
            const data = await fetchRecordComments(recordId);
            setComments(data);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : String(err));
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolveComment = async (commentId: number) => {
        try {
            await resolveComment(commentId);
            // Refresh comments
            const data = await fetchRecordComments(recordId);
            setComments(data);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : String(err));
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!window.confirm(t("record.confirmDeleteComment") || "Are you sure?")) {
            return;
        }
        
        try {
            await deleteComment(commentId);
            // Refresh comments
            const data = await fetchRecordComments(recordId);
            setComments(data);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : String(err));
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

    if (error) {
        return (
            <Row className="mb-3">
                <Col>
                    <Card border="danger">
                        <Card.Body className="text-center py-4">
                            <span className="text-danger">{t("common.error")}: {error}</span>
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
                            ({comments.filter(c => !c.deleted && c.resolved === false).length} {t("record.unresolved")})
                        </strong>
                        {canEditComments && (
                            <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => setShowModal(true)}
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
                                                    {/* Resolve button: only for users with elevated permissions (MapAdmin/TaxonAdmin/supervisor) */}
                                                    {!comment.resolved && canResolveComment(comment) && (
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            className="me-1"
                                                            onClick={() => handleResolveComment(comment.id)}
                                                        >
                                                            {t("common.resolve")}
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

            {/* Add Comment Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{t("record.addComment")}</Modal.Title>
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
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
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
        </Row>
    );
}
