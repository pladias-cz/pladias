import {useEffect, useMemo, useState} from 'react';
import {Card, Spinner, Button, Form, Alert, Table} from 'react-bootstrap';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { type ColumnDef} from '@tanstack/react-table';

import {type Taxon} from '@/models/Taxon';
import type {TaxonSynonym} from "@/models/TaxonSynonym";
import type {TaxonPublication} from "@/models/TaxonPublication";
import {useTranslation} from 'react-i18next';

interface Props {
    taxon: Taxon;
    cacheKey: number;
}

export default function TaxonSynonyms({taxon, cacheKey}: Props) {
    const {t} = useTranslation();

    const [synonyms, setSynonyms] = useState<TaxonSynonym[]>([]);
    const [publications, setPublications] = useState<TaxonPublication[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<number | null>(null);

    /* =========================
       LOAD DATA
    ========================= */

    useEffect(() => {
        setSynonyms([]);
    }, [cacheKey]);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const res = await fetch(`/api/react/taxon/${taxon.id}/synonyms`);
                const json = await res.json();
                setSynonyms(json.data);

                const pubRes = await fetch(`/api/react/taxaPublications`);
                const pubJson = await pubRes.json();
                setPublications(pubJson.data);
            } finally {
                setLoading(false);
            }
        }

        if (taxon?.id) load();
    }, [taxon]);

    /* =========================
       HANDLERS
    ========================= */

    const updateField = (id: number, field: keyof TaxonSynonym, value: any) => {
        setSynonyms(prev =>
            prev.map(s => s.id === id ? {...s, [field]: value} : s)
        );
    };

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

    const saveRow = async (syn: TaxonSynonym) => {
        setSavingId(syn.id);
        setError(null);
        setSuccessId(null);

        try {
            const method = syn.id < 0 ? 'POST' : 'PUT';
            const url = syn.id < 0
                ? `/api/react/synonyms/${taxon.id}`
                : `/api/react/synonyms/${syn.id}`;

            const res = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(syn)
            });

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message ?? t("taxon.synonyms.saveFailed", { status: res.status }));
            }

            const json = await res.json();

            // když backend vrací nový objekt (typicky při POST)
            if (syn.id < 0 && json.data?.id) {
                setSynonyms(prev =>
                    prev.map(s =>
                        s.id === syn.id ? {...json.data} : s
                    )
                );
            }

            setSuccessId(syn.id);

            // po 2s schovej success
            setTimeout(() => setSuccessId(null), 2000);

        } catch (e: any) {
            setError(e.message || t("taxon.synonyms.saveError"));
        } finally {
            setSavingId(null);
        }
    };

    const renderAlert = () => {
        if (error) {
            return (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            );
        }

        if (successId) {
            return (
                <Alert variant="success">
                    {t("taxon.synonyms.saved")}
                </Alert>
            );
        }

        return null;
    };

    const deleteRow = async (id: number) => {
        if (!confirm(t("taxon.synonyms.deleteConfirm"))) return;

        setError(null);

        try {
            const res = await fetch(`/api/react/synonyms/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message ?? t("taxon.synonyms.deleteFailed", { status: res.status }));
            }

            setSynonyms(prev => prev.filter(s => s.id !== id));

        } catch (e: any) {
            setError(e.message || t("taxon.synonyms.deleteError"));
        }
    };

    /* =========================
       COLUMNS
    ========================= */

    const columns = useMemo<ColumnDef<TaxonSynonym>[]>(() => [
        {
            header: t("taxon.synonyms.nameLatin"),
            accessorKey: 'name',
            cell: ({row}) => (
                <Form.Control
                    value={row.original.name}
                    onChange={e => updateField(row.original.id, 'name', e.target.value)}
                />
            )
        },
        {
            header: t("taxon.synonyms.nameHtml"),
            accessorKey: 'nameHtml',
            cell: ({row}) => (
                <Form.Control
                    value={row.original.nameHtml}
                    onChange={e => updateField(row.original.id, 'nameHtml', e.target.value)}
                />
            )
        },
        {
            header: t("taxon.synonyms.suffix"),
            accessorKey: 'suffix',
            cell: ({row}) => (
                <Form.Control
                    value={row.original.suffix ?? ''}
                    onChange={e => updateField(row.original.id, 'suffix', e.target.value)}
                />
            )
        },
        {
            header: t("taxon.synonyms.publication"),
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
            header: t("taxon.synonyms.autocomplete"),
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
            header: t("taxon.synonyms.actions"),
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
    ], [publications, savingId]);

    const table = useReactTable({
        data: synonyms,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    /* =========================
       RENDER
    ========================= */

    return (
        <Card className="mt-3">
            <Card.Body>

                <div className="d-flex justify-content-between mb-2">
                    <h5>{t("taxon.synonyms.title")}</h5>
                    <Button size="sm" onClick={addRow}>{t("taxon.synonyms.addButton")}</Button>
                </div>

                {renderAlert()}
                {loading && <Spinner animation="border" />}

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

                                {row.getVisibleCells().map(cell => (
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
