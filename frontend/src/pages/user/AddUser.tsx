import React, {useState} from "react";
import {Alert, Button, Col, Form, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {addUser} from "@/services/userApi";
import {apiErrorMessage} from "@/services/apiClient";

interface AddUserFormData {
    name: string;
    surname: string;
    email: string;
}

export default function AddUser() {
    const {t} = useTranslation();
    usePageTitle(t("user.addUser.title"));
    const [formData, setFormData] = useState<AddUserFormData>({
        name: "",
        surname: "",
        email: ""
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
            const successMessage = await addUser(formData);
            setMessage(successMessage || t("user.addUser.success"));

            // Clear form
            setFormData({
                name: "",
                surname: "",
                email: ""
            });
        } catch (err) {
            setError(apiErrorMessage(err, t("user.addUser.networkError")));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Row>
            <Col sm={12} md={8} lg={6} xl={4} className="mx-auto">
                <h3>{t("user.addUser.title")}</h3>

                {error && <Alert variant="danger">{error}</Alert>}
                {message && <Alert variant="success">{message}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="name">
                        <Form.Label>{t("user.addUser.name")}</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="surname">
                        <Form.Label>{t("user.addUser.surname")}</Form.Label>
                        <Form.Control
                            type="text"
                            name="surname"
                            value={formData.surname}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="email">
                        <Form.Label>{t("user.addUser.email")}</Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? t("user.addUser.submitting") : t("user.addUser.submit")}
                    </Button>
                </Form>
            </Col>
        </Row>
    );
}
