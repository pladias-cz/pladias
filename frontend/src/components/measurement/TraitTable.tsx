import {useEffect, useState} from "react";
import type {Feature} from "@/models/Feature";
import type {Trait} from "@/models/Trait";

interface Props {
    feature: Feature;
}

export default function TraitTable({feature}: Props) {
    const [traits, setTraits] = useState<Trait[]>([]);
    const [defaultTraitId, setDefaultTraitId] = useState<number | null>(null);
    const [flash, setFlash] = useState<{type: "success" | "danger"; message: string} | null>(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!feature?.id) return;

        fetch(`/api/react/measurement/traits-of-feature/${feature.id}`)
            .then(r => r.json())
            .then(r => setTraits(r.data ?? r))
            .finally(() => setLoading(false));
    }, [feature?.id]);

    useEffect(() => {
        if (!traits.length) return;

        if (defaultTraitId === null) {
            const def = traits.find(t => t.isDefault);
            if (def) {
                setDefaultTraitId(def.id);
            }
        }
    }, [traits, defaultTraitId]);


    async function setDefaultTrait(traitId: number) {
        const previous = defaultTraitId;

        // optimistický update
        setDefaultTraitId(traitId);

        try {
            const res = await fetch(`/traits/setDefault/${traitId}`, {
                method: "GET"
            });

            const json = await res.json();

            if (!json.success) {
                setDefaultTraitId(previous ?? null);
                setFlash({
                    type: "danger",
                    message: json.message || "Nepodařilo se nastavit výchozí traitovou řadu"
                });
            } else {
                setFlash({
                    type: "success",
                    message: "Výchozí triatová řada změněna"
                });
            }
        } catch (e) {
            setDefaultTraitId(previous ?? null);
            setFlash({
                type: "danger",
                message: "Chyba komunikace se serverem"
            });
        }
    }

    if (!feature || loading) return null;

    return (
        <>
        {flash && (
            <div className={`alert alert-${flash.type}`}>
                {flash.message}
            </div>
        )}

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
                            .toLocaleDateString("cs-CZ")}
                    </td>

                    <td>{t.totalTaxonCount}</td>

                    <td dangerouslySetInnerHTML={{__html: t.sourceHtml}}/>

                    <td>{t.descriptionCz}</td>

                    <td dangerouslySetInnerHTML={{__html: t.ownerHtml}}/>

                    <td>{t.visibilityDescriptionCz}</td>

                    {/* TODO - use user locale to this route */}
                    <td>
                        {t.canDownload ? (
                            <>
                                <a href={`/traits/downloadTraitData/trait/${t.id}/lang/cs`}>
                                    stáhnout data
                                </a>

                                {t.hasAttachment && (
                                    <>
                                        <br/>
                                        <a href={`/measurement/trait/downloadAttachment/${t.id}`}>
                                            stáhnout přílohu
                                        </a>
                                    </>
                                )}

                                {t.canExport && (
                                    <>
                                        <br/>
                                        <a href={`/measurement/trait/export/${t.id}`}>
                                            detailní export
                                        </a>
                                    </>
                                )}
                            </>
                        ) : (
                            <span
                                className="fa fa-times-circle-o"
                                style={{cursor: "not-allowed", color: "#bebebe"}}
                            />
                        )}
                    </td>

                    {/* delete */}
                    <td>
                        {t.canDelete ? (
                            <a
                                href={`/traits/delete/trait/${t.id}`}
                                className="delete"
                            >
                                smazat
                            </a>
                        ) : (
                            <span
                                className="fa fa-times-circle-o"
                                style={{cursor: "not-allowed", color: "#bebebe"}}
                            />
                        )}
                    </td>

                    {/* default */}
                    <td>
                        <input
                            type="radio"
                            name="default_trait"
                            value={t.id}
                            checked={defaultTraitId === t.id}
                            disabled={!t.canDelete}
                            onChange={() => setDefaultTrait(t.id)}
                        />
                    </td>

                </tr>
            ))}
            </tbody>
        </table>
        </>
    );
}
