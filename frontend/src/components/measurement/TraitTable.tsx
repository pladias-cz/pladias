import {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useConfirm} from '@/hooks/useConfirm';
import type {Feature} from '@/models/Feature';
import type {Trait} from '@/models/Trait';
import {deleteTrait, getTraitsOfFeature, setDefaultTrait} from '@/services/traitApi';
import {notifyApiError, useNotifications} from '@/stores/notificationStore';
import RichTextMessage from '@/components/RichTextMessage';

interface Props {
    feature: Feature;
    /** změnou hodnoty se tabulka datových řad znovu načte (např. po importu) */
    refreshKey?: number;
}

export default function TraitTable({feature, refreshKey}: Props) {
    const {t} = useTranslation();
    const {confirm, dialog} = useConfirm();
    const {push} = useNotifications();
    const [traits, setTraits] = useState<Trait[]>([]);
    const [defaultTraitId, setDefaultTraitId] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [busyTraitId, setBusyTraitId] = useState<number | null>(null);

    const loadTraits = useCallback(async () => {
        try {
            const list = await getTraitsOfFeature(feature.id);

            setTraits(list);
            setDefaultTraitId(list.find(trait => trait.isDefault)?.id ?? null);
        } catch (e) {
            notifyApiError(e, t('trait.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [feature.id, t]);

    useEffect(() => {
        if (!feature?.id) return;
        loadTraits();
    }, [feature?.id, loadTraits, refreshKey]);

    async function handleDeleteTrait(traitId: number) {
        if (!(await confirm({
            message: t('trait.deleteConfirm'),
            confirmLabel: t('common.delete'),
        }))) {
            return;
        }

        setBusyTraitId(traitId);

        try {
            const message = await deleteTrait(traitId);

            push({
                type: 'success',
                message: message || t('trait.deleted')
            });
            // mazání může přenastavit výchozí řadu, proto znovu načíst
            await loadTraits();
        } catch (e) {
            notifyApiError(e, t('trait.deleteFailed'));
        } finally {
            setBusyTraitId(null);
        }
    }

    async function handleSetDefault(traitId: number) {
        const previous = defaultTraitId;

        // optimistický update
        setDefaultTraitId(traitId);
        setBusyTraitId(traitId);

        try {
            await setDefaultTrait(traitId);

            push({
                type: 'success',
                message: t('trait.setDefaultChanged')
            });
            await loadTraits();
        } catch (e) {
            setDefaultTraitId(previous);
            notifyApiError(e, t('trait.setDefaultFailed'));
        } finally {
            setBusyTraitId(null);
        }
    }

    if (!feature || loading) return null;

    return (
        <>
            {dialog}

            <table className="table table-condensed table-striped">
                <thead>
                <tr>
                    <th>id</th>
                    <th>nahrání</th>
                    <th>zahrnuje taxonů</th>
                    <th>zdroj</th>
                    <th>popis</th>
                    <th>vlastník dat</th>
                    <th>dostupnost</th>
                    <th>stáhnout</th>
                    <th>smazat</th>
                    <th>výchozí</th>
                </tr>
                </thead>

                <tbody>
                {traits.map(t => (
                    <tr key={t.id}>
                        <td>{t.id}</td>

                        <td>
                            {new Date(t.createTimestamp)
                                .toLocaleDateString('cs-CZ')}
                        </td>

                        <td>{t.totalTaxonCount}</td>

                        <td><RichTextMessage html={t.sourceHtml}/></td>

                        <td>{t.descriptionCz}</td>

                        <td><RichTextMessage html={t.ownerHtml}/></td>

                        <td>{t.visibilityDescriptionCz}</td>

                        {/* TODO - use user locale to this route */}
                        <td>
                            {t.canDownload ? (
                                <>
                                    <a href={`/api/react/measurement/trait/download/${t.id}/lang/cs`}>
                                        stáhnout data
                                    </a>

                                    {t.hasAttachment && (
                                        <>
                                            <br/>
                                            <a href={`/api/react/measurement/trait/downloadAttachment/${t.id}`}>
                                                stáhnout přílohu
                                            </a>
                                        </>
                                    )}

                                    {t.canExport && (
                                        <>
                                            <br/>
                                            <a href={`/api/react/measurement/trait/export/${t.id}`}>
                                                detailní export
                                            </a>
                                        </>
                                    )}
                                </>
                            ) : (
                                <span
                                    className="fa fa-times-circle-o"
                                    style={{cursor: 'not-allowed', color: '#bebebe'}}
                                />
                            )}
                        </td>

                        {/* delete – oprávnění dává feature.canAdminister (traitAdmin / admin vlastnosti) */}
                        <td>
                            {feature.canAdminister ? (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0 text-danger"
                                    disabled={busyTraitId === t.id}
                                    onClick={() => handleDeleteTrait(t.id)}
                                >
                                    smazat
                                </button>
                            ) : (
                                <span
                                    className="fa fa-times-circle-o"
                                    style={{cursor: 'not-allowed', color: '#bebebe'}}
                                />
                            )}
                        </td>

                        {/* default */}
                        {/* výchozí řadu smí nastavit jen traitAdmin / admin vlastnosti (feature.canAdminister) */}
                        <td>
                            <input
                                type="radio"
                                name="default_trait"
                                value={t.id}
                                checked={defaultTraitId === t.id}
                                disabled={!feature.canAdminister || busyTraitId !== null}
                                onChange={() => handleSetDefault(t.id)}
                            />
                        </td>

                    </tr>
                ))}
                </tbody>
            </table>
        </>
    );
}
