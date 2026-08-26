import {Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {NavLink, useParams} from "react-router-dom";
import type {Feature} from "@/models/Feature.ts";
import {useEffect, useState} from "react";
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
                    <TraitTable feature={selectedFeature}/>
                </Col>
            </Row>

            <Row>
                <Col>
                    {flash && (
                        <div className={`alert alert-${flash.type}`} role="alert">
                            {flash.message}
                        </div>
                    )}
                    <form method="post" action="/measurement/trait" encType="multipart/form-data"
                          className="form-horizontal">
                        <TraitUpload feature={selectedFeature}/>
                    </form>

                </Col>
                <Col>
                    <FeatureDescription feature={selectedFeature}/>
                </Col>
            </Row>
        </>
    );
}
