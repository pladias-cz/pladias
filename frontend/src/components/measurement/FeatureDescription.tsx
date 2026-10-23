import {useEffect, useState} from "react";
import type {Feature} from "@/models/Feature";
import type {TraitDatatype} from "@/models/TraitDatatype";
import type {TraitAggregationType} from "@/models/TraitAggregationType";
import type {EnumerateValue} from "@/models/EnumerateValue";
import {DatatypeDescriptionPopover} from "@/components/measurement/DatatypeDescriptionPopover";
import RichTextMessage from "@/components/RichTextMessage";
import {getEnumerateValues, getTraitAggregationTypes, getTraitDatatypes} from "@/services/traitApi";
import {notifyApiError} from "@/stores/notificationStore";
import {useTranslation} from "react-i18next";

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
    const {t} = useTranslation();
    const [datatype, setDatatype] = useState<TraitDatatype | null>(null);
    const [inheritance, setInheritance] = useState<TraitAggregationType | null>(null);
    const [enumerate, setEnumerate] = useState<EnumerateValue[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadData() {
            try {
                setLoading(true);

                const [datatypes, inheritances, enumerates] = await Promise.all([
                    getTraitDatatypes(),
                    getTraitAggregationTypes(),
                    feature.enumerate ? getEnumerateValues(feature.enumerate) : Promise.resolve(null),
                ]);

                if (!cancelled) {
                    setDatatype(
                        datatypes.find(d => d.id === feature.datatype) ?? null
                    );

                    setInheritance(
                        inheritances.find(i => i.id === feature.inheritance) ?? null
                    );

                    setEnumerate(enumerates);
                }
            } catch (e) {
                notifyApiError(e, t("common.loadFailed"));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadData();
        return () => {
            cancelled = true;
        };
    }, [feature.id, feature.datatype, feature.inheritance, feature.enumerate, t]);

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
                <RichTextMessage as="p" html={feature.explanation}/>
            )}

            {feature.bibliography && (
                <RichTextMessage as="p" html={feature.bibliography}/>
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
