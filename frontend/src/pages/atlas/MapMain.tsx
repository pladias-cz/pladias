import {Container, Row, Col} from 'react-bootstrap';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';
import {useParams} from 'react-router-dom';
import {useEffect, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getTaxon} from '@/services/taxonApi';
import {notifyApiError} from '@/stores/notificationStore';
import {MapComponent} from '@/components/atlas/mapMain/MapComponent';
import {InfoPanel} from '@/components/atlas/mapMain/InfoPanel';

export default function MapMain() {
    const {t} = useTranslation();
    const {taxonId} = useParams<{ taxonId: string }>();

    usePageTitle(t('atlas.mapMain.title'));

    const id = useMemo(() => {
        const parsed = parseInt(taxonId ?? '', 10);
        return isNaN(parsed) ? null : parsed;
    }, [taxonId]);

    // taxon pro mapu i info panel – bez cache (sekce J), načtení při mountu
    const {data: taxon, error} = useQuery({
        queryKey: ['taxon', id],
        queryFn: () => getTaxon(id!),
        enabled: id !== null,
    });

    // chybu načtení ohlásíme notifikací jako dřív (mapa zůstane použitelná)
    useEffect(() => {
        if (error) {
            notifyApiError(error, t('atlas.taxonLoadFailed'));
        }
    }, [error, t]);

    return (
        <Container fluid className="px-0">
            <Row className="g-0" style={{height: 'calc(100vh - 56px)'}}>
                <Col md={12} lg={8} className="h-100">
                    <MapComponent taxonId={taxon?.id}/>
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
