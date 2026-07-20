import {Row, Col, Container, Alert} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {useState, useCallback} from "react";
import {ImportCSVForm} from "@/components/atlas/importCsv/components";
import {useImportCSVData} from "@/components/atlas/importCsv/hooks";
import type {ImportOperation, ImportError} from "@/components/atlas/importCsv/types";

export default function ImportCSV() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.importCSV.title"));

    const [error, setError] = useState<ImportError | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleSuccess = useCallback(() => {
        setUploadSuccess(true);
        setError(null);
    }, []);

    const handleError = useCallback((err: ImportError) => {
        setError(err);
        setUploadSuccess(false);
    }, []);

    const {uploadFile, isUploading} = useImportCSVData({
        onSuccess: handleSuccess,
        onError: handleError,
    });

    const handleFileSelected = useCallback(async (
        file: File,
        operation: ImportOperation,
        projectId: number
    ) => {
        setUploadSuccess(false);
        setError(null);
        
        await uploadFile(file, operation, projectId);
    }, [uploadFile]);

    return (
        <Container fluid>
            <Row>
                <Col>
                    <h3>{t("atlas.importCSV.title")}</h3>
                </Col>
            </Row>
            
            <Row className="mt-4">
                <Col md={10} className="offset-md-1">
                    {error && (
                        <div className="row mb-3">
                            <div className="col">
                                <Alert variant="danger">
                                    <h4>{t("other.components.atlas.importCSV.uploadFailed")}</h4>
                                    <br />
                                    <p><u>{t("other.components.atlas.importCSV.errorMessage")}</u>: {error.errorMessage}</p>
                                    <hr />
                                    <p>
                                        {t("other.components.atlas.importCSV.contactSupport")}
                                        <a href="mailto:pladias@googlegroups.com">pladias@googlegroups.com</a>.
                                    </p>
                                </Alert>
                            </div>
                        </div>
                    )}

                    {uploadSuccess ? (
                        <div className="row">
                            <div className="col">
                                <Alert variant="success">
                                    <h4>{t("other.components.atlas.importCSV.uploadSuccess")}</h4>
                                    <p>{t("other.components.atlas.importCSV.emailNotificationInfo")}</p>
                                </Alert>
                            </div>
                        </div>
                    ) : (
                        <ImportCSVForm 
                            onFileSelected={handleFileSelected}
                            isUploading={isUploading}
                        />
                    )}
                </Col>
            </Row>
        </Container>
    );
}
