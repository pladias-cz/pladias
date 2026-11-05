import {useCallback, useMemo, useState} from 'react';
import {Card, Spinner, Button, Form, Table} from 'react-bootstrap';
import {
    flexRender,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import {type ColumnDef} from '@tanstack/react-table';
import {useQuery, useQueryClient} from '@tanstack/react-query';

import {type Taxon} from '@/models/Taxon';
import type {TaxonSynonym} from '@/models/TaxonSynonym';
import {useTranslation} from 'react-i18next';
import {useConfirm} from '@/hooks/useConfirm';
import {
    deleteTaxonSynonym,
    getTaxonPublications,
    getTaxonSynonyms,
    saveTaxonSynonym,
} from '@/services/taxonApi';
import {notifyApiError, useNotifications} from '@/stores/notificationStore';
import {useCatalogQuery} from '@/query/useCatalogQuery';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';

interface Props {
    taxon: Taxon;
    cacheKey: number;
}

// v9: features se deklarují explicitně; tato tabulka žádné extra nepotřebuje
// (sort/filtr/paginaci řeší editační formuláře přímo, core row model je vždy k dispozici)
const features = tableFeatures({});

export default function TaxonSynonyms({taxon, cacheKey}: Props) {
    const {t} = useTranslation();
    const {confirm, dialog} = useConfirm();
    const {push} = useNotifications();
    const queryClient = useQueryClient();

    const [savingId, setSavingId] = useState<number | null>(null);
    const [successId, setSuccessId] = useState<number | null>(null);

    /* =========================
       LOAD DATA
    ========================= */

    // synonyma – bez cache (sekce J); cacheKey (verze taxonu) v klíči zajistí
    // čerstvá data po mutacích taxonu
    const synonymsQueryKey = useMemo(
        () => ['taxonSynonyms', taxon.id, cacheKey],
        [taxon.id, cacheKey],
    );
    const {data: synonyms = [], isPending: loading, error} = useQuery({
        queryKey: synonymsQueryKey,
        queryFn: () => getTaxonSynonyms(taxon.id),
    });
    useQueryErrorNotify(error, t('taxon.synonyms.loadFailed'));

    // publikace – číselník bez cache (sekce J)
    const publications = useCatalogQuery(['taxonPublications'], getTaxonPublications);

    /** editační zápisy jdou přímo do query cache (optimistická vrstva) */
    const setSynonyms = useCallback(
        (updater: (prev: TaxonSynonym[]) => TaxonSynonym[]) => {
            queryClient.setQueryData<TaxonSynonym[]>(
                synonymsQueryKey,
                prev => updater(prev ?? []),
            );
        },
        [queryClient, synonymsQueryKey],
    );

    /* =========================
       HANDLERS
    ========================= */

    const updateField = useCallback((id: number, field: keyof TaxonSynonym, value: string | boolean | number | null) => {
        setSynonyms(prev =>
            prev.map(s => s.id === id ? {...s, [field]: value} : s)
        );
    }, [setSynonyms]);

    const addRow = () => {
        setSynonyms(prev => [
            {
                id: -Date.now(), // temp ID
                taxonId: taxon.id,
                name: '',
                nameHtml: '',
                suffix: '',
                autocomplete: false,
                publication: publications[0]?.id ?? 0,
            },
            ...prev
        ]);
    };

    const saveRow = useCallback(async (syn: TaxonSynonym) => {
        setSavingId(syn.id);
        setSuccessId(null);

        try {
            await saveTaxonSynonym(syn);

            push({type: 'success', message: t('taxon.synonyms.saved')});

            // highlight uloženého řádku – po 2s schovej
            setSuccessId(syn.id);
            setTimeout(() => setSuccessId(null), 2000);

        } catch (e) {
            notifyApiError(e, t('taxon.synonyms.saveError'));
        } finally {
            setSavingId(null);
        }
    }, [t, push]);

    const deleteRow = useCallback(async (id: number) => {
        if (!(await confirm({
            message: t('taxon.synonyms.deleteConfirm'),
            confirmLabel: t('common.delete'),
        }))) return;

        try {
            await deleteTaxonSynonym(id);
            setSynonyms(prev => prev.filter(s => s.id !== id));

        } catch (e) {
            notifyApiError(e, t('taxon.synonyms.deleteError'));
        }
    }, [confirm, setSynonyms, t]);

    /* =========================
       COLUMNS
    ========================= */

    const columns = useMemo<ColumnDef<typeof features, TaxonSynonym>[]>(() => [
        {
            header: t('taxon.synonyms.nameLatin'),
            accessorKey: 'name',
            cell: ({row}) => (
                <Form.Control
                    value={row.original.name}
                    onChange={e => updateField(row.original.id, 'name', e.target.value)}
                />
            )
        },
        {
            header: t('taxon.synonyms.nameHtml'),
            accessorKey: 'nameHtml',
            cell: ({row}) => (
                <Form.Control
                    value={row.original.nameHtml}
                    onChange={e => updateField(row.original.id, 'nameHtml', e.target.value)}
                />
            )
        },
        {
            header: t('taxon.synonyms.suffix'),
            accessorKey: 'suffix',
            cell: ({row}) => (
                <Form.Control
                    value={row.original.suffix ?? ''}
                    onChange={e => updateField(row.original.id, 'suffix', e.target.value)}
                />
            )
        },
        {
            header: t('taxon.synonyms.publication'),
            accessorKey: 'publication',
            cell: ({row}) => (
                <Form.Select
                    value={row.original.publication}
                    onChange={e => updateField(row.original.id, 'publication', Number(e.target.value))}
                >
                    {publications.map(p => (
                        <option key={p.id} value={p.id}>{p.abbrev} | {p.title}</option>
                    ))}
                </Form.Select>
            )
        },
        {
            header: t('taxon.synonyms.autocomplete'),
            accessorKey: 'autocomplete',
            cell: ({row}) => (
                <Form.Check
                    type="checkbox"
                    checked={row.original.autocomplete}
                    onChange={e => updateField(row.original.id, 'autocomplete', e.target.checked)}
                />
            )
        },
        {
            header: t('taxon.synonyms.actions'),
            cell: ({row}) => (
                <div className="d-flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => saveRow(row.original)}
                        disabled={!row.original.name || savingId === row.original.id}
                    >
                        <i className="bi bi-floppy2"></i>
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteRow(row.original.id)}
                    >
                        <i className="bi bi-trash"></i>
                    </Button>
                </div>
            )
        }
    ], [publications, savingId, updateField, deleteRow, saveRow, t]);

    const table = useTable({
        data: synonyms,
        columns,
        features,
    });

    /* =========================
       RENDER
    ========================= */

    return (
        <Card className="mt-3">
            <Card.Body>
                {dialog}
                <div className="d-flex justify-content-between mb-2">
                    <h5>{t('taxon.synonyms.title')}</h5>
                    <Button size="sm" onClick={addRow}>{t('taxon.synonyms.addButton')}</Button>
                </div>

                {loading && <Spinner animation="border"/>}

                {!loading && (
                    <Table striped bordered hover size="sm">
                        <thead>
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id}>
                                {hg.headers.map(h => (
                                    <th key={h.id}>
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                        </thead>
                        <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className={row.original.id === successId ? 'table-success' : ''}>

                                {row.getAllCells().map(cell => (
                                    <td key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                )}

            </Card.Body>
        </Card>
    );
}
