import React, {useState} from "react";
import {Alert, Button, Col, Form, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function ChangePassword() {

    const {t} = useTranslation();
    usePageTitle(t("user.changePassword.title"));
    const [formData, setFormData] = useState({
        originalPassword: "",
        newPassword: "",
        confirmNewPassword: ""
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const [token, setToken] = useState(null);
    const [tokenLoading, setTokenLoading] = useState(false);

    const handleCreateToken = async () => {
        setTokenLoading(true);
        setError(null);
        setMessage(null);
        setToken(null);

        try {
            const response = await fetch("/api/react/user/createToken", {method: "POST"});
            const data = await response.json();

            if (response.ok && data.success) {
                setToken(data.token);
            } else {
                setError(data.error || data.message || t("user.changePassword.tokenError"));
            }
        } catch (err) {
            setError(t("user.changePassword.networkError"));
        } finally {
            setTokenLoading(false);
        }
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch("/api/react/user/changePassword", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || t("user.changePassword.success"));
                // Clear form
                setFormData({
                    originalPassword: "",
                    newPassword: "",
                    confirmNewPassword: ""
                });
            } else {
                setError(data.error || t("user.changePassword.error"));
            }
        } catch (err) {
            setError(t("user.changePassword.networkError"));
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