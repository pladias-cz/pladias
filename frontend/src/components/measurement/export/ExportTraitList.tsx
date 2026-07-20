import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { FeatureGroup } from "@/models/FeatureGroup.ts";
import type { Feature } from "@/models/Feature.ts";
import type { Trait } from "@/models/Trait.ts";
import { Spinner, Alert, Button, Form } from "react-bootstrap";

interface TraitsByFeature {
    [featureId: number]: Trait[];
}

export default function ExportTraitList() {
    const { t } = useTranslation();

    const [groups, setGroups] = useState<FeatureGroup[]>([]);
    const [featuresByGroup, setFeaturesByGroup] = useState<Record<number, Feature[]>>({});
    const [traitsByFeature, setTraitsByFeature] = useState<TraitsByFeature>({});
    const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
    const [expandedFeatures, setExpandedFeatures] = useState<number[]>([]);
    const [loadingGroup, setLoadingGroup] = useState<number | null>(null);
    const [loadingFeature, setLoadingFeature] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedTraitIds, setSelectedTraitIds] = useState<Set<number>>(new Set());

    // načtení skupin
    useEffect(() => {
        fetch("/api/react/measurement/feature-groups")
            .then(r => r.json())
            .then(r => setGroups(r.data))
            .catch(e => setError(e.message));
    }, []);

    const toggleGroup = (groupId: number) => {
        if (expandedGroups.includes(groupId)) {
            setExpandedGroups(expandedGroups.filter(id => id !== groupId));
        } else {
            setExpandedGroups([...expandedGroups, groupId]);
            loadFeatures(groupId);
        }
    };

    const loadFeatures = async (groupId: number) => {
        if (featuresByGroup[groupId]) return;

        setLoadingGroup(groupId);
        try {
            const res = await fetch(`/api/react/measurement/features-by-group/${groupId}`);
            const result = await res.json();
            setFeaturesByGroup(prev => ({
                ...prev,
                [groupId]: result.data
            }));
        } catch (e: any) {
            setError(e.message ?? "Unknown error");
        } finally {
            setLoadingGroup(null);
        }
    };

    const toggleFeature = (featureId: number) => {
        if (expandedFeatures.includes(featureId)) {
            setExpandedFeatures(expandedFeatures.filter(id => id !== featureId));
        } else {
            setExpandedFeatures([...expandedFeatures, featureId]);
            loadTraits(featureId);
        }
    };

    const loadTraits = async (featureId: number) => {
        if (traitsByFeature[featureId]) return;

        setLoadingFeature(featureId);
        try {
            const res = await fetch(`/api/react/measurement/traits-of-feature/${featureId}`);
            const result = await res.json();
            setTraitsByFeature(prev => ({
                ...prev,
                [featureId]: result.data ?? result
            }));
        } catch (e: any) {
            setError(e.message ?? "Unknown error");
        } finally {
            setLoadingFeature(null);
        }
    };

    const handleTraitToggle = (traitId: number) => {
        setSelectedTraitIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(traitId)) newSet.delete(traitId);
            else newSet.add(traitId);
            return newSet;
        });
    };

    // --- helpers pro stav vybraných ---
    const isFeatureSelected = (feature: Feature) => {
        const traits = traitsByFeature[feature.id] || [];
        return traits.some(trait => selectedTraitIds.has(trait.id));
    };

    const isGroupSelected = (group: FeatureGroup) => {
        const features = featuresByGroup[group.id] || [];
        return features.some(f => isFeatureSelected(f));
    };

    if (error) {
        return <Alert variant="danger">{t("common.error")}: {error}</Alert>;
    }

    return (
        <>
            {groups.map(group => {
                const groupSelected = isGroupSelected(group);

                return (
                    <div
                        key={group.id}
                        style={{
                            marginBottom: "1rem",
                            padding: "0.25rem 0.5rem",
                            backgroundColor: groupSelected ? "#c8e6c9" : "transparent", // světle zelená
                            borderRadius: "4px"
                        }}
                    >
                        <div className="d-flex align-items-center justify-content-between">
                            <Button
                                variant="link"
                                onClick={() => toggleGroup(group.id)}
                                className={`p-0 fw-bold ${groupSelected ? "text-success" : ""}`}
                            >
                                {group.name} {loadingGroup === group.id && <Spinner animation="border" size="sm" />}
                            </Button>


                        </div>

                        {expandedGroups.includes(group.id) && featuresByGroup[group.id] && (
                            <div style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
                                {featuresByGroup[group.id].map(feature => {
                                    const featureSelected = isFeatureSelected(feature);

                                    return (
                                        <div
                                            key={feature.id}
                                            style={{
                                                marginBottom: "0.5rem",
                                                padding: "0.25rem 0.5rem",
                                                backgroundColor: featureSelected ? "#a5d6a7" : "transparent", // tmavší zelená
                                                borderRadius: "4px"
                                            }}
                                        >
                                            <div className="d-flex align-items-center justify-content-between">
                                                <Button
                                                    variant="link"
                                                    onClick={() => toggleFeature(feature.id)}
                                                    className={`p-0 ${featureSelected ? "text-success" : ""}`}
                                                >
                                                    {feature.name} {loadingFeature === feature.id && <Spinner animation="border" size="sm" />}
                                                </Button>


                                            </div>

                                            {expandedFeatures.includes(feature.id) && traitsByFeature[feature.id] && (
                                                <ul style={{ paddingLeft: "1.5rem", marginTop: "0.25rem", listStyle: "none" }}>
                                                    {traitsByFeature[feature.id].map(trait => (
                                                        <li key={trait.id} style={{ marginBottom: "0.25rem" }}>
                                                            <Form.Check
                                                                type="checkbox"
                                                                name="traitIds[]"
                                                                value={trait.id}
                                                                label={
                                                                    <>
                                                                        datová řada založená na zdroji <span dangerouslySetInnerHTML={{__html: trait.sourceHtml}}></span>
                                                                        <small className="text-muted">
                                                                            ({new Date(trait.createTimestamp).toLocaleDateString("cs-CZ")})
                                                                        </small>
                                                                    </>
                                                                }
                                                                checked={selectedTraitIds.has(trait.id)}
                                                                onChange={() => handleTraitToggle(trait.id)}
                                                            />
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}
