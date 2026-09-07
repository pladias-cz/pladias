import { useTranslation } from "react-i18next";
import { Form, Button, Spinner } from "react-bootstrap";

interface ExportTaxaListProps {
    submitting: boolean;
}

export default function ExportTaxaList({ submitting }: ExportTaxaListProps) {
    const { t } = useTranslation();

    return (
        <>
            <Form.Group className="mb-3">
                <Form.Control
                    as="textarea"
                    name="taxonList"
                    rows={12}
                    disabled={submitting}
                    placeholder={t(
                        "trait.export.placeholder",
                        "Zde vkopírujte seznam požadovaných taxonů v podobě latinských jmen na jednotlivých řádcích."
                    )}
                />
            </Form.Group>

            <div className="form-check mb-3">
                <Form.Check
                    type="checkbox"
                    id="suppressedExcluded"
                    name="suppressedExcluded"
                    label={t("trait.export.suppressed")}
                    defaultChecked
                />
            </div>

            <Button type="submit" variant="primary" size="sm" className="btn-block" disabled={submitting}>
                {submitting ? (
                    <>
                        <Spinner as="span" size="sm" animation="border" className="me-2"/>
                        {t("common.submitting")}
                    </>
                ) : (
                    t("trait.export.submit")
                )}
            </Button>
        </>
    );
}
