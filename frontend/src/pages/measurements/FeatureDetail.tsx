import {Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {NavLink, useParams} from "react-router-dom";
import type {Feature} from "@/models/Feature.ts";
import {useEffect, useState, type FormEvent} from "react";
import {useTranslation} from "react-i18next";
import TraitTable from "@/components/measurement/TraitTable.tsx";
import FeatureDescription from "@/components/measurement/FeatureDescription.tsx";
import TraitUpload from "@/components/measurement/TraitUpload.tsx";
import type {Flash} from "@/models/Flash.ts";

export default function FeatureDetail() {
    const {t} = useTranslation();
    usePageTitle(t("trait.featureDetail.title"));
    const {featureId} = useParams<{ featureId: string }>();
    const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
    const [flash, setFlash] = useState<Flash | null>(null);
    const [submitting, setSubmitting] = useState(false);
    // po úspěšném importu je třeba znovu načíst tabulku datových řad
    const [traitsRefreshKey, setTraitsRefreshKey] = useState(0);

    useEffect(() => {
        const f = (window as any).__FLASH__;
        if (!f) return;

        if (f.success) {
            setFlash({type: "success", message: f.success});
        } else if (f.error) {
            setFlash({type: "danger", message: f.error});
        }
    }, []);

    async function loadFeature(id: number) {
        try {
            const res = await fetch(`/api/react/measurement/features/${id}`);
            const json = await res.json();
            setSelectedFeature(json.data);
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        if (!featureId) return;
        const id = parseInt(featureId, 10);
        if (!isNaN(id)) loadFeature(id);
    }, [featureId]);

    async function uploadTrait(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);
        const isImport = formData.get("operation") === "import";

        setSubmitting(true);
        setFlash(null);

        try {
            const res = await fetch("/api/react/measurement/trait", {
                method: "POST",
                body: formData
            });

            // při úspěchu vrací backend samotný JSON řetězec s hlášením, při chybě JsonResult
            const json = await res.json().catch(() => null);
            const message: string | null = typeof json === "string" ? json : json?.message ?? null;

            if (!res.ok) {
                setFlash({type: "danger", message: message || "Operace se nezdařila"});
                return;
            }

            setFlash({
                type: "success",
                message: message || (isImport ? "Datová řada byla importována" : "Soubor je validní")
            });

            if (isImport) {
                form.reset();
                setTraitsRefreshKey(key => key + 1);
            }
        } catch {
            setFlash({type: "danger", message: "Chyba komunikace se serverem"});
        } finally {
            setSubmitting(false);
        }
    }

    if (!selectedFeature) {
        return (
            <Row>
                <Col>
                    <h1>{t("trait.featureDetail.title")}</h1>
                    <p>{t("common.loading")}</p>
                </Col>
            </Row>
        );
    }

    return (
        <>
            <Row>
                <Col>
                    <h3>
                        <NavLink to="/measurements/data">{selectedFeature.section}</NavLink> → {selectedFeature.name}
                    </h3>
                    <TraitTable feature={selectedFeature} refreshKey={traitsRefreshKey}/>
                </Col>
            </Row>

            <Row>
                <Col>
                    {flash && (
                        /* hlášení z importu/validace obsahuje odkaz na sešit s vyznačenými chybnými řádky */
                        <div
                            className={`alert alert-${flash.type}`}
                            role="alert"
                            dangerouslySetInnerHTML={{__html: flash.message}}
                        />
                    )}
                    <form onSubmit={uploadTrait} className="form-horizontal">
                        <TraitUpload feature={selectedFeature} submitting={submitting}/>
                    </form>

                </Col>
                <Col>
                    <FeatureDescription feature={selectedFeature}/>
                </Col>
            </Row>
        </>
    );
}
