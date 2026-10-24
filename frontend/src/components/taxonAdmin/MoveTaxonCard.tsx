import {Button, Card, Form, Spinner} from 'react-bootstrap';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {type Taxon} from '@/models/Taxon';
import {type TaxonId} from '@/models/TaxonId';
import TaxaPossibleParentAutocomplete from '@/components/autocomplete/TaxaPossibleParentAutocomplete';
import {useConfirm} from '@/hooks/useConfirm';
import {useTranslation} from 'react-i18next';
import {deleteTaxon, moveTaxon} from '@/services/taxonApi';
import {notifyApiError} from '@/stores/notificationStore';

interface Props {
    taxon: Taxon;
    onMoved: (updated: Taxon) => void;
}

export default function MoveTaxonCard({taxon, onMoved}: Props) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {confirm, dialog} = useConfirm();

    const [selectedParentId, setSelectedParentId] = useState<TaxonId | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleMove() {
        if (selectedParentId == null) return;

        setIsMoving(true);

        try {
            onMoved(await moveTaxon(taxon.id, selectedParentId.id));
            setSelectedParentId(null);
        } catch (e) {
            notifyApiError(e, t('taxon.move.moveFailed'));
        } finally {
            setIsMoving(false);
        }
    }

    async function handleDelete() {
        if (!(await confirm({
            message: t('taxon.move.deleteConfirm', {name: taxon.nameLat}),
            confirmLabel: t('common.delete'),
        }))) {
            return;
        }

        setIsDeleting(true);

        try {
            await deleteTaxon(taxon.id);
            navigate(`/user/taxaAdministration/${taxon.parentId}`);
        } catch (e) {
            notifyApiError(e, t('taxon.move.deleteFailed'));
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Card>
            {dialog}
            <Card.Header>{t('taxon.move.title', {name: taxon.nameLat})}</Card.Header>
            <Card.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>{t('taxon.move.newParent')}</Form.Label>
                        <TaxaPossibleParentAutocomplete
                            taxonId={taxon.id}
                            onSelect={setSelectedParentId}
                        />
                    </Form.Group>

                    <Button
                        onClick={handleMove}
                        disabled={selectedParentId == null || isMoving}
                    >
                        {isMoving ? (
                            <>
                                <Spinner size="sm" className="me-2"/>
                                {t('taxon.move.moving')}
                            </>
                        ) : (
                            t('taxon.move.moveButton')
                        )}
                    </Button>
                </Form>

                <hr/>

                <p>
                    {t('taxon.move.deleteDescription')}
                </p>

                <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <>
                            <Spinner size="sm" className="me-2"/>
                            {t('taxon.move.deleting')}
                        </>
                    ) : (
                        t('taxon.move.deleteButton')
                    )}
                </Button>
            </Card.Body>
        </Card>
    );
}
