import {Col, Row} from 'react-bootstrap';
import {usePageTitle} from '@/hooks/usePageTitle';
import {NavLink, useParams} from 'react-router-dom';
import {useEffect, useState, type FormEvent} from 'react';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import TraitTable from '@/components/measurement/TraitTable';
import FeatureDescription from '@/components/measurement/FeatureDescription';
import TraitUpload from '@/components/measurement/TraitUpload';
import {getFeature, importTrait} from '@/services/traitApi';
import {ApiError, apiErrorMessage} from '@/services/apiClient';
import {useNotifications} from '@/stores/notificationStore';

export default function FeatureDetail() {
    const {t} = useTranslation();
    usePageTitle(t('trait.featureDetail.title'));
    const {featureId} = useParams<{ featureId: string }>();
    const [submitting, setSubmitting] = useState(false);
    // po úspěšném importu je třeba znovu načíst tabulku datových řad
    const [traitsRefreshKey, setTraitsRefreshKey] = useState(0);
    const {push} = useNotifications();

    // vlastnost k zobrazení – bez cache (sekce J), načtení při mountu
    const {data: selectedFeature} = useQuery({
        queryKey: ['feature', featureId],
        queryFn: () => getFeature(parseInt(featureId!, 10)),
        enabled: featureId !== undefined,
    });

    useEffect(() => {
        // hlášku po přesměrování z legacy stránky injectuje backend do data-flash-*
        // atributů #react-app (app/views/react/index.scala.html) – gotchas.md;
        // dříve inline script window.__FLASH__, nahrazeno kvůli CSP script-src 'self'
        const flash = document.getElementById('react-app')?.dataset;
        const success = flash?.flashSuccess;
        const error = flash?.flashError;

        // obsah může nést HTML s odkazem na sešit s chybami importu
        if (success) {
            push({type: 'success', html: success});
        } else if (error) {
            push({type: 'danger', html: error});
        }
    }, [push]);

    async function uploadTrait(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);
        const isImport = formData.get('operation') === 'import';

        setSubmitting(true);

        try {
            const message = await importTrait(formData);

            push({
                type: 'success',
                html: message || (isImport ? t('trait.upload.imported') : t('trait.upload.validated'))
            });

            if (isImport) {
                form.reset();
                setTraitsRefreshKey(key => key + 1);
            }
        } catch (e) {
            // hláška z backendu může nést HTML s odkazem na chybový sešit,
            // proto jde do notifikace jako html; již ohlášené chyby (síť, 403)
            // notifyApiError vylučuje, abychom je nezobrazili dvakrát
            if (e instanceof ApiError && e.notified) return;
            push({type: 'danger', html: apiErrorMessage(e, t('trait.upload.failed'))});
        } finally {
            setSubmitting(false);
        }
    }

    if (!selectedFeature) {
        return (
            <Row>
                <Col>
                    <h1>{t('trait.featureDetail.title')}</h1>
                    <p>{t('common.loading')}</p>
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
                            {t('trait.featureDetail.uploadNotAllowed')}
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
