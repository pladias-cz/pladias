import {useState, type FormEvent} from "react";
import {Alert, Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {notifyApiError} from "@/stores/notificationStore";
import {ApiError} from "@/services/apiClient";
import {exportTraits} from "@/services/traitApi";
import {downloadBlob} from "@/core/dataTable/export";
import ExportTraitList from "@/components/measurement/export/ExportTraitList";
import ExportTaxaList from "@/components/measurement/export/ExportTaxaList";
import ExportOptions from "@/components/measurement/export/ExportOptions";

/** Chybová odpověď complex exportu – neplatné taxony nese zvlášť `invalidTaxa`. */
function readInvalidTaxa(err: unknown): string | null {
    const payload = err instanceof ApiError ? err.payload : undefined;
    const invalidTaxa = (payload as { invalidTaxa?: unknown } | undefined)?.invalidTaxa;
    return typeof invalidTaxa === "string" && invalidTaxa ? invalidTaxa : null;
}

export default function Export() {
    const {t} = useTranslation();
    usePageTitle(t("trait.export.title"));

    const [submitting, setSubmitting] = useState(false);
    // neplatné názvy taxonů od serveru – jeden na řádek, aby se daly označit a opravit
    const [invalidTaxa, setInvalidTaxa] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;

        setSubmitting(true);
        setInvalidTaxa(null);

        try {
            const body = new URLSearchParams();
            // backend čte formulář jako urlencoded (traitIds[], ranks[], entryTypes[], …)
            new FormData(form).forEach((value, key) => body.append(key, String(value)));

            const file = await exportTraits(body);
            downloadBlob(file.blob, file.filename);
        } catch (e) {
            setInvalidTaxa(readInvalidTaxa(e));
            notifyApiError(e, t("trait.export.failed"));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="form-horizontal">
            <h3>{t("trait.export.title")}</h3>
            {/* hláška o neúspěchu jde do globální notifikace; seznam neplatných
                taxonů zůstává u formuláře – uživatel ho podle něj opravuje */}
            {invalidTaxa && (
                <Alert variant="danger" dismissible onClose={() => setInvalidTaxa(null)}>
                    <pre className="mb-0">{invalidTaxa}</pre>
                </Alert>
            )}
            <Row>
                <Col>
                    <ExportTraitList></ExportTraitList>
                </Col>
                <Col>
                    <ExportTaxaList submitting={submitting}></ExportTaxaList>
                </Col>
                <Col>
                    <ExportOptions></ExportOptions>
                </Col>
            </Row>
        </form>
    );
}
