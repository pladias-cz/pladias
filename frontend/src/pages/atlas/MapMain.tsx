import { Container, Row, Col } from "react-bootstrap";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { TaxonId } from "@/models/TaxonId";
import {getTaxon} from "@/services/taxonApi";
import {notifyApiError} from "@/stores/notificationStore";
import { MapComponent } from "@/components/atlas/mapMain/MapComponent";
import { InfoPanel } from "@/components/atlas/mapMain/InfoPanel";

export default function MapMain() {
    const { t } = useTranslation();
    const { taxonId } = useParams<{ taxonId: string }>();
    const [taxon, setTaxon] = useState<TaxonId | null>(null);

    usePageTitle(t("atlas.mapMain.title"));

    useEffect(() => {
        if (taxonId) {
            const id = parseInt(taxonId, 10);
            if (!isNaN(id)) {
                getTaxon(id)
                    .then(taxon => {
                        setTaxon({id: taxon.id, nameLat: taxon.nameLat, nameHtml: taxon.nameHtml});
                    })
                    .catch(e => notifyApiError(e, t("atlas.taxonLoadFailed")));
            }
        }
    }, [taxonId, t]);

    return (
        <Container fluid className="px-0">
            <Row className="g-0" style={{ height: 'calc(100vh - 56px)' }}>
                <Col md={12} lg={8} className="h-100">
                    <MapComponent taxonId={taxon?.id} />
                </Col>
                <Col lg={4} className="h-100 overflow-hidden">
                    <div className="h-100 p-3">
                        <InfoPanel 
                            taxonName={taxon?.nameHtml} 
                            taxonId={taxon?.id} 
                        />
                    </div>
                </Col>
            </Row>
        </Container>
    );
}
