import React, {useState} from "react";
import {Alert, Button, Col, Form, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {changeEmail} from "@/services/userApi";
import {apiErrorMessage} from "@/services/apiClient";

interface ChangeEmailFormData {
    password: string;
    newEmail: string;
    confirmNewEmail: string;
}

export default function ChangeEmail() {

    const {t} = useTranslation();
    usePageTitle(t("user.changeEmail.title"));
    const [formData, setFormData] = useState<ChangeEmailFormData>({
        password: "",
        newEmail: "",
        confirmNewEmail: ""
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (formData.newEmail !== formData.confirmNewEmail) {
                setError(t("user.changeEmail.emailsDoNotMatch"));
                return;
            }

            const successMessage = await changeEmail({
                password: formData.password,
                newEmail: formData.newEmail
            });
            setMessage(successMessage || t("user.changeEmail.success"));
            // Clear form
            setFormData({
                password: "",
                newEmail: "",
                confirmNewEmail: ""
            });
        } catch (err) {
            setError(apiErrorMessage(err, t("user.changeEmail.networkError")));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Row>
            <Col sm={12} md={8} lg={6} xl={4} className="mx-auto">
                <h3>{t("user.changeEmail.title")}</h3>
                <p>{t("user.changeEmail.description")}</p>

                {error && <Alert variant="danger">{error}</Alert>}
                {message && <Alert variant="success">{message}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="password">
                        <Form.Label>{t("user.changeEmail.password")}</Form.Label>
                        <Form.Control
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="newEmail">
                        <Form.Label>{t("user.changeEmail.newEmail")}</Form.Label>
                        <Form.Control
                            type="email"
                            name="newEmail"
                            value={formData.newEmail}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="confirmNewEmail">
                        <Form.Label>{t("user.changeEmail.confirmNewEmail")}</Form.Label>
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
                        {loading ? t("user.changeEmail.submitting") : t("user.changeEmail.submit")}
                    </Button>
                </Form>
            </Col>
        </Row>
    );
}
