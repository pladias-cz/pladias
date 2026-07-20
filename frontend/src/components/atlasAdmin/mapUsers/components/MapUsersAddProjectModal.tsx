/**
 * Add Project Modal for MapUsers
 */

import {Modal, Button, Form} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {Project} from '../types';

interface MapUsersAddProjectModalProps {
    show: boolean;
    projects: Project[];
    projectsLoading: boolean;
    selectedProjectId: string;
    onProjectSelect: (id: string) => void;
    onAdd: () => void;
    onClose: () => void;
}

export function MapUsersAddProjectModal({
    show,
    projects,
    projectsLoading,
    selectedProjectId,
    onProjectSelect,
    onAdd,
    onClose,
}: MapUsersAddProjectModalProps) {
    const {t} = useTranslation();

    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>{t("user.usersAdministration.addProject")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group controlId="projectSelect">
                    <Form.Label>{t("user.usersAdministration.selectProject")}</Form.Label>
                    {projectsLoading ? (
                        <Form.Control as="select" disabled>
                            <option>{t("common.loading")}</option>
                        </Form.Control>
                    ) : (
                        <Form.Control
                            as="select"
                            value={selectedProjectId}
                            onChange={(e) => onProjectSelect(e.target.value)}
                        >
                            <option value="">{t("user.usersAdministration.chooseProject")}</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>
                                    {project.abbrev || project.name}
                                </option>
                            ))}
                        </Form.Control>
                    )}
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    {t("cancel")}
                </Button>
                <Button 
                    variant="primary" 
                    onClick={onAdd} 
                    disabled={!selectedProjectId || projectsLoading}
                >
                    {t("user.usersAdministration.add")}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
