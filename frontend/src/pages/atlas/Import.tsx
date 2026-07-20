import {Row, Col, Container, Alert} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {useState, useCallback} from "react";
import {ImportForm, ImportResult} from "@/components/atlas/import/components";
import {useImportData} from "@/components/atlas/import/hooks";
import type {ImportOperation, ImportResult as ImportResultType, ImportError} from "@/components/atlas/import/types";

export default function Import() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.import.title"));

    const [importResult, setImportResult] = useState<ImportResultType | null>(null);
    const [error, setError] = useState<ImportError | null>(null);

    const handleSuccess = useCallback((result: ImportResultType) => {
        setImportResult(result);
        setError(null);
    }, []);

    const handleError = useCallback((err: ImportError) => {
        setError(err);
        setImportResult(null);
    }, []);

    const {uploadFile, isUploading, progress, resetProgress} = useImportData({
        onSuccess: handleSuccess,
        onError: handleError,
    });

    const handleFileSelected = useCallback(async (
        file: File,
        operation: ImportOperation,
        projectId?: number
    ) => {
        resetProgress();
        setImportResult(null);
        setError(null);
        
        await uploadFile(file, operation, projectId);
    }, [uploadFile, resetProgress]);

    const handleReset = useCallback(() => {
        setImportResult(null);
        setError(null);
        resetProgress();
    }, [resetProgress]);

    return (
        <Container fluid>
            <Row>
                <Col>
                    <h3>{t("atlas.import.title")}</h3>
                </Col>
            </Row>
            
            <Row className="mt-4">
                <Col md={10} className="offset-md-1">
                    {error && (
                        <div className="row mb-3">
                            <div className="col">
                                <Alert variant="danger">
                                    <h4>{t("atlas.import.component.uploadFailed")}</h4>
                                    <br />
                                    <p><u>{t("atlas.import.component.errorMessage")}</u>: {error.errorMessage}</p>
                                    <hr />
                                    <p>
                                        {t("atlas.import.component.contactSupport")}
                                        <a href="mailto:pladias@googlegroups.com">pladias@googlegroups.com</a>.
                                    </p>
                                </Alert>
                            </div>
                        </div>
                    )}

                    {importResult ? (
                        <ImportResult result={importResult} onReset={handleReset} />
                    ) : (
                        <ImportForm 
                            onFileSelected={handleFileSelected}
                            isUploading={isUploading}
                            progress={progress}
                        />
                    )}
                </Col>
            </Row>
        </Container>
    );
}