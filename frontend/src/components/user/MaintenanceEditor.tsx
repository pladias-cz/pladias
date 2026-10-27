import {useEffect, useState, type SyntheticEvent} from 'react';
import {useTranslation} from 'react-i18next';
import {Alert, Badge, Button, Form} from 'react-bootstrap';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {
    createMaintenanceMessage,
    deleteMaintenanceMessage,
    getMaintenanceMessages,
} from '@/services/maintenanceApi';
import type {InstanceMessageType} from '@/models/InstanceMessage';
import {notifyApiError, useNotifications} from '@/stores/notificationStore';
import {useConfirm} from '@/hooks/useConfirm';

const TYPES: readonly InstanceMessageType[] = ['info', 'warning', 'danger', 'success'];

/** Délková kontrola sloupce message (varchar(255)) – shodná s backendem. */
const MAX_TEXT_LENGTH = 255;

/**
 * MaintenanceEditor - sysAdmin správa heartbeat zpráv (tabulka public.maintenance,
 * endpointy /api/react/maintenance...). Záměrně bez editace stávajících záznamů:
 * zpráva se nahrazuje smazáním starého řádku a přidáním nového.
 * Heartbeat i login stránka zobrazují jen první řádek tabulky – proto je první
 * položka seznamu označena jako právě zobrazovaná.
 */
export default function MaintenanceEditor() {
    const {t} = useTranslation();
    const {push} = useNotifications();
    const {confirm, dialog} = useConfirm();
    const queryClient = useQueryClient();
    const [type, setType] = useState<InstanceMessageType>('info');
    const [text, setText] = useState('');
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // zprávy – bez cache (sekce J); po mutaci se seznam invaliduje a načte znovu
    const {data: messages, isPending: loading, error: loadError} = useQuery({
        queryKey: ['maintenanceMessages'],
        queryFn: getMaintenanceMessages,
    });

    // chyba načtení → globální notifikace (Toast vpravo dole, sekce F)
    useEffect(() => {
        if (loadError) {
            notifyApiError(loadError, t('user.maintenance.error'));
        }
    }, [loadError, t]);

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCreating(true);

        try {
            await createMaintenanceMessage({type, text: text.trim()});
            setText('');
            await queryClient.invalidateQueries({queryKey: ['maintenanceMessages']});

            push({type: 'success', message: t('user.maintenance.added')});
        } catch (err) {
            notifyApiError(err, t('user.maintenance.error'));
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!(await confirm({message: t('user.maintenance.deleteConfirm')}))) {
            return;
        }
        setDeletingId(id);

        try {
            await deleteMaintenanceMessage(id);
            await queryClient.invalidateQueries({queryKey: ['maintenanceMessages']});

            push({type: 'success', message: t('user.maintenance.deleted')});
        } catch (err) {
            notifyApiError(err, t('user.maintenance.error'));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return <p>{t('user.maintenance.loading')}</p>;
    }

    return (
        <>
            {dialog}

            <h3 className="h5">{t('user.maintenance.listTitle')}</h3>
            {messages?.length === 0 && (
                <p className="text-muted">{t('user.maintenance.empty')}</p>
            )}
            {messages?.map((message, index) => (
                <Alert key={message.id} variant={message.type}>
                    <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                            {index === 0 && (
                                <Badge bg="secondary" text="dark" className="mb-1">
                                    {t('user.maintenance.displayed')}
                                </Badge>
                            )}
                            <div>{message.text}</div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline-danger"
                            disabled={deletingId !== null}
                            onClick={() => handleDelete(message.id)}
                        >
                            {deletingId === message.id ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status"
                                          aria-hidden="true"/>
                                    {t('user.maintenance.deleting')}
                                </>
                            ) : t('user.maintenance.delete')}
                        </Button>
                    </div>
                </Alert>
            ))}

            <h3 className="h5 mt-4">{t('user.maintenance.addTitle')}</h3>
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="maintenanceType">
                    <Form.Label>{t('user.maintenance.type')}</Form.Label>
                    <Form.Select
                        value={type}
                        onChange={(event) => setType(event.target.value as InstanceMessageType)}
                        className="w-auto"
                    >
                        {TYPES.map((value) => (
                            <option key={value} value={value}>{t(`user.maintenance.type_${value}`)}</option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="maintenanceText">
                    <Form.Label>{t('user.maintenance.text')}</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        maxLength={MAX_TEXT_LENGTH}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                    />
                    <Form.Text>{t('user.maintenance.maxLength', {max: MAX_TEXT_LENGTH})}</Form.Text>
                </Form.Group>

                <Button type="submit" variant="primary" disabled={creating || text.trim() === ''}>
                    {creating ? t('user.maintenance.adding') : t('user.maintenance.add')}
                </Button>
            </Form>
        </>
    );
}
