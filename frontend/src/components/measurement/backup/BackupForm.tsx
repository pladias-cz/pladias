import {useState, type FormEvent} from 'react';
import {Button, Form, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useNotifications} from '@/stores/notificationStore';
import {notifyApiError} from '@/stores/notificationStore';
import {backupTraits} from '@/services/traitApi';

export default function BackupForm() {
    const {t} = useTranslation();
    const {push} = useNotifications();

    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setSubmitting(true);

        try {
            const message = await backupTraits(description);

            push({type: 'success', message: message || t('trait.backup.started')});
            setDescription('');
        } catch (e) {
            notifyApiError(e, t('trait.backup.error'));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="backupDescription">
                <Form.Label>{t('trait.backup.note')}</Form.Label>
                <Form.Control
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('trait.backup.notePlaceholder')}
                    disabled={submitting}
                    required
                />
            </Form.Group>

            <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? (
                    <>
                        <Spinner as="span" size="sm" animation="border" className="me-2"/>
                        {t('trait.backup.submitting')}
                    </>
                ) : (
                    t('trait.backup.submit')
                )}
            </Button>
        </Form>
    );
}
