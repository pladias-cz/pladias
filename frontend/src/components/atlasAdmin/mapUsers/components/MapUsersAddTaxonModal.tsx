/**
 * Add Taxon Modal for MapUsers
 */

import {Modal, Button, Form, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {SupervisedTaxon} from '../types';

interface MapUsersAddTaxonModalProps {
    show: boolean;
    taxa: SupervisedTaxon[];
    taxaLoading: boolean;
    submitting: boolean;
    selectedTaxon: SupervisedTaxon | null;
    taxonSearchTerm: string;
    taxonInputRef: React.RefObject<HTMLInputElement | null>;
    onSearchChange: (term: string) => void;
    onSelectTaxon: (taxon: SupervisedTaxon) => void;
    onClose: () => void;
}

export function MapUsersAddTaxonModal({
    show,
    taxa,
    taxaLoading,
    submitting,
    selectedTaxon,
    taxonSearchTerm,
    taxonInputRef,
    onSearchChange,
    onSelectTaxon,
    onClose,
}: MapUsersAddTaxonModalProps) {
    const {t} = useTranslation();

    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>{t("user.usersAdministration.addTaxon")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group controlId="taxonSearch">
                    <Form.Label>{t("user.usersAdministration.searchTaxon")}</Form.Label>
                    <Form.Control
                        ref={taxonInputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        placeholder={t("user.usersAdministration.enterTaxonName")}
                        value={taxonSearchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        disabled={taxaLoading || submitting || selectedTaxon !== null}
                        autoComplete="off"
                    />
                    {taxaLoading && (
                        <div className="mt-2">
                            <Spinner animation="border" size="sm" /> {t("common.loading")}
                        </div>
                    )}
                    {taxa.length > 0 && !selectedTaxon && (
                        <div 
                            className="mt-2" 
                            style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px'}}
                        >
                            {taxa.map(taxon => (
                                <div
                                    key={taxon.id}
                                    className="p-2"
                                    style={{cursor: 'pointer', borderBottom: '1px solid #dee2e6'}}
                                    onClick={() => onSelectTaxon(taxon)}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                                >
                                    {taxon.nameLat}
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedTaxon && (
                        <div className="mt-3">
                            <div className="d-flex align-items-center gap-2">
                                <Spinner animation="border" size="sm" />
                                <span>{t("user.usersAdministration.processingTaxon", {taxon: selectedTaxon.nameLat})}</span>
                            </div>
                            <div className="mt-2 text-muted small">
                                {t("user.usersAdministration.processingInfo")}
                            </div>
                        </div>
                    )}
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button 
                    variant="secondary" 
                    onClick={onClose}
                    disabled={submitting}
                >
                    {submitting ? t("user.usersAdministration.waitToClose") : t("cancel")}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
