package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import models.User;
import models.UserActivity;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.config.IConfigService;
import service.record.serialization.PageSearchResultSerialization;
import service.search.IPageSearchService;
import service.search.PageSearchResults;
import service.user.ActivityDetails;
import service.user.UserActivityService;
import utils.JsonResult;
import utils.SessionUtils;
import utils.UserUtils;

import javax.inject.Inject;
import java.io.IOException;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Security.Authenticated(Authorized.class)
public class SearchController extends ControllerBase {
    private static final int EXCEL_EXPORT_PAGE_SIZE = 10000;
    private static final int EXCEL_EXPORT_PAGE_SIZE_MAPADMIN = 100000;
    private final Logger logger = LoggerFactory.getLogger(SearchController.class);
    @Inject
    private FormFactory formFactory;
    @Inject
    private IPageSearchService searchService;
    @Inject
    private IConfigService configService;

    public Result search(Http.Request request, Integer page, Integer pageSize, Boolean getCount) {
        Form<SearchForm> searchForm = formFactory.form(SearchForm.class).bindFromRequest(request);
        if (searchForm.hasErrors()) {
            return badRequest(JsonResult.error("Neplatna data vyhledavaciho formulare"));
        }

        SearchForm form = searchForm.get();

        ActivityDetails details = new ActivityDetails();
        details.description = String.format("Export type: %s", form.export_type);
        UserActivityService.recordActivity(request.session(),
            UserActivity.SubmitSearchRequest, details);

        form.projects = retrieveProjectsFromRequest(request);
        User currentUser = SessionUtils.getCurrentUser(request.session());
        Messages messages = getMessages(request);
        if (SearchController.SearchForm.ExportTypeExcel.equals(form.export_type) &&
            currentUser.getContributionProjects().size() == 0) {
            return ok(JsonResult.error(messages.at("Search.UserNotAssignedToAnyProject")));
        }

        try {
            UserActivityService.recordActivity(request.session(), UserActivity.RecordSearch);
            int effectivePageSize = pageSize;
            if (SearchController.SearchForm.ExportTypeExcel.equals(form.export_type)) {
                effectivePageSize = currentUser.isMapAdmin() ? EXCEL_EXPORT_PAGE_SIZE_MAPADMIN : EXCEL_EXPORT_PAGE_SIZE;
            }
            boolean forceGetCount = SearchController.SearchForm.ExportTypeExcel.equals(form.export_type);
            PageSearchResults results = searchService.search(currentUser, form, page, effectivePageSize, forceGetCount || getCount);

            if (SearchController.SearchForm.ExportTypeExcel.equals(form.export_type)) {
                return exportResultsAsExcelSheet(results);
            } else {
                return ok(JsonResult.buildSuccess(results));
            }
        } catch (Exception e) {
            logger.error("Error while processing search request:", e);
            return ok(JsonResult.error(e.getMessage()));
        }
    }

    public Result getRecordsWithCommentsCurrentUser(Http.Request request) {
        return getRecordsWithComments(request, null);
    }

    public Result getRecordsWithComments(Http.Request request, Long commentsOwnerUserId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        User masterAdmin = UserUtils.getMasterAdmin();
        PageSearchResults results = null;
        Long effectiveOwnerUserId = commentsOwnerUserId;
        if (effectiveOwnerUserId == null) {
            effectiveOwnerUserId = currentUser.getId();
        }
        if (currentUser.getId().equals(effectiveOwnerUserId)) {
            results = searchService.getRecordsWithComments(currentUser);
        } else if (masterAdmin.equals(currentUser)) {
            User commentsOwnerUser = User.find().byId(effectiveOwnerUserId);
            results = searchService.getRecordsWithComments(commentsOwnerUser);
        }
        if (results == null) {
            return badRequest(JsonResult.error("User not authorized to view comments"));
        }
        return ok(JsonResult.buildSuccess(results));
    }

    private Integer[] retrieveProjectsFromRequest(Http.Request request) {
        Map<String, String[]> fields = request.body().asFormUrlEncoded();

        if (fields == null) {
            Http.MultipartFormData<play.libs.Files.TemporaryFile> multipart = request.body().asMultipartFormData();
            if (multipart != null) {
                fields = multipart.asFormUrlEncoded();
            }
        }

        if (fields == null) {
            return new Integer[0];
        }

        String[] data = fields.get("project[]");
        if (data == null) {
            data = fields.get("project");
        }
        if (data == null) {
            return new Integer[0];
        }

        List<Integer> result = new ArrayList<Integer>();
        for (String s : data) {
            if (StringUtils.isNotBlank(s))
                result.add(Integer.parseInt(s));
        }
        return result.toArray(new Integer[result.size()]);
    }

    private Result exportResultsAsExcelSheet(PageSearchResults results) throws IOException {
        PipedInputStream inputStream = new PipedInputStream(64 * 1024);
        PipedOutputStream outputStream = new PipedOutputStream(inputStream);
        CompletableFuture.runAsync(() -> {
            try (PipedOutputStream stream = outputStream) {
                PageSearchResultSerialization.serializeToStream(results.getRows(), stream);
            } catch (IOException e) {
                logger.error("Error while streaming excel export", e);
            }
        });

        int exportedRecords = results.getRows().size();
        Integer totalRecords = results.getTotalCount();

        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd");
        String filename = String.format("PladiasExport_%s.xlsx",
            df.format(Calendar.getInstance().getTime()));
        Result response = ok(inputStream)
            .withHeader("Content-disposition", String.format("attachment; filename=%s", filename))
            .withHeader("X-Excel-Records-Exported", String.valueOf(exportedRecords))
            .as("application/x-download");
        if (totalRecords != null) {
            response = response.withHeader("X-Excel-Total-Records", String.valueOf(totalRecords));
        }
        return response;
    }


    public static class SearchForm {
        public static final String ExportTypeExcel = "excel";
        public static final String ExportTypeBrowser = "browser";

        @Required
        public String export_type;
        public String taxon_name;
        public Boolean include_subtaxa;
        public String taxon_name_original;
        public String town;
        public String locality_description;
        public String locality_or_town;

        public Integer license;
        public Integer altitude_min;
        public Integer altitude_max;
        public String quadrant;
        public Integer phytochorion; //phytochorion rowId
        public String comment; //taxonomic note
        public String pladias_comment;
        public String finderName;
        public String finderSurname;
        public Integer minYear;
        public Integer maxYear;
        public String source;
        public Integer herbarium;
        public String herbariumText; //currently used only by nonVascular
        public String institution;
        public Integer[] projects;
        public Integer committerId;
        public String validationStatus;
        public String foreignId;
        public Integer buffer;
        public String sortBy;
        public String sortOrder;
        @play.data.format.Formats.DateTime(pattern = "yyyy-MM-dd")
        public Date dateFromImported;
        @play.data.format.Formats.DateTime(pattern = "yyyy-MM-dd")
        public Date dateToImported;
        @play.data.format.Formats.DateTime(pattern = "yyyy-MM-dd")
        public Date dateFromLastEdit;
        @play.data.format.Formats.DateTime(pattern = "yyyy-MM-dd")
        public Date dateToLastEdit;
        //only used in SearchService2
        public String no_map_square_or_quadrant;
        public String commented;
        public String unresolvedComment;
        public String historyFlag;
        //only used in non-vascular
        public String substrateText;
        public String substrate1;
        public String substrate2;
        public String chemicalData;
        public String localityExtra;

        public String getSortBy() {
            return sortBy;
        }

        public void setSortBy(String sortBy) {
            this.sortBy = sortBy;
        }

        public String getSortOrder() {
            return sortOrder;
        }

        public void setSortOrder(String sortOrder) {
            this.sortOrder = sortOrder;
        }

        public String getExport_type() {
            return export_type;
        }

        public void setExport_type(String export_type) {
            this.export_type = export_type;
        }

        public String getTaxon_name() {
            return taxon_name;
        }

        public void setTaxon_name(String taxon_name) {
            this.taxon_name = taxon_name;
        }

        public Boolean getInclude_subtaxa() {
            return include_subtaxa == null ? Boolean.FALSE : include_subtaxa;
        }

        public void setInclude_subtaxa(Boolean include_subtaxa) {
            this.include_subtaxa = include_subtaxa == null ? Boolean.FALSE : include_subtaxa;
        }

        public String getTaxon_name_original() {
            return taxon_name_original;
        }

        public void setTaxon_name_original(String taxon_name_original) {
            this.taxon_name_original = taxon_name_original;
        }

        public String getTown() {
            return town;
        }

        public void setTown(String town) {
            this.town = town;
        }

        public String getLocality_description() {
            return locality_description;
        }

        public void setLocality_description(String locality_description) {
            this.locality_description = locality_description;
        }

        public String getLocality_or_town() {
            return locality_or_town;
        }

        public void setLocality_or_town(String locality_or_town) {
            this.locality_or_town = locality_or_town;
        }

        public Integer getAltitude_min() {
            return altitude_min;
        }

        public void setAltitude_min(Integer altitude_min) {
            this.altitude_min = altitude_min;
        }

        public Integer getAltitude_max() {
            return altitude_max;
        }

        public void setAltitude_max(Integer altitude_max) {
            this.altitude_max = altitude_max;
        }

        public String getQuadrant() {
            return quadrant;
        }

        public void setQuadrant(String quadrant) {
            this.quadrant = quadrant;
        }

        public Integer getPhytochorion() {
            return phytochorion;
        }

        public void setPhytochorion(Integer phytochorion) {
            this.phytochorion = phytochorion;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }

        public String getPladias_comment() {
            return pladias_comment;
        }

        public void setPladias_comment(String pladias_comment) {
            this.pladias_comment = pladias_comment;
        }

        public String getFinderName() {
            return finderName;
        }

        public void setFinderName(String finderName) {
            this.finderName = finderName;
        }

        public String getFinderSurname() {
            return finderSurname;
        }

        public void setFinderSurname(String finderSurname) {
            this.finderSurname = finderSurname;
        }

        public Integer getMinYear() {
            return minYear;
        }

        public void setMinYear(Integer minYear) {
            this.minYear = minYear;
        }

        public Integer getMaxYear() {
            return maxYear;
        }

        public void setMaxYear(Integer maxYear) {
            this.maxYear = maxYear;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public Integer getHerbarium() {
            return herbarium;
        }

        public void setHerbarium(Integer herbarium) {
            this.herbarium = herbarium;
        }

        public String getHerbariumText() {
            return herbariumText;
        }

        public void setHerbariumText(String herbariumText) {
            this.herbariumText = herbariumText;
        }

        public String getInstitution() {
            return institution;
        }

        public void setInstitution(String institution) {
            this.institution = institution;
        }

        public Integer[] getProjects() {
            return projects;
        }

        public void setProjects(Integer[] projects) {
            this.projects = projects;
        }

        public Integer getCommitterId() {
            return committerId;
        }

        public void setCommitterId(Integer committerId) {
            this.committerId = committerId;
        }

        public String getValidationStatus() {
            return validationStatus;
        }

        public void setValidationStatus(String validationStatus) {
            this.validationStatus = validationStatus;
        }

        public String getForeignId() {
            return this.foreignId;
        }

        public void setForeignId(String foreignId) {
            this.foreignId = foreignId;
        }

        public Integer getBuffer() {
            return buffer;
        }

        public void setBuffer(Integer buffer) {
            this.buffer = buffer;
        }

        public Date getDateFromImported() {
            return dateFromImported;
        }

        public void setDateFromImported(Date dateFromImported) {
            this.dateFromImported = dateFromImported;
        }

        public Date getDateToImported() {
            return dateToImported;
        }

        public void setDateToImported(Date dateToImported) {
            this.dateToImported = dateToImported;
        }

        public Date getDateFromLastEdit() {
            return dateFromLastEdit;
        }

        public void setDateFromLastEdit(Date dateFromLastEdit) {
            this.dateFromLastEdit = dateFromLastEdit;
        }

        public Date getDateToLastEdit() {
            return dateToLastEdit;
        }

        public void setDateToLastEdit(Date dateToLastEdit) {
            this.dateToLastEdit = dateToLastEdit;
        }

        public String getNo_map_square_or_quadrant() {
            return no_map_square_or_quadrant;
        }

        public void setNo_map_square_or_quadrant(String no_map_square_or_quadrant) {
            this.no_map_square_or_quadrant = no_map_square_or_quadrant;
        }

        public String getCommented() {
            return commented;
        }

        public void setCommented(String commented) {
            this.commented = commented;
        }

        public String getUnresolvedComment() {
            return unresolvedComment;
        }

        public void setUnresolvedComment(String unresolvedComment) {
            this.unresolvedComment = unresolvedComment;
        }

        public String getHistoryFlag() {
            return historyFlag;
        }

        public void setHistoryFlag(String historyFlag) {
            this.historyFlag = historyFlag;
        }

        public String getSubstrateText() {
            return substrateText;
        }

        public void setSubstrateText(String substrateText) {
            this.substrateText = substrateText;
        }

        public String getSubstrate1() {
            return substrate1;
        }

        public void setSubstrate1(String substrate1) {
            this.substrate1 = substrate1;
        }

        public String getSubstrate2() {
            return substrate2;
        }

        public void setSubstrate2(String substrate2) {
            this.substrate2 = substrate2;
        }

        public String getChemicalData() {
            return chemicalData;
        }

        public void setChemicalData(String chemicalData) {
            this.chemicalData = chemicalData;
        }

        public Integer getLicense() {
            return license;
        }

        public void setLicense(Integer license) {
            this.license = license;
        }
    }

}

