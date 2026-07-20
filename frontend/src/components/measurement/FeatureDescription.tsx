import {useEffect, useState} from "react";
import type {Feature} from "@/models/Feature";
import type {TraitDatatype} from "@/models/TraitDatatype.ts";
import type {TraitAggregationType} from "@/models/TraitAggregationType.ts";
import type {EnumerateValue} from "@/models/EnumerateValue";
import {DatatypeDescriptionPopover} from "@/components/measurement/DatatypeDescriptionPopover";

function BoolIcon({value}: { value: boolean }) {
    return value ? (
        <i className="bi bi-check-lg text-success" aria-hidden="true"/>
    ) : (
        <i className="bi bi-x-lg text-danger" aria-hidden="true"/>
    );
}

interface Props {
    feature: Feature;
}

export default function FeatureDatatypeFlags({feature}: Props) {
    const [datatype, setDatatype] = useState<TraitDatatype | null>(null);
    const [inheritance, setInheritance] = useState<TraitAggregationType | null>(null);
    const [enumerate, setEnumerate] = useState<EnumerateValue[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadData() {
            try {
                setLoading(true);

                const requests: Promise<Response>[] = [
                    fetch("/api/react/measurement/datatypes"),
                    fetch("/api/react/measurement/aggregation-types")
                ];

                if (feature.enumerate) {
                    requests.push(
                        fetch(`/api/react/measurement/enumerate-values/${feature.enumerate}`)
                    );
                }

                const responses = await Promise.all(requests);

                const [datatypeRes, inheritanceRes, enumerateRes] = responses;

                const datatypeJson = await datatypeRes.json();
                const inheritanceJson = await inheritanceRes.json();

                const enumerateJson = enumerateRes
                    ? await enumerateRes.json()
                    : null;

                if (!cancelled) {
                    setDatatype(
                        datatypeJson.data.find((d: TraitDatatype) => d.id === feature.datatype) ?? null
                    );

                    setInheritance(
                        inheritanceJson.data.find((i: TraitAggregationType) => i.id === feature.inheritance) ?? null
                    );

                    setEnumerate(enumerateJson?.data ?? null);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadData();
        return () => {
            cancelled = true;
        };
    }, [feature.id, feature.datatype, feature.inheritance, feature.enumerate]);

    if (loading) {
        return <p className="ms-3 text-muted">loading…</p>;
    }

    if (!datatype || !inheritance) return null;

    return (
        <>
            <p className="d-inline-flex align-items-center gap-1 flex-wrap">
                datový typ <b>{datatype.nameCz}</b> ({datatype.name})
                <DatatypeDescriptionPopover description={datatype.description}/>

                <em className="ms-3">multiplicita:</em>
                <BoolIcon value={datatype.multiplicity}/>

                <em className="ms-3">dominance:</em>
                <BoolIcon value={datatype.dominance}/>

                <em className="ms-3">frekvence:</em>
                <BoolIcon value={datatype.frequency}/>
            </p>

            <p>
                typ dědičnosti <b>{inheritance.key}</b>
                <DatatypeDescriptionPopover description={inheritance.description}/>
            </p>

            {feature.explanation && (
                <p dangerouslySetInnerHTML={{__html: feature.explanation}}/>
            )}

            {feature.bibliography && (
                <p dangerouslySetInnerHTML={{__html: feature.bibliography}}/>
            )}

            {enumerate && enumerate.length > 0 && (
                <div className="ms-3">
                    <b>přípustné hodnoty</b>
                    <ul>
                        {enumerate.map(ev => (
                            <li key={ev.id}>
                                 {ev.nameCz}
                                {ev.descriptionCz && ` – ${ev.descriptionCz}`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {feature.units && (
                <p><b>jednotky</b> - {feature.units}</p>
            )}
        </>
    );
}
