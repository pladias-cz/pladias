import React, {useState} from "react";
import {Alert, Button, Col, Form, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {changePassword, createApiToken} from "@/services/userApi";
import {apiErrorMessage} from "@/services/apiClient";

interface ChangePasswordFormData {
    originalPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

export default function ChangePassword() {

    const {t} = useTranslation();
    usePageTitle(t("user.changePassword.title"));
    const [formData, setFormData] = useState<ChangePasswordFormData>({
        originalPassword: "",
        newPassword: "",
        confirmNewPassword: ""
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [token, setToken] = useState<string | null>(null);
    const [tokenLoading, setTokenLoading] = useState(false);

    const handleCreateToken = async (): Promise<void> => {
        setTokenLoading(true);
        setError(null);
        setMessage(null);
        setToken(null);

        try {
            setToken(await createApiToken());
        } catch (err) {
            setError(apiErrorMessage(err, t("user.changePassword.tokenError")));
        } finally {
            setTokenLoading(false);
        }
    };

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
            const successMessage = await changePassword(formData);
            setMessage(successMessage || t("user.changePassword.success"));
            // Clear form
            setFormData({
                originalPassword: "",
                newPassword: "",
                confirmNewPassword: ""
            });
        } catch (err) {
            setError(apiErrorMessage(err, t("user.changePassword.networkError")));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Row>
            <Col sm={12} md={8} lg={6} xl={4} className="mx-auto">
                <h3>{t("user.changePassword.title")}</h3>
                <p>{t("user.changePassword.description")}</p>

                {error && <Alert variant="danger">{error}</Alert>}
                {message && <Alert variant="success">{message}</Alert>}
                {token && (
                    <Alert variant="info" dismissible onClose={() => setToken(null)}>
                        {t("user.changePassword.tokenCreated")}
                        <div className="mt-2"><code className="user-select-all text-break">{token}</code></div>
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="originalPassword">
                        <Form.Label>{t("user.changePassword.originalPassword")}</Form.Label>
                        <Form.Control
                            type="password"
                            name="originalPassword"
                            value={formData.originalPassword}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="newPassword">
                        <Form.Label>{t("user.changePassword.newPassword")}</Form.Label>
                        <Form.Control
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="confirmNewPassword">
                        <Form.Label>{t("user.changePassword.confirmNewPassword")}</Form.Label>
                        <Form.Control
                            type="password"
                            name="confirmNewPassword"
                            value={formData.confirmNewPassword}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? t("user.changePassword.submitting") : t("user.changePassword.submit")}
                    </Button>
                    <Button
                        variant="secondary"
                        className="ms-2"
                        type="button"
                        onClick={handleCreateToken}
                        disabled={tokenLoading}
                    >
                        {tokenLoading ? t("user.changePassword.creatingToken") : t("user.changePassword.createToken")}
                    </Button>
                </Form>
            </Col>
        </Row>
    );
}
