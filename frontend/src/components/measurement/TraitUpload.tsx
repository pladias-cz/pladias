import {useEffect, useState} from "react";
import {type Feature} from "@/models/Feature";
import type {TraitVisibilityStatus} from "@/models/TraitVisibilityStatus";
import type {UserId} from "@/models/UserId";
import type {TraitDatatype} from "@/models/TraitDatatype.ts";
import {useUser} from "@/context/UserContext.tsx";
import {useTranslation} from "react-i18next";

interface Props {
    feature: Feature;
}

export default function TraitUpload({feature}: Props) {
    const user = useUser();
    const {t} = useTranslation();

    const [datatype, setDatatype] = useState<TraitDatatype | null>(null);
    const [users, setUsers] = useState<UserId[]>([]);
    const [visibility, setVisibility] = useState<TraitVisibilityStatus[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [usersRes, visRes, datatypeRes] = await Promise.all([
                fetch("/api/react/users-minimal").then(r => r.json()),
                fetch("/api/react/measurement/visibility-status").then(r => r.json()),
                fetch("/api/react/measurement/datatypes").then(r => r.json()),
            ]);

            setUsers(usersRes.data ?? usersRes);
            setVisibility(visRes.data ?? visRes);

            const dt = (datatypeRes.data ?? datatypeRes).find(
                (d: TraitDatatype) => d.id === feature.datatype
            );

            setDatatype(dt ?? null);
            setLoading(false);
        }

        load();
    }, [feature.datatype]);

    if (!feature || loading) return null;

    return (
        <>
            <input type="hidden" name="featureId" value={feature.id}/>

            {/* file upload */}
            <div className="form-group row">
                <label className="col-sm-3 control-label" htmlFor="data">
                    {t("trait.upload.inputFile")}
                </label>
                <div className="col-sm-9">
                    <input
                        type="file"
                        id="data"
                        name="data"
                        className="form-control"
                        accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    />
                    {datatype && (
                        <p className="help-block">
                            {t("trait.upload.fileStructure")}{" "}
                            <a
                                href={`/assets/downloads/traits/${datatype.name}_template.xlsx`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t("trait.upload.sampleExcel")}
                            </a>{" "}
                            {t("trait.upload.forDatatype")} <b>{datatype.name}</b>; {t("trait.upload.fileSize")}.
                        </p>
                    )}
                </div>
            </div>

            {/* owner */}
            <div className="form-group row">
                <label className="col-sm-3 control-label" htmlFor="owner">
                    {t("trait.upload.owner")}
                </label>
                <div className="col-sm-7">
                    <select
                        className="form-control"
                        id="owner"
                        name="owner"
                        defaultValue={user.id}
                    >
                        <option value="">{t("trait.upload.selectOwner")}</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* source */}
            <div className="form-group row">
                <label className="col-sm-3 control-label" htmlFor="source">
                    {t("trait.upload.source")}
                </label>
                <div className="col-sm-7">
                    <input
                        className="form-control"
                        id="source"
                        name="source"
                    />
                </div>
            </div>

            {/* description cz */}
            <div className="form-group row">
                <label className="col-sm-3 control-label" htmlFor="descriptionCz">
                    {t("trait.upload.descriptionCz")}
                </label>
                <div className="col-sm-7">
                    <textarea className="form-control" rows={2} id="descriptionCz" name="descriptionCz"/>
                </div>
            </div>

            {/* description en */}
            <div className="form-group row">
                <label className="col-sm-3 control-label" htmlFor="descriptionEn">
                    {t("trait.upload.descriptionEn")}
                </label>
                <div className="col-sm-7">
                    <textarea className="form-control" rows={2} id="descriptionEn" name="descriptionEn"/>
                </div>
            </div>

            {/* visibility */}
            <div className="form-group row">
                <label className="col-sm-3 control-label" htmlFor="visibility">
                    {t("trait.upload.visibility")}
                </label>
                <div className="col-sm-7">
                    <select className="form-control" id="visibility" name="visibility">
                        <option value="">{t("trait.upload.selectVisibility")}</option>
                        {visibility.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.descriptionCz}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* attachment */}
            <div className="form-group row">
                <label className="col-sm-3 control-label" htmlFor="attachment">
                    {t("trait.upload.attachment")}
                </label>
                <div className="col-sm-9">
                    <input type="file" id="attachment" name="attachment"/>
                </div>
            </div>

            {/* operation */}
            <div className="form-group row">
                <label className="col-sm-3 control-label">{t("trait.upload.operation")}</label>
                <div className="col-sm-9">
                    <div className="radio">
                        <label>
                            <input type="radio" name="operation" value="validation" defaultChecked/>
                            {t("trait.upload.validate")}
                        </label>
                    </div>
                    <div className="radio">
                        <label>
                            <input type="radio" name="operation" value="import"/>
                            {t("trait.upload.import")}
                        </label>
                    </div>
                </div>
            </div>

            <div>
                <button type="submit" className="btn btn-primary">{t("trait.upload.submit")}</button>
            </div>
        </>
    );
}