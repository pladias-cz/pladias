import React, {useRef, useState} from 'react';
import {Alert, Button, Form, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useProjectsData} from '../../import/hooks/useProjectsData';
import type {ImportOperation} from '../types';

interface ImportCSVFormProps {
    onFileSelected: (file: File, operation: ImportOperation, projectId: number) => void;
    isUploading: boolean;
}

export function ImportCSVForm({onFileSelected, isUploading}: ImportCSVFormProps) {
    const {t} = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [operation, setOperation] = useState<ImportOperation>('validation');
    const [projectId, setProjectId] = useState<number | undefined>();

    const {projects, isLoading: projectsLoading} = useProjectsData();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile && projectId) {
            onFileSelected(selectedFile, operation, projectId);
        }
    };

    const handleOperationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOperation(e.target.value as ImportOperation);
    };

    const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setProjectId(e.target.value ? Number(e.target.value) : undefined);
    };

    return (
        <div className="row">
            <div className="col-sm-10 offset-sm-1">
                <p>
                    {t("other.components.atlas.importCSV.documentationLink")}
                    {' '}
                    <a
                        href="//git.sorbus.ibot.cas.cz/pladias/pladias-core/documentation/-/blob/master/atlas/validation.md?ref_type=heads"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t("other.components.atlas.importCSV.documentation")}
                    </a>.
                </p>
                <hr/>
                <Form onSubmit={handleSubmit} className="form-horizontal" id="submitForm">
                    <Form.Group className="mb-3">
                        <Form.Control
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".csv"
                            disabled={isUploading}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <div className="form-check">
                            <Form.Check
                                type="radio"
                                name="operation"
                                id="operation_validation"
                                value="validation"
                                checked={operation === 'validation'}
                                onChange={handleOperationChange}
                                label={t("other.components.atlas.importCSV.validate")}
                                disabled={isUploading}
                            />
                        </div>
                        <div className="form-check">
                            <Form.Check
                                type="radio"
                                name="operation"
                                id="operation_import"
                                value="import"
                                checked={operation === 'import'}
                                onChange={handleOperationChange}
                                label={t("other.components.atlas.importCSV.import")}
                                disabled={isUploading}
                            />
                        </div>

                        <div id="import_selects" className="mt-3">
                            <ProjectSelect
                                projectId={projectId}
                                projects={projects}
                                isLoading={projectsLoading}
                                onChange={handleProjectChange}
                                disabled={isUploading}
                            />
                        </div>

                        <SubmitButton
                            isUploading={isUploading}
                            hasFile={!!selectedFile}
                            hasProject={!!projectId}
                            t={t}
                        />
                    </Form.Group>
                </Form>

                {isUploading && (
                    <div id="after-submit-message" className="mt-3">
                        <Alert variant="info" className="text-center">
                            {t("other.components.atlas.importCSV.processing")}
                            <br/>
                            {t("other.components.atlas.importCSV.pleaseWait")}
                        </Alert>
                    </div>
                )}

                <p>{t("other.components.atlas.importCSV.recommendation")}</p>
                <p>{t("other.components.atlas.importCSV.emailNotification")}</p>
                <p>{t("other.components.atlas.importCSV.emptyRowsWarning")}</p>
                <p>{t("other.components.atlas.importCSV.recordsLimitWarning")}</p>

            </div>
        </div>
    );
}

interface ProjectSelectProps {
    projectId: number | undefined;
    projects: Array<{ id: number; name: string }>;
    isLoading: boolean;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled: boolean;
}

function ProjectSelect({projectId, projects, isLoading, onChange, disabled}: ProjectSelectProps) {
    const {t} = useTranslation();

    return (
        <Form.Select
            value={projectId || ''}
            onChange={onChange}
            disabled={disabled || isLoading}
            style={{width: '320px'}}
        >
            <option value="">
                {isLoading ? t("common.loading") : t("other.components.atlas.importCSV.projectSelect")}
            </option>
            {projects.map((project) => (
                <option key={project.id} value={project.id}>
                    {project.name}
                </option>
            ))}
        </Form.Select>
    );
}

interface SubmitButtonProps {
    isUploading: boolean;
    hasFile: boolean;
    hasProject: boolean;
    t: (key: string) => string;
}

function SubmitButton({isUploading, hasFile, hasProject, t}: SubmitButtonProps) {
    return (
        <Button
            type="submit"
            id="submit"
            variant="primary"
            className="mt-3"
            disabled={!hasFile || !hasProject || isUploading}
        >
            {isUploading ? (
                <>
                    <Spinner size="sm" className="me-1"/>
                    {t("common.submitting")}
                </>
            ) : (
                t("other.components.atlas.importCSV.submit")
            )}
        </Button>
    );
}
