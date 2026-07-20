import React, {useState} from "react";
import {Alert, Button, Col, Form, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function ChangeEmail() {

    const {t} = useTranslation();
    usePageTitle(t("user.changeEmail.title"));
    const [formData, setFormData] = useState({
        password: "",
        newEmail: ""
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

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
            const response = await fetch("/api/react/user/changeEmail", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || t("user.changeEmail.success"));
                // Clear form
                setFormData({
                    password: "",
                    newEmail: ""
                });
            } else {
                setError(data.error || t("user.changeEmail.error"));
            }
        } catch (err) {
            setError(t("user.changeEmail.networkError"));
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