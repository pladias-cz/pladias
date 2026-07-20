import { Container, Row, Col } from "react-bootstrap";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import type { TaxonId } from "@/models/TaxonId";
import { MapComponent } from "@/components/atlas/mapPreview/MapComponent";
import { InfoPanel } from "@/components/atlas/mapPreview/InfoPanel";

export type MapPreviewType = 1 | 2 | 3 | 4;

export default function MapPreview() {
    const { t } = useTranslation();
    const { taxonId: taxonIdParam, type } = useParams<{ taxonId: string; type: string }>();
    const [taxon, setTaxon] = useState<TaxonId | null>(null);
    const [mapType, setMapType] = useState<MapPreviewType>(1);

    usePageTitle(t("atlas.mapPreview.title"));

    // Parse taxonId from URL param - this is available immediately
    const taxonId = useMemo(() => {
        if (!taxonIdParam) return undefined;
        const id = parseInt(taxonIdParam, 10);
        return isNaN(id) ? undefined : id;
    }, [taxonIdParam]);

    useEffect(() => {
        if (type) {
            const mapTypeValue = parseInt(type, 10);
            if ([1, 2, 3, 4].includes(mapTypeValue)) {
                setMapType(mapTypeValue as MapPreviewType);
            }
        }
    }, [type]);

    // Fetch additional taxon data asynchronously (for display purposes only)
    useEffect(() => {
        if (taxonId) {
            fetch(`/api/react/taxon/${taxonId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Taxon not found');
                    return res.json();
                })
                .then(result => {
                    if (result.data) {
                        setTaxon({
                            id: result.data.id,
                            nameLat: result.data.nameLat,
                            nameHtml: result.data.nameHtml
                        });
                    }
                })
                .catch(() => {});
        }
    }, [taxonId]);

    return (
        <Container fluid className="px-0">
            <Row className="g-0" style={{ height: 'calc(100vh - 56px)' }}>
                <Col md={12} lg={8} className="h-100">
                    <MapComponent type={mapType} taxonId={taxonId} />
                </Col>
                <Col lg={4} className="h-100 overflow-hidden">
                    <div className="h-100 p-3">
                        <InfoPanel type={mapType} taxonId={taxonId} taxonName={taxon?.nameHtml} />
                    </div>
                </Col>
            </Row>
        </Container>
    );
}
