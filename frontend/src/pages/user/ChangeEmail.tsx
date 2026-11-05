import React, {useState} from 'react';
import {Alert, Button, Col, Form, Row} from 'react-bootstrap';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';
import {changeEmail} from '@/services/userApi';
import {notifyApiError, useNotifications} from '@/stores/notificationStore';

interface ChangeEmailFormData {
    password: string;
    newEmail: string;
    confirmNewEmail: string;
}

export default function ChangeEmail() {

    const {t} = useTranslation();
    usePageTitle(t('user.changeEmail.title'));
    const [formData, setFormData] = useState<ChangeEmailFormData>({
        password: '',
        newEmail: '',
        confirmNewEmail: ''
    });

    const [loading, setLoading] = useState(false);
    // form validace zůstává inline; feedback akcí jde do globálních notifikací
    const [validationError, setValidationError] = useState<string | null>(null);
    const {push} = useNotifications();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidationError(null);

        if (formData.newEmail !== formData.confirmNewEmail) {
            setValidationError(t('user.changeEmail.emailsDoNotMatch'));
            return;
        }

        setLoading(true);

        try {
            const successMessage = await changeEmail({
                password: formData.password,
                newEmail: formData.newEmail
            });
            push({type: 'success', message: successMessage || t('user.changeEmail.success')});
            // Clear form
            setFormData({
                password: '',
                newEmail: '',
                confirmNewEmail: ''
            });
        } catch (err) {
            notifyApiError(err, t('user.changeEmail.networkError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Row>
            <Col sm={12} md={8} lg={6} xl={4} className="mx-auto">
                <h3>{t('user.changeEmail.title')}</h3>
                <p>{t('user.changeEmail.description')}</p>

                {validationError && <Alert variant="danger">{validationError}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="password">
                        <Form.Label>{t('user.changeEmail.password')}</Form.Label>
                        <Form.Control
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="newEmail">
                        <Form.Label>{t('user.changeEmail.newEmail')}</Form.Label>
                        <Form.Control
                            type="email"
                            name="newEmail"
                            value={formData.newEmail}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="confirmNewEmail">
                        <Form.Label>{t('user.changeEmail.confirmNewEmail')}</Form.Label>
                        <Form.Control
                            type="email"
                            name="confirmNewEmail"
                            value={formData.confirmNewEmail}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? t('user.changeEmail.submitting') : t('user.changeEmail.submit')}
                    </Button>
                </Form>
            </Col>
        </Row>
    );
}
