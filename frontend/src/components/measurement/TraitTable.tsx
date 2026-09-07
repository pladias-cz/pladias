import {useCallback, useEffect, useState} from "react";
import type {Feature} from "@/models/Feature";
import type {Trait} from "@/models/Trait";
import type {ApiResponse} from "@/models/ApiResponse";
import type {Flash} from "@/models/Flash";

interface Props {
    feature: Feature;
}

/**
 * Server odpovídá přes JsonResult ({success, data, message}), ale některé akce
 * (např. mazání) vrací jen samotný JSON řetězec s hlášením.
 */
function extractMessage(body: unknown): string | null {
    if (typeof body === "string") return body;
    if (body && typeof body === "object" && "message" in body) {
        const message = (body as {message?: unknown}).message;
        if (typeof message === "string" && message) return message;
    }
    return null;
}

export default function TraitTable({feature}: Props) {
    const [traits, setTraits] = useState<Trait[]>([]);
    const [defaultTraitId, setDefaultTraitId] = useState<number | null>(null);
    const [flash, setFlash] = useState<Flash | null>(null);

    const [loading, setLoading] = useState(true);
    const [busyTraitId, setBusyTraitId] = useState<number | null>(null);

    const loadTraits = useCallback(async () => {
        try {
            const res = await fetch(`/api/react/measurement/traits-of-feature/${feature.id}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json = await res.json() as ApiResponse<Trait[]>;
            const list = json.data ?? [];

            setTraits(list);
            setDefaultTraitId(list.find(t => t.isDefault)?.id ?? null);
        } catch (e) {
            setFlash({
                type: "danger",
                message: `Nepodařilo se načíst datové řady: ${e instanceof Error ? e.message : "neznámá chyba"}`
            });
        } finally {
            setLoading(false);
        }
    }, [feature.id]);

    useEffect(() => {
        if (!feature?.id) return;
        loadTraits();
    }, [feature?.id, loadTraits]);

    async function deleteTrait(traitId: number) {
        if (!window.confirm("Opravdu chcete smazat tuto datovou řadu?")) return;

        setBusyTraitId(traitId);

        try {
            const res = await fetch(`/api/react/measurement/trait/${traitId}`, {
                method: "DELETE"
            });

            const message = extractMessage(await res.json().catch(() => null));

            if (!res.ok) {
                setFlash({
                    type: "danger",
                    message: message || "Nepodařilo se smazat datovou řadu"
                });
                return;
            }

            setFlash({
                type: "success",
                message: message || "Datová řada byla smazána"
            });
            // mazání může přenastavit výchozí řadu, proto znovu načíst
            await loadTraits();
        } catch {
            setFlash({
                type: "danger",
                message: "Chyba komunikace se serverem"
            });
        } finally {
            setBusyTraitId(null);
        }
    }

    async function setDefaultTrait(traitId: number) {
        const previous = defaultTraitId;

        // optimistický update
        setDefaultTraitId(traitId);
        setBusyTraitId(traitId);

        try {
            const res = await fetch(`/api/react/measurement/trait/${traitId}/default`, {
                method: "PUT"
            });

            const json = await res.json().catch(() => null);
            const message = extractMessage(json);

            if (!res.ok || json?.success === false) {
                setDefaultTraitId(previous);
                setFlash({
                    type: "danger",
                    message: message || "Nepodařilo se nastavit výchozí datovou řadu"
                });
                return;
            }

            setFlash({
                type: "success",
                message: "Výchozí datová řada změněna"
            });
            await loadTraits();
        } catch {
            setDefaultTraitId(previous);
            setFlash({
                type: "danger",
                message: "Chyba komunikace se serverem"
            });
        } finally {
            setBusyTraitId(null);
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
                                style={{cursor: "not-allowed", color: "#bebebe"}}
                            />
                        )}
                    </td>

                    {/* delete */}
                    <td>
                        {t.canDelete ? (
                            <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-danger"
                                disabled={busyTraitId === t.id}
                                onClick={() => deleteTrait(t.id)}
                            >
                                smazat
                            </button>
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
                            disabled={!t.canDelete || busyTraitId !== null}
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
