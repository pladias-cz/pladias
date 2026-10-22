/**
 * Levý sloupec polí vyhledávacího formuláře:
 * taxon, lokalita, fytochorion, substráty apod.
 */

import {useTranslation} from "react-i18next";
import {Autocomplete} from "@/components/autocomplete/Autocomplete";
import {createTaxaImportableProvider} from "@/components/autocomplete/TaxaImportableProvider";
import type {TaxonId} from "@/models/TaxonId";
import type {SearchFilters, SearchOptions} from "../hooks";
import {TypeaheadFilterField} from "./TypeaheadFilterField";

interface SearchFilterColumnOneProps {
    filters: SearchFilters;
    options: SearchOptions;
    isVascular: boolean;
    projectNameText: string;
    taxonProvider: ReturnType<typeof createTaxaImportableProvider>;
}

export function SearchFilterColumnOne({filters, options, isVascular, projectNameText, taxonProvider}: SearchFilterColumnOneProps) {
    const {t} = useTranslation();
    const isNonVascular = !isVascular;

    return (
        <div className="col-xl-6">
            <table id="form_part1">
                <tbody>
                    <tr>
                        <th />
                        <th />
                    </tr>

                    <tr title={t("atlas.search.form.titles.taxon")}>
                        <td>{t("atlas.search.form.labels.taxon")}</td>
                        <td>
                            <input type="hidden" name="taxon_name" value={filters.selectedTaxonName} />
                            <Autocomplete<TaxonId>
                                provider={taxonProvider}
                                cacheKey={0}
                                clearOnSelect={false}
                                onSelect={(taxon) => filters.setSelectedTaxonName(taxon?.nameLat ?? "")}
                            />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.includeSubtaxa")}>
                        <td />
                        <td>
                            <input type="checkbox" name="include_subtaxa" value="true" checked={filters.includeSubtaxa} onChange={(e) => filters.setIncludeSubtaxa(e.target.checked)} />&nbsp;
                            {t("atlas.search.form.labels.includeSubtaxa")}
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.originalName")}>
                        <td>{t("atlas.search.form.labels.originalName")}</td>
                        <td>
                            <input type="text" name="taxon_name_original" placeholder={t("atlas.search.form.placeholders.originalName")} className="form-control input-sm" />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.town")}>
                        <td>{t("atlas.search.form.labels.town")}</td>
                        <td>
                            <input type="text" name="town" placeholder={t("atlas.search.form.placeholders.town")} className="form-control input-sm" />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.localityDescription")}>
                        <td>{t("atlas.search.form.labels.locality")}</td>
                        <td>
                            <input type="text" name="locality_description" placeholder={t("atlas.search.form.placeholders.localityDescription")} className="form-control input-sm" />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.localityOrTown")}>
                        <td>{t("atlas.search.form.labels.localityOrTown")}</td>
                        <td>
                            <input type="text" name="locality_or_town" placeholder={t("atlas.search.form.placeholders.localityOrTown")} className="form-control input-sm" />
                        </td>
                    </tr>

                    {isNonVascular && (
                        <tr title={t("atlas.search.form.titles.localityExtra")}>
                            <td>{t("atlas.search.form.labels.localityExtra")}</td>
                            <td>
                                <input type="text" name="localityExtra" placeholder={t("atlas.search.form.placeholders.localityExtra")} className="form-control input-sm" />
                            </td>
                        </tr>
                    )}

                    <tr title={t("atlas.search.form.titles.altitude")}>
                        <td>{t("atlas.search.form.labels.altitude")}</td>
                        <td>
                            <input type="text" name="altitude_min" size={4} maxLength={4} title="min" /> --&nbsp;
                            <input type="text" name="altitude_max" size={4} maxLength={4} title="max" /> m
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.quadrant")}>
                        <td>{t("atlas.search.form.labels.quadrant")}</td>
                        <td>
                            <input type="text" name="quadrant" placeholder={t("atlas.search.form.placeholders.quadrant")} className="form-control input-sm" />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.noMapSquare")}>
                        <td>{t("atlas.search.form.labels.noMapSquare")}</td>
                        <td>
                            <input type="checkbox" name="no_map_square_or_quadrant" />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.buffer")}>
                        <td>{t("atlas.search.form.labels.buffer")}</td>
                        <td>
                            <input type="text" name="buffer" placeholder={t("atlas.search.form.placeholders.buffer")} className="form-control input-sm" />
                        </td>
                    </tr>

                    {isVascular && (
                        <TypeaheadFilterField
                            title={t("atlas.search.form.titles.phytochorion")}
                            label={t("atlas.search.form.labels.phytochorion")}
                            name="phytochorion"
                            value={filters.selectedPhytochorion[0]?.id ?? ""}
                            id="phytochorion"
                            options={options.phytochorionOptions}
                            selected={filters.selectedPhytochorion}
                            onChange={filters.setSelectedPhytochorion}
                            placeholder={t("atlas.search.form.labels.phytochorion")}
                        />
                    )}

                    <tr title={t("atlas.search.form.titles.comment")}>
                        <td>{t("atlas.search.form.labels.comment")}</td>
                        <td>
                            <input
                                type="text"
                                name="comment"
                                placeholder={isVascular
                                    ? t("atlas.search.form.placeholders.commentVascular")
                                    : t("atlas.search.form.placeholders.commentNonVascular")}
                                className="form-control input-sm"
                            />
                        </td>
                    </tr>

                    <tr>
                        <td>{t("atlas.search.form.labels.appComment", {projectName: projectNameText})}</td>
                        <td>
                            <input type="text" name="pladias_comment" placeholder={t("atlas.search.form.placeholders.appComment")} className="form-control input-sm" />
                        </td>
                    </tr>

                    <tr>
                        <td colSpan={2}>
                            <hr />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.finderSurname")}>
                        <td>{t("atlas.search.form.labels.finderSurname")}</td>
                        <td>
                            <input type="text" name="finderSurname" placeholder={t("atlas.search.form.placeholders.finderSurname")} className="form-control" />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.finderName")}>
                        <td>{t("atlas.search.form.labels.finderName")}</td>
                        <td>
                            <input type="text" name="finderName" placeholder={t("atlas.search.form.placeholders.finderName")} className="form-control" />
                        </td>
                    </tr>

                    <tr title={t("atlas.search.form.titles.year")}>
                        <td>{t("atlas.search.form.labels.year")}</td>
                        <td>
                            <input type="text" name="minYear" maxLength={4} size={4} placeholder={t("atlas.search.form.placeholders.year")} /> --&nbsp;
                            <input type="text" name="maxYear" maxLength={4} size={4} placeholder={t("atlas.search.form.placeholders.year")} />
                        </td>
                    </tr>

                    {isNonVascular && (
                        <>
                            <tr>
                                <td colSpan={2}>
                                    <hr />
                                </td>
                            </tr>

                            <tr title={t("atlas.search.form.titles.substrateText")}>
                                <td>{t("atlas.search.form.labels.substrateText")}</td>
                                <td>
                                    <input type="text" name="substrateText" placeholder={t("atlas.search.form.placeholders.substrateText")} className="form-control input-sm" />
                                </td>
                            </tr>

                            <TypeaheadFilterField
                                title={t("atlas.search.form.titles.substrate1")}
                                label={t("atlas.search.form.labels.substrate1")}
                                name="substrate1"
                                value={filters.selectedSubstrate1[0]?.id ?? ""}
                                id="substrate1"
                                options={[]}
                                selected={filters.selectedSubstrate1}
                                onChange={filters.setSelectedSubstrate1}
                                placeholder={t("atlas.search.form.placeholders.substrate1")}
                            />

                            <TypeaheadFilterField
                                title={t("atlas.search.form.titles.substrate2")}
                                label={t("atlas.search.form.labels.substrate2")}
                                name="substrate2"
                                value={filters.selectedSubstrate2[0]?.id ?? ""}
                                id="substrate2"
                                options={[]}
                                selected={filters.selectedSubstrate2}
                                onChange={filters.setSelectedSubstrate2}
                                placeholder={t("atlas.search.form.placeholders.substrate2")}
                            />

                            <tr title={t("atlas.search.form.titles.chemicalData")}>
                                <td>{t("atlas.search.form.labels.chemicalData")}</td>
                                <td>
                                    <input type="text" name="chemicalData" placeholder={t("atlas.search.form.placeholders.chemicalData")} className="form-control input-sm" />
                                </td>
                            </tr>
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
}
