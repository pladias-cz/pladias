import React, {useEffect, useState} from "react";
import {Alert, Button, Col, Form, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function AddUser() {
    const {t} = useTranslation();
    usePageTitle(t("user.addUser.title"));
    const [formData, setFormData] = useState({
        name: "",
        surname: "",
        email: "",
        projectId: ""
    });

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Fetch projects data on component mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch("/api/react/projects/data");
                const data = await response.json();

                if (response.ok && data.success) {
                    setProjects(data.projects || []);
                } else {
                    setError(data.error || t("user.addUser.error"));
                }
            } catch (err) {
                setError(t("user.addUser.networkError"));
            } finally {
                setProjectsLoading(false);
            }
        };

        fetchProjects();
    }, [t]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const assignProjectToUser = async (userId, projectId) => {
        try {
            const response = await fetch("/api/react/users/rights/edit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: userId,
                    key: "AddProject",
                    value: projectId
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || t("user.addUser.error"));
            }

            return data;
        } catch (err) {
            throw err;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            // First, create the user
            const response = await fetch("/api/react/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: formData.name,
                    surname: formData.surname,
                    email: formData.email
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // If user creation was successful and a project was selected, assign the project
                if (formData.projectId) {
                    try {
                        await assignProjectToUser(data.user.id, formData.projectId);
                        setMessage(t("user.addUser.success") + " " + t("user.addUser.projectAssigned"));
                    } catch (projectError) {
                        setError(t("user.addUser.success") + " " + t("user.addUser.projectAssignmentError") + ": " + projectError.message);
                        return;
                    }
                } else {
                    setMessage(data.message || t("user.addUser.success"));
                }

                // Clear form
                setFormData({
                    name: "",
                    surname: "",
                    email: "",
                    projectId: ""
                });
            } else {
                setError(data.error || t("user.addUser.error"));
            }
        } catch (err) {
            setError(t("user.addUser.networkError"));
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

                    <Form.Group className="mb-3" controlId="projectId">
                        <Form.Label>{t("user.addUser.project")}</Form.Label>
                        {projectsLoading ? (
                            <Form.Control as="select" name="projectId" disabled>
                                <option>{t("common.loading")}</option>
                            </Form.Control>
                        ) : (
                            <Form.Control
                                as="select"
                                name="projectId"
                                value={formData.projectId}
                                onChange={handleChange}
                            >
                                <option value="">{t("user.addUser.noProject")}</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </Form.Control>
                        )}
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading || projectsLoading}
                    >
                        {loading ? t("user.addUser.submitting") : t("user.addUser.submit")}
                    </Button>
                </Form>
            </Col>
        </Row>
    );
}