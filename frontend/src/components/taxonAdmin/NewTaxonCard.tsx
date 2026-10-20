import { Button, Card, Form, Spinner } from "react-bootstrap";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Taxon } from "@/models/Taxon";
import { type Option } from "@/models/Option";
import { useTranslation } from "react-i18next";
import {createTaxon, getTaxonRanks} from "@/services/taxonApi";
import {notifyApiError} from "@/stores/notificationStore";

interface Props {
    taxon: Taxon;
}
export default function NewTaxonCard({ taxon }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [nameLat, setNameLat] = useState("");
    const [rankId, setRankId] = useState<number>(28);
    const [rankOptions, setRankOptions] = useState<Option[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        getTaxonRanks()
            .then(ranks =>
                ranks.map(r => ({
                    value: r.id,
                    label: `${r.nameEng} – ${r.nameCz}`,
                }))
            )
            .then(setRankOptions)
            .catch(e =>
                notifyApiError(e, t("taxon.create.loadRanksError"))
            );
    }, [t]);

    const handleAdd = async () => {
        if (!nameLat.trim()) {
            setError(t("taxon.create.latinNameRequired"));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const addedTaxon = await createTaxon({
                nameLat,
                rankId,
                parentId: taxon.id,
            });

            navigate(`/user/taxaAdministration/${addedTaxon.id}`);
        } catch (e) {
            notifyApiError(e, t("taxon.create.createError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <Card.Header>
                {t("taxon.create.title", { name: taxon.nameLat })}
            </Card.Header>

            <Card.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>{t("taxon.create.latinName")}</Form.Label>
                        <Form.Control
                            value={nameLat}
                            onChange={e => setNameLat(e.target.value)}
                            placeholder={t("taxon.create.latinNamePlaceholder")}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t("taxon.create.rank")}</Form.Label>
                        <Form.Select
                            value={rankId}
                            onChange={e => setRankId(Number(e.target.value))}
                        >
                            {rankOptions.map(o => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    {error && (
                        <div className="text-danger mb-3">
                            {error}
                        </div>
                    )}

                    <Button
                        variant="success"
                        disabled={loading}
                        onClick={handleAdd}
                    >
                        {loading && (
                            <Spinner
                                size="sm"
                                className="me-2"
                                animation="border"
                            />
                        )}
                        {t("taxon.create.createButton")}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
}
