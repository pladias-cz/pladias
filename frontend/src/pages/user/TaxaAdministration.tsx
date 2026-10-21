import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {Alert, Col, Form, Row, Spinner} from "react-bootstrap";
import {useQuery} from "@tanstack/react-query";
import {usePageTitle} from "@/hooks/usePageTitle";
import {createTaxaAllProvider} from '@/components/autocomplete/TaxaAllProvider';
import {Autocomplete} from '@/components/autocomplete/Autocomplete';
import TaxonDetail from "@/components/taxonAdmin/TaxonDetail";
import TaxonEditCard from "@/components/taxonAdmin/TaxonEditCard";
import ChildrenOrderingCard from "@/components/taxonAdmin/ChildrenOrderingCard";
import MoveTaxonCard from "@/components/taxonAdmin/MoveTaxonCard";
import NewTaxonCard from "@/components/taxonAdmin/NewTaxonCard";
import {type Taxon} from '@/models/Taxon';
import {type TaxonId} from '@/models/TaxonId';
import TaxonSynonyms from "@/components/taxonAdmin/TaxonSynonyms";
import {getTaxon} from "@/services/taxonApi";
import {apiErrorMessage} from "@/services/apiClient";
import { useTranslation } from 'react-i18next';

export default function TaxaAdministration() {
    const { t } = useTranslation();
    usePageTitle(t("taxon.administration.pageTitle"));

    const {taxonId} = useParams<{ taxonId: string }>(); // ← parametr z URL
    const [selectedTaxonId, setSelectedTaxonId] = useState<number | null>(null);
    const [taxonVersion, setTaxonVersion] = useState(0);

    // --- handler pro autocomplete ---
    function handleAutocompleteSelect(reduced: TaxonId | null) {
        setSelectedTaxonId(reduced?.id ?? null);
    }

    // --- callback pro pesimistický reload ---
    function refreshSelectedTaxon(updated: Taxon) {
        // verze invaliduje autocomplete, karty dětí i query samotného taxonu
        setSelectedTaxonId(updated.id);
        setTaxonVersion(v => v + 1);
    }

    // --- načtení taxonu z URL při mountu i při změně parametru ---
    useEffect(() => {
        const id = parseInt(taxonId ?? "", 10);
        if (!isNaN(id)) {
            setSelectedTaxonId(id);
        }
    }, [taxonId]);

    // --- plný taxon podle id (bez cache, sekce J) ---
    const {data: selectedTaxon, isPending, error} = useQuery({
        queryKey: ["taxonAdminTaxon", selectedTaxonId, taxonVersion],
        queryFn: () => getTaxon(selectedTaxonId!),
        enabled: selectedTaxonId !== null,
    });
    const loading = selectedTaxonId !== null && isPending;
    const loadError = error ? apiErrorMessage(error, t("taxon.administration.loadTaxonError")) : null;

    return (
        <>
            <Row>
                <Col md={{span: 4, offset: 4}}>
                    <Form>
                        <Form.Group as={Row} className="mb-3" controlId="formSelectTaxon">
                            <Form.Label column sm={5}>
                                {t("taxon.administration.selectTaxonLabel")}
                            </Form.Label>
                            <Col sm={7}>
                                <Autocomplete<TaxonId>
                                    provider={createTaxaAllProvider(t("common.autocomplete.allTaxaPlaceholder"))}
                                    cacheKey={taxonVersion}
                                    onSelect={handleAutocompleteSelect}
                                    autoFocus={true}
                                />
                            </Col>
                        </Form.Group>
                    </Form>
                </Col>
            </Row>

            {loadError && (
                <Row>
                    <Col md={{span: 4, offset: 4}}>
                        <Alert variant="danger">{loadError}</Alert>
                    </Col>
                </Row>
            )}

            {/* --- Detail vybraného taxonu --- */}
            <Row>
                <Col>
                    {loading && <Spinner animation="border" size="sm"/>}
                    {!loading && selectedTaxon && (
                        <TaxonDetail
                            cacheKey={taxonVersion}
                            taxon={selectedTaxon}/>
                    )}
                </Col>
            </Row>

            {/* --- Editace / podkomponenty --- */}
            {selectedTaxon && !loading && (
                <>
                <Row className="mt-3">
                    <Col md={4}>
                        <TaxonEditCard
                            taxon={selectedTaxon}
                            onTaxonChange={refreshSelectedTaxon} // reload po úpravě
                        />
                    </Col>

                    <Col md={4}>
                        <div className="mb-3">
                        <MoveTaxonCard
                            taxon={selectedTaxon}
                            onMoved={refreshSelectedTaxon}
                        />
                        </div>
                        <NewTaxonCard
                            taxon={selectedTaxon}
                        />
                    </Col>

                    <Col md={4}>
                        <ChildrenOrderingCard
                            taxon={selectedTaxon}
                        />
                    </Col>
                </Row>
                    <Row className="mt-3">
                        <TaxonSynonyms
                            cacheKey={taxonVersion}
                            taxon={selectedTaxon}
                        />
                    </Row>
                </>
            )}
        </>
    );
}
