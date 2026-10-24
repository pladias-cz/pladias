/**
 * Pravý sloupec polí vyhledávacího formuláře:
 * herbář, instituce, projekty, zpracovatel, data, licence, Pladias ID.
 */

import {useTranslation} from "react-i18next";
import type {SearchFilters, SearchOptions} from "../hooks";
import type {TypeaheadOption} from "../types";
import {TypeaheadFilterField} from "./TypeaheadFilterField";

interface SearchFilterColumnTwoProps {
    filters: SearchFilters;
    options: SearchOptions;
    isVascular: boolean;
    projectNameText: string;
    validationStatusOptions: TypeaheadOption[];
}

export function SearchFilterColumnTwo({
                                          filters,
                                          options,
                                          isVascular,
                                          projectNameText,
                                          validationStatusOptions,
                                      }: SearchFilterColumnTwoProps) {
    const {t} = useTranslation();
    const isNonVascular = !isVascular;

    return (
        <div className="col-xl-6">
            <table id="form_part2">
                <tbody>
                <tr>
                    <th/>
                    <th/>
                </tr>

                <tr title={t("atlas.search.form.titles.source")}>
                    <td>{t("atlas.search.form.labels.source")}</td>
                    <td>
                        <input
                            type="text"
                            name="source"
                            placeholder={isNonVascular
                                ? t("atlas.search.form.placeholders.sourceNonVascular")
                                : t("atlas.search.form.placeholders.sourceVascular")}
                            className="form-control"
                        />
                    </td>
                </tr>

                {isNonVascular ? (
                    <tr title={t("atlas.search.form.titles.herbarium")}>
                        <td>{t("atlas.search.form.labels.herbarium")}</td>
                        <td>
                            <input type="text" name="herbariumText"
                                   placeholder={t("atlas.search.form.placeholders.herbariumText")}
                                   className="form-control input-sm"/>
                        </td>
                    </tr>
                ) : (
                    <TypeaheadFilterField
                        title={t("atlas.search.form.titles.herbarium")}
                        label={t("atlas.search.form.labels.herbarium")}
                        name="herbarium"
                        value={filters.selectedHerbarium[0]?.id ?? ""}
                        id="herbarium"
                        options={options.herbariumOptions}
                        selected={filters.selectedHerbarium}
                        onChange={filters.setSelectedHerbarium}
                        placeholder={t("atlas.search.form.labels.herbarium")}
                    />
                )}

                <TypeaheadFilterField
                    title={t("atlas.search.form.titles.institution")}
                    label={t("atlas.search.form.labels.institution")}
                    name="institution"
                    value={filters.selectedInstitution[0]?.id ?? ""}
                    id="institution"
                    options={options.institutionOptions}
                    selected={filters.selectedInstitution}
                    onChange={filters.setSelectedInstitution}
                    placeholder={t("atlas.search.form.placeholders.institution")}
                />

                <TypeaheadFilterField
                    title={t("atlas.search.form.titles.project")}
                    label={t("atlas.search.form.labels.project")}
                    name="project[]"
                    values={filters.selectedProjects.map((project) => project.id)}
                    id="project"
                    multiple
                    options={options.projectOptions}
                    selected={filters.selectedProjects}
                    onChange={filters.setSelectedProjects}
                    placeholder={t("atlas.search.form.placeholders.project")}
                />

                <TypeaheadFilterField
                    title={t("atlas.search.form.titles.committer", {projectName: projectNameText})}
                    label={t("atlas.search.form.labels.committer")}
                    name="committerId"
                    value={filters.selectedCommitter[0]?.id ?? -1}
                    id="committerId"
                    options={options.committerOptions}
                    selected={filters.selectedCommitter}
                    onChange={filters.setSelectedCommitter}
                    placeholder={t("atlas.search.form.labels.committer")}
                />

                <TypeaheadFilterField
                    title={t("atlas.search.form.titles.validation")}
                    label={t("atlas.search.form.labels.validation")}
                    name="validationStatus"
                    value={filters.selectedValidationStatus[0]?.id ?? -1}
                    id="validationStatus"
                    options={validationStatusOptions}
                    selected={filters.selectedValidationStatus}
                    onChange={filters.setSelectedValidationStatus}
                    placeholder={t("atlas.search.form.labels.validation")}
                />

                <TypeaheadFilterField
                    title={t("atlas.search.form.titles.history")}
                    label={t("atlas.search.form.labels.history")}
                    name="historyFlag"
                    value={filters.selectedHistoryFlag[0]?.id ?? ""}
                    id="historyFlag"
                    options={options.historyFlagOptions}
                    selected={filters.selectedHistoryFlag}
                    onChange={filters.setSelectedHistoryFlag}
                    placeholder={t("atlas.search.form.labels.history")}
                />

                <tr title={t("atlas.search.form.titles.importDate", {projectName: projectNameText})}>
                    <td>{t("atlas.search.form.labels.importDate")}</td>
                    <td>
                        <label htmlFor="fromImported">{t("atlas.search.form.from")}</label>&nbsp;
                        <input type="date" id="fromImported" name="dateFromImported"/>&nbsp;
                        <label htmlFor="toImported">{t("atlas.search.form.to")}</label>&nbsp;
                        <input type="date" id="toImported" name="dateToImported"/>
                    </td>
                </tr>

                <tr title={t("atlas.search.form.titles.lastEditDate", {projectName: projectNameText})}>
                    <td>{t("atlas.search.form.labels.lastEditDate")}</td>
                    <td>
                        <label htmlFor="fromChanged">{t("atlas.search.form.from")}</label>&nbsp;
                        <input type="date" id="fromChanged" name="dateFromLastEdit"/>&nbsp;
                        <label htmlFor="toChanged">{t("atlas.search.form.to")}</label>&nbsp;
                        <input type="date" id="toChanged" name="dateToLastEdit"/>
                    </td>
                </tr>

                <TypeaheadFilterField
                    title={t("atlas.search.form.titles.license")}
                    label={t("atlas.search.form.labels.license")}
                    name="license"
                    value={filters.selectedLicense[0]?.id ?? ""}
                    id="license"
                    options={options.licenseOptions}
                    selected={filters.selectedLicense}
                    onChange={filters.setSelectedLicense}
                    placeholder={t("atlas.search.form.placeholders.license")}
                />

                <tr title={t("atlas.search.form.titles.externalId")}>
                    <td>{t("atlas.search.form.labels.externalId")}</td>
                    <td>
                        <input type="text" name="foreignId" placeholder={t("atlas.search.form.placeholders.externalId")}
                               className="form-control input-sm"/>
                    </td>
                </tr>

                <tr>
                    <td>{t("atlas.search.form.labels.pladiasId")}</td>
                    <td>
                        <input type="hidden" name="pladiasID" value={filters.pladiasId}/>
                        <textarea
                            name="pladiasId"
                            rows={4}
                            className="form-control input-sm"
                            placeholder="3299984;3300112;3300148;13583673"
                            value={filters.pladiasId}
                            onChange={(event) => filters.setPladiasId(event.target.value)}
                        />
                    </td>
                </tr>

                <tr>
                    <td/>
                    <td>
                        <hr/>
                        <input type="checkbox" name="commented" id="commentedCheckbox1" value="true"/>&nbsp;
                        {t("atlas.search.form.onlyCommented", {projectName: projectNameText})}
                        <br/>
                        <input type="checkbox" name="unresolvedComment" id="unresolvedCheckbox1" value="true"/>&nbsp;
                        {t("atlas.search.form.onlyUnresolvedPrefix", {projectName: projectNameText})}
                        <b>{t("atlas.search.form.onlyUnresolvedBold")}</b> {t("atlas.search.form.onlyUnresolvedSuffix", {projectName: projectNameText})}
                        <br/>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    );
}
