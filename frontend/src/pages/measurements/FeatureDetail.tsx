import {Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {NavLink, useParams} from "react-router-dom";
import type {Feature} from "@/models/Feature";
import {useEffect, useState, type FormEvent} from "react";
import {useTranslation} from "react-i18next";
import TraitTable from "@/components/measurement/TraitTable";
import FeatureDescription from "@/components/measurement/FeatureDescription";
import TraitUpload from "@/components/measurement/TraitUpload";
import {useNotifications} from "@/stores/notificationStore";

export default function FeatureDetail() {
    const {t} = useTranslation();
    usePageTitle(t("trait.featureDetail.title"));
    const {featureId} = useParams<{ featureId: string }>();
    const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
    const [submitting, setSubmitting] = useState(false);
    // po úspěšném importu je třeba znovu načíst tabulku datových řad
    const [traitsRefreshKey, setTraitsRefreshKey] = useState(0);
    const {push} = useNotifications();

    useEffect(() => {
        // hlášku po přesměrování z legacy stránky injectuje backend do
        // window.__FLASH__ (app/views/react/index.scala.html) – gotchas.md
        const f = (window as any).__FLASH__;
        if (!f) return;

        // obsah může nést HTML s odkazem na sešit s chybami importu
        if (f.success) {
            push({type: "success", html: f.success});
        } else if (f.error) {
            push({type: "danger", html: f.error});
        }
    }, [push]);

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

        try {
            const res = await fetch("/api/react/measurement/trait", {
                method: "POST",
                body: formData
            });

            // při úspěchu vrací backend samotný JSON řetězec s hlášením, při chybě JsonResult
            const json = await res.json().catch(() => null);
            const message: string | null = typeof json === "string" ? json : json?.message ?? null;

            if (!res.ok) {
                push({type: "danger", html: message || "Operace se nezdařila"});
                return;
            }

            push({
                type: "success",
                html: message || (isImport ? "Datová řada byla importována" : "Soubor je validní")
            });

            if (isImport) {
                form.reset();
                setTraitsRefreshKey(key => key + 1);
            }
        } catch {
            push({type: "danger", message: "Chyba komunikace se serverem"});
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
                    {/* importovat/smazat datovou řadu smí jen traitAdmin nebo admin vlastnosti (BE: user.supervises(feature)) */}
                    {selectedFeature.canAdminister ? (
                        <form onSubmit={uploadTrait} className="form-horizontal">
                            <TraitUpload feature={selectedFeature} submitting={submitting}/>
                        </form>
                    ) : (
                        <div className="alert alert-info" role="alert">
                            {t("trait.featureDetail.uploadNotAllowed")}
                        </div>
                    )}

                </Col>
                <Col>
                    <FeatureDescription feature={selectedFeature}/>
                </Col>
            </Row>
        </>
    );
}
