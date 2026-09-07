import { useTranslation } from "react-i18next";
import { Form, Button } from "react-bootstrap";

export default function ExportTaxaList() {
    const { t } = useTranslation();

    return (
        <>
            <Form.Group className="mb-3">
                <Form.Control
                    as="textarea"
                    name="taxonList"
                    rows={12}
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

            <Button type="submit" variant="primary" size="sm" className="btn-block">
                {t("trait.export.submit")}
            </Button>
        </>
    );
}
