import {useState} from 'react';
import {Button, Form, Modal} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {createComment} from '../record/recordService';
import {useUser} from '@/context/UserContext';

interface AddCommentModalProps {
    show: boolean;
    recordId: number;
    onHide: () => void;
    onCommentAdded?: () => void;
}

export function AddCommentModal({show, recordId, onHide, onCommentAdded}: AddCommentModalProps) {
    const {t} = useTranslation();
    const user = useUser();
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Only show modal if user is logged in
    if (!user) {
        return null;
    }

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;

        setSubmitting(true);
        setActionError(null);

        try {
            await createComment(recordId, newComment.trim());
            setNewComment('');
            onHide();
            onCommentAdded?.();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide}>
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
                            placeholder={t("record.commentPlaceholder") || ''}
                        />
                    </Form.Group>
                    {actionError && (
                        <Form.Text className="text-danger">{actionError}</Form.Text>
                    )}
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                >
                    {submitting ? t('common.saving') : t('common.save')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default AddCommentModal;