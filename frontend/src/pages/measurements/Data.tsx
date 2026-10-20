import {useEffect, useState} from "react";
import {Accordion, Row, Spinner, Table} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {usePageTitle} from "@/hooks/usePageTitle";
import type {FeatureGroup} from "@/models/FeatureGroup";
import type {Feature} from "@/models/Feature";
import type {TraitDatatype} from "@/models/TraitDatatype";
import {getFeatureGroups, getFeaturesOfGroup, getTraitDatatypes} from "@/services/traitApi";
import {notifyApiError} from "@/stores/notificationStore";


export default function Data() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    usePageTitle(t("trait.data.title"));

    const [groups, setGroups] = useState<FeatureGroup[]>([]);
    const [featuresByGroup, setFeaturesByGroup] =
        useState<Record<number, Feature[]>>({});
    const [datatypes, setDatatypes] =
        useState<Record<number, TraitDatatype>>({});
    const [loadingGroup, setLoadingGroup] = useState<number | null>(null);
    const [activeKey, setActiveKey] = useState<string | null>(null);


    // skupiny
    useEffect(() => {
        getFeatureGroups()
            .then(setGroups)
            .catch(e => notifyApiError(e, t("trait.data.loadFailed")));
    }, [t]);

    // číselník datatype (načte se jednou)
    useEffect(() => {
        getTraitDatatypes()
            .then((data: TraitDatatype[]) => {
                const map: Record<number, TraitDatatype> = {};
                data.forEach(d => (map[d.id] = d));
                setDatatypes(map);
            })
            .catch(e => notifyApiError(e, t("trait.data.loadFailed")));
    }, [t]);

    const loadFeatures = async (groupId: number) => {
        if (featuresByGroup[groupId]) return;

        setLoadingGroup(groupId);
        try {
            const data = await getFeaturesOfGroup(groupId);
            setFeaturesByGroup(prev => ({
                ...prev,
                [groupId]: data
            }));
        } catch (e) {
            notifyApiError(e, t("trait.data.loadFailed"));
        } finally {
            setLoadingGroup(null);
        }
    };

    const goToDetail = (id: number) => {
        navigate(`/measurements/features/${id}`);
    };

    const renderDatatype = (datatype: number) => {
        const d: TraitDatatype = datatypes[datatype];
        if (!d) return <span className="text-muted">?</span>;

        const label = d.name;
        return <span>{label}</span>;
    };

    return (
        <Row>
            <h3>{t("trait.data.title")}</h3>

            <Accordion activeKey={activeKey}>
                {groups.map(group => {
                    const key = String(group.id);

                    return (
                        <Accordion.Item eventKey={key} key={group.id}>
                            <Accordion.Header
                                onClick={() => {
                                    setActiveKey(prev => (prev === key ? null : key));
                                    loadFeatures(group.id);
                                }}
                            >
                                {t("trait.data.section")} {group.name}
                            </Accordion.Header>

                            <Accordion.Body>
                                {loadingGroup === group.id && (
                                    <Spinner animation="border" size="sm" />
                                )}

                                {featuresByGroup[group.id] && (
                                    <Table hover size="sm" className="mt-2">
                                        <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>{t("trait.feature.name")}</th>
                                            <th>{t("trait.feature.admin")}</th>
                                            <th>{t("trait.datatypes.datatype")}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {featuresByGroup[group.id].map(f => (
                                            <tr
                                                key={f.id}
                                                role="button"
                                                onClick={() => goToDetail(f.id)}
                                            >
                                                <td>{f.id}</td>
                                                <td>{f.name}</td>
                                                <td>
                                                    {f.administrator}
                                                    {f.email && (
                                                        <>
                                                            {" "}
                                                            <a
                                                                href={`mailto:${f.email}`}
                                                                onClick={e => e.stopPropagation()}
                                                                title={f.email}
                                                                className="text-decoration-none ms-1"
                                                            >
                                                                <i className="bi bi-envelope"></i>
                                                            </a>
                                                        </>
                                                    )}
                                                </td>
                                                <td>{renderDatatype(f.datatype)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>
                    );
                })}
            </Accordion>

        </Row>
    );
}
