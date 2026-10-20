import {useState, type FormEvent} from "react";
import {Alert, Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {useNotifications} from "@/stores/notificationStore";
import ExportTraitList from "@/components/measurement/export/ExportTraitList";
import ExportTaxaList from "@/components/measurement/export/ExportTaxaList";
import ExportOptions from "@/components/measurement/export/ExportOptions";

const EXPORT_URL = "/api/react/measurement/complexExport";
const DOWNLOAD_CONTENT_TYPE = "application/x-download";

/** Chybová odpověď ze serveru – JsonResult, neplatné taxony jsou zvlášť. */
type ExportError = {
    message?: string;
    invalidTaxa?: string;
};

async function readError(res: Response): Promise<ExportError> {
    if (res.headers.get("content-type")?.includes("application/json")) {
        return ((await res.json().catch(() => null)) as ExportError | null) ?? {};
    }
    return {message: (await res.text().catch(() => "")).trim()};
}

function resolveFilename(contentDisposition: string | null): string {
    const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
    return match?.[1] ?? "complexExport.csv";
}

function download(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
}

export default function Export() {
    const {t} = useTranslation();
    usePageTitle(t("trait.export.title"));
    const {push} = useNotifications();

    const [submitting, setSubmitting] = useState(false);
    // neplatné názvy taxonů od serveru – jeden na řádek, aby se dalily označit a opravit
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

            const res = await fetch(EXPORT_URL, {
                method: "POST",
                body
            });

            if (!res.ok || !res.headers.get("content-type")?.includes(DOWNLOAD_CONTENT_TYPE)) {
                const error = await readError(res);
                push({type: "danger", message: error.message || t("trait.export.failed")});
                setInvalidTaxa(error.invalidTaxa ?? null);
                return;
            }

            download(await res.blob(), resolveFilename(res.headers.get("content-disposition")));
        } catch {
            push({type: "danger", message: t("trait.export.failed")});
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
