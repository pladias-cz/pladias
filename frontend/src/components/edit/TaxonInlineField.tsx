import {useState} from "react";
import {Col, Form, Row, Spinner} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type {Taxon} from "@/models/Taxon";
import type {Option} from "@/models/Option";
import {updateTaxonField, type TaxonEditorField} from "@/services/taxonApi";
import {notifyApiError} from "@/stores/notificationStore";

/** Mapování backend konstant polí (PATCH) na vlastnosti modelu Taxon. */
const FIELD_TO_PROPERTY: Record<TaxonEditorField, keyof Taxon> = {
    LATNAME: "nameLat",
    NAMEHTML: "nameHtml",
    CZNAME: "nameCz",
    RANK: "rank",
    AUTHOR: "author",
    HYBRIDPARENTAGE: "hybridParents",
    SUPPRESSED: "suppressed",
    COMMENT: "note",
};

interface Props {
    label: string;
    taxonId: number;
    field: TaxonEditorField;
    value: string | boolean | number | null | undefined;
    type?: "text" | "select" | "boolean";
    options?: Option[];
    render?: (v: string | boolean | number | null) => React.ReactNode;
    /** Volá se s celým aktualizovaným taxonem z backendu. */
    onUpdated: (updated: Taxon) => void;
}

export default function InlineField({
                                        label,
                                        taxonId,
                                        field,
                                        value,
                                        type = "text",
                                        options,
                                        render,
                                        onUpdated
                                    }: Props) {
    const {t} = useTranslation();
    const [draft, setDraft] = useState<string | boolean | number | null>(value ?? null);
    const [saving, setSaving] = useState(false);
    // Editing state - top-level hook (rules-of-hooks), used by the text/select branches
    const [editing, setEditing] = useState(false);


    async function save(newValue: string | boolean) {
        setSaving(true);

        try {
            const updated = await updateTaxonField(taxonId, field, newValue);
            setDraft(updated[FIELD_TO_PROPERTY[field]] as string | boolean | number | null);
            onUpdated(updated);
        } catch (e) {
            notifyApiError(e, t("common.inlineField.saveFailed"));
        } finally {
            setSaving(false);
        }
    }

    const EditIcon = ({onClick}: { onClick: () => void }) => (
        <i
            className="bi bi-pencil ms-2"
            aria-hidden="true"
            style={{cursor: "pointer"}}
            onClick={onClick}
            title={t("common.inlineField.edit")}
        />

    );

    let content: React.ReactNode;

    if (type === "boolean") {
        // checkbox je vždy viditelný
        content = (
            <Form.Check
                type="switch"
                checked={!!draft}
                disabled={saving}
                onChange={e => save(e.target.checked)}
            />
        );
    } else {
        // pro text a select zůstává edit-on-click
        if (!editing) {
            content = (
                <span className="d-inline-flex align-items-center">
        <EditIcon onClick={() => setEditing(true)}/>
          <span
              className="editable-value ms-1"
              style={{cursor: "pointer"}}
              onClick={() => setEditing(true)}
          >
            {render ? render(value ?? null) : value ||
                <span className="text-muted">{t("common.inlineField.add")}</span>}
          </span>
        </span>
            );
        } else if (type === "select") {
            content = (
                <Form.Select
                    size="sm"
                    autoFocus
                    value={(draft as string | number | undefined) ?? ""}
                    disabled={saving}
                    onChange={e => save(e.target.value)}
                    onBlur={() => setEditing(false)}
                    style={{maxWidth: "250px"}}
                >
                    {options?.map(o => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </Form.Select>
            );
        } else {
            content = (
                <Form.Control
                    size="sm"
                    autoFocus
                    value={(draft as string | null | undefined) || ""}
                    disabled={saving}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={() => save(draft as string | boolean)}
                    onKeyDown={e => e.key === "Enter" && save(draft as string | boolean)}
                    style={{maxWidth: "350px", display: "inline-block"}}
                />
            );
        }
    }

    return (
        <Row className="align-items-center mb-1">
            <Col sm={3} className="text-muted small">
                {label}
            </Col>
            <Col sm={9}>
                {content}
                {saving && <Spinner size="sm" className="ms-2"/>}
            </Col>
        </Row>
    );
}
