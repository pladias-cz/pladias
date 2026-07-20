import ReactDOM from "react-dom/client";
import "./src/i18n/i18n";
import TaxonEditCard from "./src/components/taxonAdmin/TaxonEditCard";
import {type Taxon} from "./src/models/Taxon";
import {Col, Container, Row} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import 'react-bootstrap-typeahead/css/Typeahead.css';

const root = document.getElementById("react-app");

// For development purposes, we'll render the TaxonEditCard component with mock data
if (root) {
    // Mock taxon data for development
    const mockTaxon: Taxon = {
        parentId: 0,
        rank: 0,
        suppressed: false,
        id: 1,
        nameLat: "Acer pseudoplatanus",
        nameHtml: "<i>Acer pseudoplatanus</i>"
    };

    // Mock onTaxonChange function for development
    const handleTaxonChange = (updated: Taxon) => {
        console.log("Taxon updated:", updated);
    };

    ReactDOM.createRoot(root).render(
        <Container>
            <Row>
                <Col md={{span: 4, offset: 3}}>
                    <TaxonEditCard taxon={mockTaxon} onTaxonChange={handleTaxonChange} cacheKey={0}/>
                </Col>
            </Row>
        </Container>
    );
}