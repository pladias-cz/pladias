import {type FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useInstanceConfig} from "@/context/InstanceConfigContext";
import {useProjectName} from "@/context/ProjectNameContext";
import {useUser} from "@/context/UserContext";
import {Typeahead} from "react-bootstrap-typeahead";
import {Autocomplete} from "@/components/autocomplete/Autocomplete";
import {createTaxaImportableProvider} from "@/components/autocomplete/TaxaImportableProvider";
import {PladiasRecordsTable} from "@/components/atlas/mapDetail/PladiasRecordsTable";
import BulkEdit from "@/components/atlas/search/BulkEdit";
import type { RecordPladias } from "@/models";
import type {TaxonId} from "@/models/TaxonId";
import "./SearchForm.css";

type ProjectOption = {
    id: number;
    name: string;
    abbrev?: string;
};

type PhytochorionOption = {
    rowid: number;
    name: string;
};

type HerbariumOption = {
    id: number;
    name: string;
    translationKey?: string;
};

type InstitutionOption = {
    id: string;
    name: string;
};

type CommitterOption = {
    id: number;
    name: string;
};

type LicenseOption = {
    id: number;
    key: string;
};

type HistoryFlagOption = {
    value: string;
};

type TypeaheadOption = {
    id: string | number;
    label: string;
};

type SearchApiPayload = {
    records?: RecordPladias[];
    totalCount?: number | null;
};

const DEFAULT_PAGE_SIZE = 50;
const EXCEL_EXPORT_PAGE_SIZE = 100000;
const EXCEL_EXPORT_TYPE = "excel";

export default function SearchForm() {
    const {t} = useTranslation();
    const user = useUser();
    const config = useInstanceConfig() as {isVascular?: boolean};
    const {projectName} = useProjectName() as {projectName?: string};

    const isVascular = Boolean(config.isVascular);
    const isNonVascular = !isVascular;

    const projectNameText = (projectName ?? "Pladias").trim() || "Pladias";
    const [submitMessage, setSubmitMessage] = useState<string>("");
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [herbariums, setHerbariums] = useState<HerbariumOption[]>([]);
    const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
    const [committers, setCommitters] = useState<CommitterOption[]>([]);
    const [licenses, setLicenses] = useState<LicenseOption[]>([]);
    const [historyFlags, setHistoryFlags] = useState<HistoryFlagOption[]>([]);
    const [phytochorions, setPhytochorions] = useState<PhytochorionOption[]>([]);
    const [records, setRecords] = useState<RecordPladias[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [lastPayloadEntries, setLastPayloadEntries] = useState<Array<[string, FormDataEntryValue]>>([]);
    const [sortBy, setSortBy] = useState<string | null>("taxonName");
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [sortDescending, setSortDescending] = useState<boolean>(false);
    const [selectedTaxonName, setSelectedTaxonName] = useState<string>("");
    const [selectedPhytochorion, setSelectedPhytochorion] = useState<TypeaheadOption[]>([]);
    const [selectedSubstrate1, setSelectedSubstrate1] = useState<TypeaheadOption[]>([]);
    const [selectedSubstrate2, setSelectedSubstrate2] = useState<TypeaheadOption[]>([]);
    const [selectedHerbarium, setSelectedHerbarium] = useState<TypeaheadOption[]>([]);
    const [selectedInstitution, setSelectedInstitution] = useState<TypeaheadOption[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<TypeaheadOption[]>([]);
    const [selectedCommitter, setSelectedCommitter] = useState<CommitterOption[]>([]);
    const [selectedValidationStatus, setSelectedValidationStatus] = useState<TypeaheadOption[]>([]);
    const [selectedHistoryFlag, setSelectedHistoryFlag] = useState<TypeaheadOption[]>([]);
    const [selectedLicense, setSelectedLicense] = useState<TypeaheadOption[]>([]);
    const [includeSubtaxa, setIncludeSubtaxa] = useState<boolean>(true);

    const hasRecords = records.length > 0;
    const canUseBulkEdit = user.isMapAdmin || user.isBulkEditor;

    const totalPages = useMemo(() => (
        totalCount != null ? Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE)) : null
    ), [totalCount]);

    const canGoPrev = currentPage > 1 && !isLoading;
    const canGoNext = totalPages != null ? currentPage < totalPages && !isLoading : records.length === DEFAULT_PAGE_SIZE && !isLoading;

    const visiblePages = useMemo(() => {
        if (totalPages == null) {
            return [] as number[];
        }

        const maxVisible = 7;
        const half = Math.floor(maxVisible / 2);
        let start = Math.max(1, currentPage - half);
        const end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        const pages: number[] = [];
        for (let page = start; page <= end; page += 1) {
            pages.push(page);
        }
        return pages;
    }, [currentPage, totalPages]);

    const getExportTypeFromPayload = useCallback((payloadEntries: Array<[string, FormDataEntryValue]>) => {
        const exportTypeEntry = payloadEntries.find(([key]) => key === "export_type");
        return typeof exportTypeEntry?.[1] === "string" ? exportTypeEntry[1] : "browser";
    }, []);

    const getFileNameFromDisposition = useCallback((contentDisposition: string | null) => {
        if (!contentDisposition) {
            return "PladiasExport.xlsx";
        }

        const utf8Name = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Name?.[1]) {
            return decodeURIComponent(utf8Name[1]);
        }

        const simpleName = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
        if (simpleName?.[1]) {
            return simpleName[1];
        }

        return "PladiasExport.xlsx";
    }, []);

    const downloadFile = useCallback((blob: Blob, fileName: string) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
    }, []);

    const excelExportTitle = useMemo(() => {
        if (user.isMapAdmin) {
            return t("atlas.search.form.excelExportTitleAdmin");
        }
        return t("atlas.search.form.excelExportTitleRestricted");
    }, [t, user.isMapAdmin]);

    const taxonProvider = useMemo(
        () => createTaxaImportableProvider(t("atlas.search.form.taxonAutocompletePlaceholder")),
        [t]
    );

    const phytochorionOptions = useMemo<TypeaheadOption[]>(() => (
        phytochorions.map((phytochorion) => ({id: phytochorion.rowid, label: phytochorion.name}))
    ), [phytochorions]);

    const herbariumOptions = useMemo<TypeaheadOption[]>(() => (
        herbariums.map((herbarium) => ({
            id: herbarium.id,
            label: herbarium.translationKey ? t(herbarium.translationKey) : herbarium.name,
        }))
    ), [herbariums, t]);

    const institutionOptions = useMemo<TypeaheadOption[]>(() => (
        institutions.map((institution) => ({id: institution.id, label: institution.name}))
    ), [institutions]);

    const projectOptions = useMemo<TypeaheadOption[]>(() => (
        projects.map((project) => ({id: project.id, label: project.name}))
    ), [projects]);

    const committerOptions = useMemo<TypeaheadOption[]>(() => (
        committers.map((committer) => ({id: committer.id, label: committer.name}))
    ), [committers]);

    const validationStatusOptions = useMemo<TypeaheadOption[]>(() => ([
        {id: 3, label: t("atlas.search.form.options.validationValid")},
        {id: 2, label: t("atlas.search.form.options.validationInvalid")},
        {id: 1, label: t("atlas.search.form.options.validationUncertain")},
        {id: 0, label: t("atlas.search.form.options.validationNotValidated")},
    ]), [t]);

    const historyFlagOptions = useMemo<TypeaheadOption[]>(() => (
        historyFlags.map((flag) => ({id: flag.value, label: flag.value}))
    ), [historyFlags]);

    const substrate1Options = useMemo<TypeaheadOption[]>(() => ([]), []);
    const substrate2Options = useMemo<TypeaheadOption[]>(() => ([]), []);
    const licenseOptions = useMemo<TypeaheadOption[]>(() => (
        licenses.map((license) => ({id: license.id, label: license.key}))
    ), [licenses]);
    const sortOptions = useMemo(() => [
        {value: "taxonName", label: t("atlas.search.form.sortOptions.taxonName")},
        {value: "locality", label: t("atlas.search.form.sortOptions.locality")},
        {value: "nearestTownName", label: t("atlas.search.form.sortOptions.nearestTownName")},
        {value: "date", label: t("atlas.search.form.sortOptions.date")},
        {value: "validationStatus", label: t("atlas.search.form.sortOptions.validationStatus")},
        {value: "square", label: t("atlas.search.form.sortOptions.square")},
        ...(isVascular ? [{value: "phytochorion", label: t("atlas.search.form.sortOptions.phytochorion")}] : []),
    ], [isVascular, t]);

    useEffect(() => {
        let isMounted = true;

        const loadProjects = async () => {
            try {
                const response = await fetch("/api/react/occurrence/projects");
                const data = await response.json();

                if (!response.ok || data?.success === false || !Array.isArray(data?.data)) {
                    return;
                }

                if (isMounted) {
                    setProjects(data.data as ProjectOption[]);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        const loadHerbariums = async () => {
            try {
                const response = await fetch("/api/react/atlas/common/herbariums");
                const data = await response.json();

                if (!response.ok || data?.success === false || !Array.isArray(data?.data)) {
                    return;
                }

                if (isMounted) {
                    setHerbariums(data.data as HerbariumOption[]);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        const loadInstitutions = async () => {
            try {
                const response = await fetch("/api/react/atlas/common/institutions");
                const data = await response.json();

                if (!response.ok || data?.success === false || !Array.isArray(data?.data)) {
                    return;
                }

                if (isMounted) {
                    setInstitutions(data.data as InstitutionOption[]);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        const loadCommitters = async () => {
            try {
                const response = await fetch("/api/react/atlas/common/committers");
                const data = await response.json();

                if (!response.ok || data?.success === false || !Array.isArray(data?.data)) {
                    return;
                }

                if (isMounted) {
                    setCommitters(data.data as CommitterOption[]);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        const loadLicenses = async () => {
            try {
                const response = await fetch("/api/react/atlas/common/licenses");
                const data = await response.json();

                if (!response.ok || data?.success === false || !Array.isArray(data?.data)) {
                    return;
                }

                if (isMounted) {
                    setLicenses(data.data as LicenseOption[]);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        const loadHistoryFlags = async () => {
            try {
                const response = await fetch("/api/react/atlas/common/history-flags");
                const data = await response.json();

                if (!response.ok || data?.success === false || !Array.isArray(data?.data)) {
                    return;
                }

                if (isMounted) {
                    setHistoryFlags(data.data as HistoryFlagOption[]);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        const loadPhytochorions = async () => {
            try {
                const response = await fetch("/api/react/atlas/common/phytochorions");
                const data = await response.json();

                if (!response.ok || data?.success === false || !Array.isArray(data?.data)) {
                    return;
                }

                if (isMounted) {
                    setPhytochorions(data.data as PhytochorionOption[]);
                }
            } catch {
                // Keep the select usable with default empty option when loading fails.
            }
        };

        loadProjects();
        loadHerbariums();
        loadInstitutions();
        loadCommitters();
        loadLicenses();
        loadHistoryFlags();
        loadPhytochorions();

        return () => {
            isMounted = false;
        };
    }, []);

    const fetchSearchPage = useCallback(async (
        page: number,
        getCount: boolean,
        payloadEntries: Array<[string, FormDataEntryValue]>,
        activeSort?: { sortBy: string | null; sortOrder: 'asc' | 'desc' }
    ) => {
        const effectiveSort = activeSort ?? {sortBy, sortOrder};
        const formData = new FormData();
        for (const [key, value] of payloadEntries) {
            formData.append(key, value);
        }
        if (effectiveSort.sortBy) {
            formData.append('sortBy', effectiveSort.sortBy);
            formData.append('sortOrder', effectiveSort.sortOrder);
        }

        const exportType = getExportTypeFromPayload(payloadEntries);
        const pageSize = exportType === EXCEL_EXPORT_TYPE ? EXCEL_EXPORT_PAGE_SIZE : DEFAULT_PAGE_SIZE;
        const getCountParam = exportType === EXCEL_EXPORT_TYPE ? true : getCount;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/react/atlas/search/page/${page}/pageSize/${pageSize}/getCount/${getCountParam}`, {
                method: "POST",
                body: formData,
            });

            if (exportType === EXCEL_EXPORT_TYPE) {
                const contentType = response.headers.get("content-type") || "";

                if (contentType.includes("application/json")) {
                    const errorData = await response.json();
                    setSubmitMessage(errorData.message || t("atlas.search.form.searchFailed"));
                    return false;
                }

                if (!response.ok) {
                    setSubmitMessage(t("atlas.search.form.searchFailed"));
                    return false;
                }

                const recordsExported = parseInt(response.headers.get("X-Excel-Records-Exported") || "0", 10);
                const totalRecords = response.headers.get("X-Excel-Total-Records");
                const fileName = getFileNameFromDisposition(response.headers.get("content-disposition"));
                const fileBlob = await response.blob();
                downloadFile(fileBlob, fileName);

                if (totalRecords != null) {
                    const total = parseInt(totalRecords, 10);
                    if (recordsExported >= total) {
                        setSubmitMessage(t("atlas.search.form.excelExportedAll", {
                            recordsCount: recordsExported,
                        }));
                    } else {
                        setSubmitMessage(t("atlas.search.form.excelExportedPartial", {
                            exported: recordsExported,
                            total: total,
                        }));
                    }
                } else {
                    setSubmitMessage("");
                }
                return true;
            }

            const data = await response.json();
            if (!response.ok || data.success === false) {
                setSubmitMessage(data.message || t("atlas.search.form.searchFailed"));
                return false;
            }

            const payload: SearchApiPayload = data?.data ?? data;
            const nextRecords = Array.isArray(payload?.records) ? payload.records : [];
            setRecords(nextRecords);

            if (getCount) {
                setTotalCount(typeof payload?.totalCount === "number" ? payload.totalCount : null);
            }

            const effectiveTotal = getCount
                ? (typeof payload?.totalCount === "number" ? payload.totalCount : nextRecords.length)
                : (totalCount ?? nextRecords.length);
            setSubmitMessage(t("atlas.search.form.foundRecords", {
                recordsCount: nextRecords.length,
                totalCount: effectiveTotal,
            }));
            return true;
        } catch {
            setSubmitMessage(t("atlas.search.form.submitFailed"));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [downloadFile, getExportTypeFromPayload, getFileNameFromDisposition, sortBy, sortOrder, t, totalCount]);

    const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formElement = event.currentTarget;
        const formData = new FormData(formElement);
        const payloadEntries = Array.from(formData.entries());

        setSubmitMessage("");
        setLastPayloadEntries(payloadEntries);
        const firstPage = 1;
        const loaded = await fetchSearchPage(firstPage, true, payloadEntries, {sortBy, sortOrder});
        if (loaded) {
            setCurrentPage(firstPage);
        }
    };

    const handlePageChange = async (nextPage: number) => {
        if (nextPage < 1 || lastPayloadEntries.length === 0) {
            return;
        }

        const loaded = await fetchSearchPage(nextPage, false, lastPayloadEntries, {sortBy, sortOrder});
        if (loaded) {
            setCurrentPage(nextPage);
        }
    };

    const handleSortChange = useCallback(async (nextSortBy: string | null, nextSortOrder: 'asc' | 'desc' = 'asc') => {
        const resolvedSortBy = nextSortBy ?? "taxonName";
        setSortBy(resolvedSortBy);
        setSortOrder(nextSortOrder);

        if (lastPayloadEntries.length === 0) {
            return;
        }

        const loaded = await fetchSearchPage(1, true, lastPayloadEntries, {sortBy: resolvedSortBy, sortOrder: nextSortOrder});
        if (loaded) {
            setCurrentPage(1);
        }
    }, [fetchSearchPage, lastPayloadEntries]);

    const handleNewSearch = () => {
        setRecords([]);
        setCurrentPage(1);
        setTotalCount(null);
        setSubmitMessage("");
        setSortBy("taxonName");
        setSortOrder('asc');
        setSortDescending(false);
        setSelectedTaxonName("");
        setIncludeSubtaxa(true);
        setSelectedPhytochorion([]);
        setSelectedSubstrate1([]);
        setSelectedSubstrate2([]);
        setSelectedHerbarium([]);
        setSelectedInstitution([]);
        setSelectedProjects([]);
        setSelectedCommitter([]);
        setSelectedValidationStatus([]);
        setSelectedHistoryFlag([]);
        setSelectedLicense([]);
    };

    return (
        <>
            <div id="searchRecordsFormView" className="pladiasView" />

            {!hasRecords && (
            <form id="searchForm" className="form-horizontal" onSubmit={handleSearchSubmit}>
                <div className="row">
                    <div className="col-md-2 offset-md-3">
                        <button type="submit" name="extended_search" className="btn btn-primary btn-lg" disabled={isLoading}>
                            {isLoading && (
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                            )}
                            {isLoading ? t("atlas.search.form.processingRequest") : t("atlas.search.form.submit")}
                        </button>
                        {submitMessage && <div className="text-muted mt-2 small">{submitMessage}</div>}
                        {isLoading && <div className="text-muted mt-2 small">{t("atlas.search.form.waitingForData")}</div>}
                        <br />
                    </div>
                    <div className="btn-group col-md-4" role="group">
                        <div className="radio-inline">
                            <label>
                                <input type="radio" name="export_type" value="browser" defaultChecked />
                                {t("atlas.search.form.exportBrowser")}
                            </label>
                        </div>
                        <div className="radio-inline">
                            <label>
                                <a
                                    tabIndex={0}
                                    role="button"
                                    data-bs-toggle="popover"
                                    data-bs-placement="bottom"
                                    data-bs-trigger="focus"
                                    data-bs-html="true"
                                    title={excelExportTitle}
                                >
                                    <input type="radio" name="export_type" value="excel" />
                                </a>
                                {t("atlas.search.form.exportExcel")}
                            </label>
                        </div>
                    </div>
                </div>

                <div className="row">
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
                                        <input type="hidden" name="taxon_name" value={selectedTaxonName} />
                                        <Autocomplete<TaxonId>
                                            provider={taxonProvider}
                                            cacheKey={0}
                                            clearOnSelect={false}
                                            onSelect={(taxon) => setSelectedTaxonName(taxon?.nameLat ?? "")}
                                        />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.includeSubtaxa")}>
                                    <td />
                                    <td>
                                        <input type="checkbox" name="include_subtaxa" value="true" checked={includeSubtaxa} onChange={(e) => setIncludeSubtaxa(e.target.checked)} />&nbsp;
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

                                <tr title={t("atlas.search.form.titles.noMapSquare") }>
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
                                    <tr title={t("atlas.search.form.titles.phytochorion")}>
                                        <td>{t("atlas.search.form.labels.phytochorion")}</td>
                                        <td>
                                            <input type="hidden" name="phytochorion" value={selectedPhytochorion[0]?.id ?? ""} />
                                            <Typeahead
                                                id="phytochorion"
                                                labelKey="label"
                                                onChange={(selected) => setSelectedPhytochorion(selected as TypeaheadOption[])}
                                                options={phytochorionOptions}
                                                placeholder={t("atlas.search.form.labels.phytochorion")}
                                                selected={selectedPhytochorion}
                                                clearButton
                                            />
                                        </td>
                                    </tr>
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

                                        <tr title={t("atlas.search.form.titles.substrate1")}>
                                            <td>{t("atlas.search.form.labels.substrate1")}</td>
                                            <td>
                                                <input type="hidden" name="substrate1" value={selectedSubstrate1[0]?.id ?? ""} />
                                                <Typeahead
                                                    id="substrate1"
                                                    labelKey="label"
                                                    onChange={(selected) => setSelectedSubstrate1(selected as TypeaheadOption[])}
                                                    options={substrate1Options}
                                                    placeholder={t("atlas.search.form.placeholders.substrate1")}
                                                    selected={selectedSubstrate1}
                                                    clearButton
                                                />
                                            </td>
                                        </tr>

                                        <tr title={t("atlas.search.form.titles.substrate2")}>
                                            <td>{t("atlas.search.form.labels.substrate2")}</td>
                                            <td>
                                                <input type="hidden" name="substrate2" value={selectedSubstrate2[0]?.id ?? ""} />
                                                <Typeahead
                                                    id="substrate2"
                                                    labelKey="label"
                                                    onChange={(selected) => setSelectedSubstrate2(selected as TypeaheadOption[])}
                                                    options={substrate2Options}
                                                    placeholder={t("atlas.search.form.placeholders.substrate2")}
                                                    selected={selectedSubstrate2}
                                                    clearButton
                                                />
                                            </td>
                                        </tr>

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

                    <div className="col-xl-6">
                        <table id="form_part2">
                            <tbody>
                                <tr>
                                    <th />
                                    <th />
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

                                <tr title={t("atlas.search.form.titles.herbarium")}>
                                    <td>{t("atlas.search.form.labels.herbarium")}</td>
                                    <td>
                                        {isNonVascular ? (
                                            <input type="text" name="herbariumText" placeholder={t("atlas.search.form.placeholders.herbariumText")} className="form-control input-sm" />
                                        ) : (
                                            <>
                                                <input type="hidden" name="herbarium" value={selectedHerbarium[0]?.id ?? ""} />
                                                <Typeahead
                                                    id="herbarium"
                                                    labelKey="label"
                                                    onChange={(selected) => setSelectedHerbarium(selected as TypeaheadOption[])}
                                                    options={herbariumOptions}
                                                    placeholder={t("atlas.search.form.labels.herbarium")}
                                                    selected={selectedHerbarium}
                                                    clearButton
                                                />
                                            </>
                                        )}
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.institution")}>
                                    <td>{t("atlas.search.form.labels.institution")}</td>
                                    <td>
                                        <input type="hidden" name="institution" value={selectedInstitution[0]?.id ?? ""} />
                                        <Typeahead
                                            id="institution"
                                            labelKey="label"
                                            onChange={(selected) => setSelectedInstitution(selected as TypeaheadOption[])}
                                            options={institutionOptions}
                                            placeholder={t("atlas.search.form.placeholders.institution")}
                                            selected={selectedInstitution}
                                            clearButton
                                        />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.project")}>
                                    <td>{t("atlas.search.form.labels.project")}</td>
                                    <td>
                                        {selectedProjects.map((project) => (
                                            <input key={project.id} type="hidden" name="project[]" value={project.id} />
                                        ))}
                                        <Typeahead
                                            id="project"
                                            labelKey="label"
                                            multiple
                                            onChange={(selected) => setSelectedProjects(selected as TypeaheadOption[])}
                                            options={projectOptions}
                                            placeholder={t("atlas.search.form.placeholders.project")}
                                            selected={selectedProjects}
                                            clearButton
                                        />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.committer", {projectName: projectNameText})}>
                                    <td>{t("atlas.search.form.labels.committer")}</td>
                                    <td>
                                        <input type="hidden" name="committerId" value={selectedCommitter[0]?.id ?? -1} />
                                        <Typeahead
                                            id="committerId"
                                            labelKey="label"
                                            onChange={(selected) => setSelectedCommitter(selected as CommitterOption[])}
                                            options={committerOptions}
                                            placeholder={t("atlas.search.form.labels.committer")}
                                            selected={selectedCommitter}
                                            clearButton
                                        />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.validation")}>
                                    <td>{t("atlas.search.form.labels.validation")}</td>
                                    <td>
                                        <input type="hidden" name="validationStatus" value={selectedValidationStatus[0]?.id ?? -1} />
                                        <Typeahead
                                            id="validationStatus"
                                            labelKey="label"
                                            onChange={(selected) => setSelectedValidationStatus(selected as TypeaheadOption[])}
                                            options={validationStatusOptions}
                                            placeholder={t("atlas.search.form.labels.validation")}
                                            selected={selectedValidationStatus}
                                            clearButton
                                        />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.history")}>
                                    <td>{t("atlas.search.form.labels.history")}</td>
                                    <td>
                                        <input type="hidden" name="historyFlag" value={selectedHistoryFlag[0]?.id ?? ""} />
                                        <Typeahead
                                            id="historyFlag"
                                            labelKey="label"
                                            onChange={(selected) => setSelectedHistoryFlag(selected as TypeaheadOption[])}
                                            options={historyFlagOptions}
                                            placeholder={t("atlas.search.form.labels.history")}
                                            selected={selectedHistoryFlag}
                                            clearButton
                                        />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.importDate", {projectName: projectNameText})}>
                                    <td>{t("atlas.search.form.labels.importDate")}</td>
                                    <td>
                                        <label htmlFor="fromImported">{t("atlas.search.form.from")}</label>&nbsp;
                                        <input type="date" id="fromImported" name="dateFromImported" />&nbsp;
                                        <label htmlFor="toImported">{t("atlas.search.form.to")}</label>&nbsp;
                                        <input type="date" id="toImported" name="dateToImported" />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.lastEditDate", {projectName: projectNameText})}>
                                    <td>{t("atlas.search.form.labels.lastEditDate")}</td>
                                    <td>
                                        <label htmlFor="fromChanged">{t("atlas.search.form.from")}</label>&nbsp;
                                        <input type="date" id="fromChanged" name="dateFromLastEdit" />&nbsp;
                                        <label htmlFor="toChanged">{t("atlas.search.form.to")}</label>&nbsp;
                                        <input type="date" id="toChanged" name="dateToLastEdit" />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.license")}>
                                    <td>{t("atlas.search.form.labels.license")}</td>
                                    <td>
                                        <input type="hidden" name="license" value={selectedLicense[0]?.id ?? ""} />
                                        <Typeahead
                                            id="license"
                                            labelKey="label"
                                            onChange={(selected) => setSelectedLicense(selected as TypeaheadOption[])}
                                            options={licenseOptions}
                                            placeholder={t("atlas.search.form.placeholders.license")}
                                            selected={selectedLicense}
                                            clearButton
                                        />
                                    </td>
                                </tr>

                                <tr title={t("atlas.search.form.titles.externalId")}>
                                    <td>{t("atlas.search.form.labels.externalId")}</td>
                                    <td>
                                        <input type="text" name="foreignId" placeholder={t("atlas.search.form.placeholders.externalId")} className="form-control input-sm" />
                                    </td>
                                </tr>

                                <tr>
                                    <td />
                                    <td>
                                        <hr />
                                        <input type="checkbox" name="commented" id="commentedCheckbox1" value="true" />&nbsp;
                                        {t("atlas.search.form.onlyCommented", {projectName: projectNameText})}
                                        <br />
                                        <input type="checkbox" name="unresolvedComment" id="unresolvedCheckbox1" value="true" />&nbsp;
                                        {t("atlas.search.form.onlyUnresolvedPrefix", {projectName: projectNameText})} <b>{t("atlas.search.form.onlyUnresolvedBold")}</b> {t("atlas.search.form.onlyUnresolvedSuffix", {projectName: projectNameText})}
                                        <br />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </form>
            )}

            {hasRecords && (
                <div className="mt-4">
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled={!canGoPrev}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            {t("atlas.search.grid.previous")}
                        </button>

                        {visiblePages.map((pageNumber) => (
                            <button
                                key={pageNumber}
                                type="button"
                                className={`btn btn-sm ${pageNumber === currentPage ? "btn-primary" : "btn-outline-secondary"}`}
                                disabled={isLoading || pageNumber === currentPage}
                                onClick={() => handlePageChange(pageNumber)}
                            >
                                {pageNumber}
                            </button>
                        ))}

                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled={!canGoNext}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            {t("atlas.search.grid.next")}
                        </button>

                        <span className="small text-muted ms-2">
                            {totalPages != null
                                ? t("atlas.search.grid.pageOf", {page: currentPage, totalPages})
                                : t("atlas.search.grid.page", {page: currentPage})}
                        </span>
                        {totalCount != null && (
                            <span className="small text-muted">
                                {t("atlas.search.grid.totalFound", {totalCount})}
                            </span>
                        )}
                        {isLoading && <span className="small text-muted">{t("common.loading")}</span>}

                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm ms-auto"
                            disabled={isLoading}
                            onClick={handleNewSearch}
                        >
                            {t("atlas.search.grid.newSearch")}
                        </button>
                    </div>

                    <div className="w-100 mt-3">
                        <label htmlFor="recordsSortSelect" className="form-label mb-1">
                            {t("atlas.search.form.sortLabel")}
                        </label>
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <select
                                id="recordsSortSelect"
                                className="form-select form-select-sm"
                                style={{maxWidth: 280}}
                                value={sortBy ?? "taxonName"}
                                onChange={(event) => {
                                    void handleSortChange(event.target.value || "taxonName", sortDescending ? 'desc' : 'asc');
                                }}
                                disabled={isLoading}
                            >
                                {sortOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <div className="form-check">
                                <input
                                    id="recordsSortDescending"
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={sortDescending}
                                    onChange={(event) => {
                                        const nextDescending = event.target.checked;
                                        setSortDescending(nextDescending);
                                        if (sortBy) {
                                            void handleSortChange(sortBy, nextDescending ? 'desc' : 'asc');
                                        }
                                    }}
                                    disabled={isLoading || !sortBy}
                                />
                                <label className="form-check-label" htmlFor="recordsSortDescending">
                                    {t("atlas.search.form.sortDescending")}
                                </label>
                            </div>
                        </div>
                    </div>

                    <PladiasRecordsTable
                        records={records}
                        showTaxonName={true}
                    />

                    {canUseBulkEdit && <BulkEdit records={records} totalCount={totalCount} />}
                </div>
            )}

        </>
    );
}
