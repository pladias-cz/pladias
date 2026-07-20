import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {Col, Form, Row, Spinner} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {createTaxaAllProvider } from '@/components/autocomplete/TaxaAllProvider';
import {Autocomplete} from '@/components/autocomplete/Autocomplete';
import TaxonDetail from "@/components/taxonAdmin/TaxonDetail";
import TaxonEditCard from "@/components/taxonAdmin/TaxonEditCard.tsx";
import ChildrenOrderingCard from "@/components/taxonAdmin/ChildrenOrderingCard";
import MoveTaxonCard from "@/components/taxonAdmin/MoveTaxonCard";
import NewTaxonCard from "@/components/taxonAdmin/NewTaxonCard";
import {type Taxon} from '@/models/Taxon';
import {type TaxonId} from '@/models/TaxonId';
import TaxonSynonyms from "@/components/taxonAdmin/TaxonSynonyms.tsx";
import { useTranslation } from 'react-i18next';

export default function TaxaAdministration() {
    const { t } = useTranslation();
    usePageTitle(t("taxon.administration.pageTitle"));

    const {taxonId} = useParams<{ taxonId: string }>(); // ← parametr z URL
    const [selectedTaxon, setSelectedTaxon] = useState<Taxon | null>(null);
    const [loading, setLoading] = useState(false);
    const [taxonVersion, setTaxonVersion] = useState(0);


    // --- načtení plného taxonu podle id ---
    async function loadTaxon(id: number) {
        setLoading(true);
        try {
            const res = await fetch(`/api/react/taxon/${id}`);
            if (!res.ok) throw new Error(t("taxon.administration.loadTaxonError"));

            const json = await res.json();
            if (!json.success) throw new Error(t("taxon.administration.apiError"));

            const fullTaxon: Taxon = json.data;
            setSelectedTaxon(fullTaxon);

        } catch (e: any) {
            console.error(e);
            setSelectedTaxon(null);
        } finally {
            setLoading(false);
        }
    }


    // --- handler pro autocomplete ---
    function handleAutocompleteSelect(reduced: TaxonId | null) {
        if (reduced) {
            loadTaxon(reduced.id); // načteme plný Taxon
        } else {
            setSelectedTaxon(null);
        }
    }

    // --- callback pro pesimistický reload ---
    function refreshSelectedTaxon(updated: Taxon) {
        setSelectedTaxon(updated);           // aktualizujeme stav
        setTaxonVersion(v => v + 1);   // <<< invalidace cache
        loadTaxon(updated.id);               // znovu načteme z backendu
    }

    // --- efekt pro načtení taxonu z URL při mountu ---
    useEffect(() => {
        if (taxonId) {
            const id = parseInt(taxonId, 10);
            if (!isNaN(id)) loadTaxon(id);
        }
    }, [taxonId]);

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
                            cacheKey={taxonVersion}
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
