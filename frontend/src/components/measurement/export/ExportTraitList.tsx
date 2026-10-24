import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Spinner} from "react-bootstrap";
import type {FeatureGroup} from "@/models/FeatureGroup";
import type {Feature} from "@/models/Feature";
import type {Trait} from "@/models/Trait";
import {getFeatureGroups, getFeaturesOfGroup, getTraitsOfFeature} from "@/services/traitApi";
import {notifyApiError} from "@/stores/notificationStore";
import RichTextMessage from "@/components/RichTextMessage";
import "./ExportTraitList.scss";

/**
 * Strom výběru vlastností komplexního exportu (skupina → vlastnost → datová
 * řada) – klasický treeview s tri-state checkboxy:
 *  - zaškrtnutí skupiny či vlastnosti vybere všechny podřízené řady; chybějící
 *    potomky strom sám dotáhne z API,
 *  - zrušením se ruší i vše podřízené, zaškrtnutí nadřazených položek se
 *    počítá z potomků, takže zrušení poslední vybrané řady zruší i nadřazenou,
 *  - řádek uzlu s alespoň jednou vybranou podpoložkou je zvýrazněný.
 *
 * Vybrané řady se odesílají přes skryté vstupy `traitIds[]` – Export.tsx čte
 * formulář přes FormData, takže výběr přežije i zavřené podstromy.
 */

/** Stav zaškrtnutí uzlu; "empty" = uzel bez vybratelných potomků. */
type CheckState = "all" | "some" | "none" | "empty";

/** Stav listu (řady jedné vlastnosti) podle vybraných id. */
function leafState(ids: number[], selected: ReadonlySet<number>): CheckState {
    if (ids.length === 0) return "empty";

    let selectedCount = 0;
    for (const id of ids) {
        if (selected.has(id)) selectedCount++;
    }

    return selectedCount === ids.length ? "all" : selectedCount > 0 ? "some" : "none";
}

/** Stav nadřazeného uzlu podle stavů potomků; potomci bez řad se do výběru nepočítají. */
function parentState(childStates: CheckState[]): CheckState {
    const selectable = childStates.filter(state => state !== "empty");
    if (selectable.length === 0) return "empty";
    if (selectable.every(state => state === "all")) return "all";
    return selectable.some(state => state === "all" || state === "some") ? "some" : "none";
}

/** Zvýraznění řádku uzlu s alespoň jednou vybranou podpoložkou. */
function isHighlighted(state: CheckState): boolean {
    return state === "all" || state === "some";
}

/** Kopie sady s přidanou/odebranou hodnotou (rozbalování, načítání, výběr řad). */
function toggleSetItem<T>(set: ReadonlySet<T>, value: T, present: boolean): Set<T> {
    const next = new Set(set);
    if (present) {
        next.add(value);
    } else {
        next.delete(value);
    }
    return next;
}

export default function ExportTraitList() {
    const {t} = useTranslation();

    const [groups, setGroups] = useState<FeatureGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [featuresByGroup, setFeaturesByGroup] = useState<Record<number, Feature[]>>({});
    const [traitsByFeature, setTraitsByFeature] = useState<Record<number, Trait[]>>({});
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());
    const [loadingGroups, setLoadingGroups] = useState<Set<number>>(new Set());
    const [loadingFeatures, setLoadingFeatures] = useState<Set<number>>(new Set());
    const [selectedTraitIds, setSelectedTraitIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        getFeatureGroups()
            .then(setGroups)
            .catch(e => notifyApiError(e, t("trait.export.loadFailed")))
            .finally(() => setLoading(false));
    }, [t]);

    // --- načítání chybějících potomků (kaskádní výběr je potřebuje znát) ---

    async function ensureFeaturesLoaded(groupId: number): Promise<Feature[]> {
        const cached = featuresByGroup[groupId];
        if (cached) return cached;

        const features = await getFeaturesOfGroup(groupId);
        setFeaturesByGroup(prev => ({...prev, [groupId]: features}));
        return features;
    }

    async function loadTraits(featureId: number): Promise<Trait[]> {
        const cached = traitsByFeature[featureId];
        if (cached) return cached;

        setLoadingFeatures(prev => toggleSetItem(prev, featureId, true));
        try {
            const traits = await getTraitsOfFeature(featureId);
            setTraitsByFeature(prev => ({...prev, [featureId]: traits}));
            return traits;
        } finally {
            setLoadingFeatures(prev => toggleSetItem(prev, featureId, false));
        }
    }

    // --- rozbalování uzlů ---

    function toggleGroupExpanded(group: FeatureGroup) {
        const willExpand = !expandedGroups.has(group.id);
        setExpandedGroups(prev => toggleSetItem(prev, group.id, willExpand));
        if (!willExpand || featuresByGroup[group.id]) return;

        setLoadingGroups(prev => toggleSetItem(prev, group.id, true));
        ensureFeaturesLoaded(group.id)
            .catch(e => notifyApiError(e, t("trait.export.loadFailed")))
            .finally(() => setLoadingGroups(prev => toggleSetItem(prev, group.id, false)));
    }

    function toggleFeatureExpanded(feature: Feature) {
        const willExpand = !expandedFeatures.has(feature.id);
        setExpandedFeatures(prev => toggleSetItem(prev, feature.id, willExpand));
        if (!willExpand || traitsByFeature[feature.id]) return;

        loadTraits(feature.id).catch(e => notifyApiError(e, t("trait.export.loadFailed")));
    }

    // --- výběr (kaskádní zaškrtnutí skupiny/vlastnosti, jednotlivé řady) ---

    function toggleTrait(traitId: number) {
        setSelectedTraitIds(prev => toggleSetItem(prev, traitId, !prev.has(traitId)));
    }

    function setTraitsSelected(ids: number[], selected: boolean) {
        if (ids.length === 0) return;

        setSelectedTraitIds(prev => {
            const next = new Set(prev);
            for (const id of ids) {
                if (selected) {
                    next.add(id);
                } else {
                    next.delete(id);
                }
            }
            return next;
        });
    }

    async function toggleFeatureCheck(feature: Feature) {
        // částečně vybraná vlastnost se doplní, plně vybraná se zruší
        const select = featureCheckState(feature.id) !== "all";
        try {
            const traits = await loadTraits(feature.id);
            setTraitsSelected(traits.map(trait => trait.id), select);
        } catch (e) {
            notifyApiError(e, t("trait.export.loadFailed"));
        }
    }

    async function toggleGroupCheck(group: FeatureGroup) {
        const select = groupCheckState(group) !== "all";
        setLoadingGroups(prev => toggleSetItem(prev, group.id, true));
        try {
            const features = await ensureFeaturesLoaded(group.id);
            const traitLists = await Promise.all(features.map(feature => loadTraits(feature.id)));
            setTraitsSelected(traitLists.flat().map(trait => trait.id), select);
        } catch (e) {
            notifyApiError(e, t("trait.export.loadFailed"));
        } finally {
            setLoadingGroups(prev => toggleSetItem(prev, group.id, false));
        }
    }

    // --- stav zaškrtnutí nadřazených uzlů se počítá z potomků ---
    // (nenačtený potomek = nic vybraného pod ním, výběr vždy dotaže data)

    function featureCheckState(featureId: number): CheckState {
        const traits = traitsByFeature[featureId];
        return traits ? leafState(traits.map(trait => trait.id), selectedTraitIds) : "none";
    }

    function groupCheckState(group: FeatureGroup): CheckState {
        const features = featuresByGroup[group.id];
        return features ? parentState(features.map(feature => featureCheckState(feature.id))) : "none";
    }

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner animation="border"/>
            </div>
        );
    }

    return (
        <div className="export-tree">
            {groups.map(group => {
                const groupState = groupCheckState(group);
                const groupExpanded = expandedGroups.has(group.id);
                const groupLoading = loadingGroups.has(group.id);

                return (
                    <div className="export-tree__node export-tree__node--group" key={group.id}>
                        <div
                            className={`export-tree__row${isHighlighted(groupState) ? " export-tree__row--selected" : ""}`}>
                            <button
                                type="button"
                                className="export-tree__toggle"
                                aria-expanded={groupExpanded}
                                aria-label={groupExpanded
                                    ? t("trait.export.collapse", {name: group.name})
                                    : t("trait.export.expand", {name: group.name})}
                                onClick={() => toggleGroupExpanded(group)}
                            >
                                <i className={`bi bi-chevron-${groupExpanded ? "down" : "right"}`} aria-hidden="true"/>
                            </button>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`export-tree-group-${group.id}`}
                                checked={groupState === "all"}
                                disabled={groupState === "empty" || groupLoading}
                                ref={checkbox => {
                                    if (checkbox) checkbox.indeterminate = groupState === "some";
                                }}
                                onChange={() => toggleGroupCheck(group)}
                            />
                            <label className="export-tree__label fw-bold" htmlFor={`export-tree-group-${group.id}`}>
                                {group.name}
                            </label>
                            {groupLoading && <Spinner animation="border" size="sm" className="export-tree__spinner"/>}
                        </div>

                        {groupExpanded && featuresByGroup[group.id] && (
                            <div className="export-tree__children">
                                {featuresByGroup[group.id].map(feature => {
                                    const featureState = featureCheckState(feature.id);
                                    const featureExpanded = expandedFeatures.has(feature.id);
                                    const featureLoading = loadingFeatures.has(feature.id);

                                    return (
                                        <div className="export-tree__node" key={feature.id}>
                                            <div
                                                className={`export-tree__row${isHighlighted(featureState) ? " export-tree__row--selected" : ""}`}>
                                                <button
                                                    type="button"
                                                    className="export-tree__toggle"
                                                    aria-expanded={featureExpanded}
                                                    aria-label={featureExpanded
                                                        ? t("trait.export.collapse", {name: feature.name})
                                                        : t("trait.export.expand", {name: feature.name})}
                                                    onClick={() => toggleFeatureExpanded(feature)}
                                                >
                                                    <i className={`bi bi-chevron-${featureExpanded ? "down" : "right"}`}
                                                       aria-hidden="true"/>
                                                </button>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id={`export-tree-feature-${feature.id}`}
                                                    checked={featureState === "all"}
                                                    disabled={featureState === "empty" || groupLoading || featureLoading}
                                                    ref={checkbox => {
                                                        if (checkbox) checkbox.indeterminate = featureState === "some";
                                                    }}
                                                    onChange={() => toggleFeatureCheck(feature)}
                                                />
                                                <label className="export-tree__label"
                                                       htmlFor={`export-tree-feature-${feature.id}`}>
                                                    {feature.name}
                                                </label>
                                                {featureLoading && <Spinner animation="border" size="sm"
                                                                            className="export-tree__spinner"/>}
                                            </div>

                                            {featureExpanded && traitsByFeature[feature.id] && (
                                                <div className="export-tree__children">
                                                    {traitsByFeature[feature.id].map(trait => (
                                                        <div className="export-tree__node" key={trait.id}>
                                                            <label
                                                                className={`export-tree__row${selectedTraitIds.has(trait.id) ? " export-tree__row--selected" : ""}`}>
                                                                <span className="export-tree__spacer"
                                                                      aria-hidden="true"/>
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    disabled={groupLoading || featureLoading}
                                                                    checked={selectedTraitIds.has(trait.id)}
                                                                    onChange={() => toggleTrait(trait.id)}
                                                                />
                                                                <span className="export-tree__label">
                                                                    datová řada založená na zdroji <RichTextMessage
                                                                    html={trait.sourceHtml}/><small
                                                                    className="text-muted">({new Date(trait.createTimestamp).toLocaleDateString("cs-CZ")})</small>
                                                                </span>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* vybrané řady jako skryté vstupy formuláře – hodnoty přežijí zavřené podstromy */}
            {[...selectedTraitIds].map(traitId => (
                <input key={traitId} type="hidden" name="traitIds[]" value={traitId}/>
            ))}
        </div>
    );
}
