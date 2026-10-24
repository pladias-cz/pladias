import {Container, Row, Col} from 'react-bootstrap';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';
import {useParams} from 'react-router-dom';
import {useEffect, useState, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getTaxon} from '@/services/taxonApi';
import {notifyApiError} from '@/stores/notificationStore';
import {MapComponent} from '@/components/atlas/mapPreview/MapComponent';
import {InfoPanel} from '@/components/atlas/mapPreview/InfoPanel';

export type MapPreviewType = 1 | 2 | 3 | 4;

export default function MapPreview() {
    const {t} = useTranslation();
    const {taxonId: taxonIdParam, type} = useParams<{ taxonId: string; type: string }>();
    const [mapType, setMapType] = useState<MapPreviewType>(1);

    usePageTitle(t('atlas.mapPreview.title'));

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

    // taxon jen pro zobrazení názvu v panelu – bez cache (sekce J), načtení při mountu
    const {data: taxon, error} = useQuery({
        queryKey: ['taxon', taxonId],
        queryFn: () => getTaxon(taxonId!),
        enabled: taxonId !== undefined,
    });

    // chybu načtení ohlásíme notifikací jako dřív (náhled zůstane použitelný)
    useEffect(() => {
        if (error) {
            notifyApiError(error, t('atlas.taxonLoadFailed'));
        }
    }, [error, t]);

    return (
        <Container fluid className="px-0">
            <Row className="g-0" style={{height: 'calc(100vh - 56px)'}}>
                <Col md={12} lg={8} className="h-100">
                    <MapComponent type={mapType} taxonId={taxonId}/>
                </Col>
                <Col lg={4} className="h-100 overflow-hidden">
                    <div className="h-100 p-3">
                        <InfoPanel type={mapType} taxonId={taxonId} taxonName={taxon?.nameHtml}/>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}
