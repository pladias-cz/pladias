package controllers.atlas;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.ExcelBatchDto;
import models.Batch;
import models.Excel;
import models.User;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.SessionUtils;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Security.Authenticated(Authorized.class)
public class ImportResultsController extends ControllerBase {

    public Result deleteValidated(Http.Request request, long id) {

        User user = SessionUtils.getCurrentUser(request.session());
        if (user == null) {
            return redirect("/login"); //routes.Application.login();
        }
        deleteExcel(id, user);
        return ok();
//         return redirect(routes.ExcelReports.validatedReportByUser());
    }

    private void deleteExcel(long id, User currentUser) {
        Excel excel = Excel.find().byId(id);

        if (currentUser == null || excel == null)
            return;

        Batch batch = excel.getBatch();

        if (batch != null && !batch.getImported() && batch.getAuthor() != null) {
            User author = batch.getAuthor();
            if (currentUser.equals(author)) {
                excel.delete();
            }
        }
    }


    /**
     * Get validated (not imported) reports data for React datatable with pagination, sorting, and filtering
     */
    public Result validatedReportByUser(Http.Request request) {
        try {
            long currentUserId = SessionUtils.getCurrentUserId(request.session());
            if (currentUserId == SessionUtils.InvalidUserId) {
                return redirect("/login");
            }

            // Get pagination parameters
            int page = request.getQueryString("page") != null
                ? Integer.parseInt(request.getQueryString("page")) : 1;
            int pageSize = request.getQueryString("pageSize") != null
                ? Integer.parseInt(request.getQueryString("pageSize")) : 20;

            // Get sorting parameters
            String sortBy = request.getQueryString("sortBy");
            String sortOrder = request.getQueryString("sortOrder");

            // Get filter parameters
            String filenameFilter = request.getQueryString("filenameFilter");
            String importTimestampFromFilter = request.getQueryString("ImportTimestamp:fromFilter");
            String importTimestampToFilter = request.getQueryString("ImportTimestamp:toFilter");

            // Build base query
            io.ebean.Query<Excel> query = Excel.find().query();
            query.fetch("batch");
            query.where().eq("batch.author.id", currentUserId);
            query.where().eq("batch.imported", false);

            // Apply filters
            if (filenameFilter != null && !filenameFilter.isEmpty()) {
                query.where().ilike("filename", "%" + filenameFilter + "%");
            }

            if (importTimestampFromFilter != null && !importTimestampFromFilter.isEmpty()) {
                try {
                    LocalDate fromDateTime = LocalDate.parse(importTimestampFromFilter);
                    Timestamp fromTs = Timestamp.valueOf(fromDateTime.atStartOfDay());
                    query.where().ge("batch.createTimestamp", fromTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }
            if (importTimestampToFilter != null && !importTimestampToFilter.isEmpty()) {
                try {
                    LocalDate toDateTime = LocalDate.parse(importTimestampToFilter);
                    Timestamp toTs = Timestamp.valueOf(toDateTime.atTime(23, 59, 59));
                    query.where().le("batch.createTimestamp", toTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }

            // Apply sorting
            if (sortBy != null && !sortBy.isEmpty()) {
                String sortExpr;
                switch (sortBy) {
                    case "importTimestamp":
                        sortExpr = "batch.createTimestamp";
                        break;
                    case "filename":
                        sortExpr = "filename";
                        break;
                    default:
                        sortExpr = sortBy;
                }
                if ("desc".equalsIgnoreCase(sortOrder)) {
                    sortExpr += " desc";
                }
                query.orderBy(sortExpr);
            } else {
                query.orderBy("batch.createTimestamp desc");
            }

            // Apply pagination
            int offset = (page - 1) * pageSize;
            query.setFirstRow(offset).setMaxRows(pageSize);

            // Execute main query
            List<Excel> entries = query.findList();

            // Get filtered count
            io.ebean.Query<Excel> countQuery = Excel.find().query();
            countQuery.where().eq("batch.author.id", currentUserId);
            countQuery.where().eq("batch.imported", false);

            if (filenameFilter != null && !filenameFilter.isEmpty()) {
                countQuery.where().ilike("filename", "%" + filenameFilter + "%");
            }
            if (importTimestampFromFilter != null && !importTimestampFromFilter.isEmpty()) {
                try {
                    LocalDate fromDateTime = LocalDate.parse(importTimestampFromFilter);
                    Timestamp fromTs = Timestamp.valueOf(fromDateTime.atStartOfDay());
                    countQuery.fetch("batch");
                    countQuery.where().ge("batch.createTimestamp", fromTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }
            if (importTimestampToFilter != null && !importTimestampToFilter.isEmpty()) {
                try {
                    LocalDate toDateTime = LocalDate.parse(importTimestampToFilter);
                    Timestamp toTs = Timestamp.valueOf(toDateTime.atTime(23, 59, 59));
                    countQuery.fetch("batch");
                    countQuery.where().le("batch.createTimestamp", toTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }
            int filteredCount = countQuery.findCount();

            // Get total count
            int totalCount = Excel.find().query()
                .where().eq("batch.author.id", currentUserId)
                .where().eq("batch.imported", false)
                .findCount();

            // Build response
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode dataArray = mapper.createArrayNode();

            for (Excel excel : entries) {
                ExcelBatchDto dto = ExcelBatchDto.fromExcel(excel);
                ObjectNode node = mapper.createObjectNode();
                node.put("id", dto.id());
                node.put("filename", dto.filename() != null ? dto.filename() : "");
                node.put("warningsCount", dto.warningsCount());
                node.put("errorsCount", dto.errorsCount());
                node.put("infosCount", dto.infosCount());
                node.put("recordsCount", dto.recordsCount());
                node.put("batchId", dto.batchId() != null ? dto.batchId() : 0);
                node.put("imported", dto.imported() != null ? dto.imported() : false);
                node.put("importTimestamp", dto.importTimestamp() != null
                    ? dto.importTimestamp().toString() : "");
                node.put("committerId", dto.committerId() != null ? dto.committerId() : 0);
                node.put("committerName", dto.committerName() != null ? dto.committerName() : "");
                node.put("committerEmail", dto.committerEmail() != null ? dto.committerEmail() : "");
                node.put("hasDeletionCode", dto.hasDeletionCode() != null ? dto.hasDeletionCode() : false);
                dataArray.add(node);
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("data", dataArray);
            response.put("filteredCount", filteredCount);
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Error: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Get imported reports data for React datatable with pagination, sorting, and filtering
     */
    public Result importedReportByUser(Http.Request request) {
        try {
            long currentUserId = SessionUtils.getCurrentUserId(request.session());
            if (currentUserId == SessionUtils.InvalidUserId) {
                return redirect("/login");
            }

            // Get pagination parameters
            int page = request.getQueryString("page") != null
                ? Integer.parseInt(request.getQueryString("page")) : 1;
            int pageSize = request.getQueryString("pageSize") != null
                ? Integer.parseInt(request.getQueryString("pageSize")) : 20;

            // Get sorting parameters
            String sortBy = request.getQueryString("sortBy");
            String sortOrder = request.getQueryString("sortOrder");

            // Get filter parameters
            String filenameFilter = request.getQueryString("filenameFilter");
            String importTimestampFromFilter = request.getQueryString("ImportTimestamp:fromFilter");
            String importTimestampToFilter = request.getQueryString("ImportTimestamp:toFilter");

            // Build base query
            io.ebean.Query<Excel> query = Excel.find().query();
            query.fetch("batch");
            query.where().eq("batch.author.id", currentUserId);
            query.where().eq("batch.imported", true);

            // Apply filters
            if (filenameFilter != null && !filenameFilter.isEmpty()) {
                query.where().ilike("filename", "%" + filenameFilter + "%");
            }

            if (importTimestampFromFilter != null && !importTimestampFromFilter.isEmpty()) {
                try {
                    LocalDate fromDateTime = LocalDate.parse(importTimestampFromFilter);
                    Timestamp fromTs = Timestamp.valueOf(fromDateTime.atStartOfDay());
                    query.where().ge("batch.createTimestamp", fromTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }
            if (importTimestampToFilter != null && !importTimestampToFilter.isEmpty()) {
                try {
                    LocalDate toDateTime = LocalDate.parse(importTimestampToFilter);
                    Timestamp toTs = Timestamp.valueOf(toDateTime.atTime(23, 59, 59));
                    query.where().le("batch.createTimestamp", toTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }

            // Apply sorting
            if (sortBy != null && !sortBy.isEmpty()) {
                String sortExpr;
                switch (sortBy) {
                    case "importTimestamp":
                        sortExpr = "batch.createTimestamp";
                        break;
                    case "filename":
                        sortExpr = "filename";
                        break;
                    default:
                        sortExpr = sortBy;
                }
                if ("desc".equalsIgnoreCase(sortOrder)) {
                    sortExpr += " desc";
                }
                query.orderBy(sortExpr);
            } else {
                query.orderBy("batch.createTimestamp desc");
            }

            // Apply pagination
            int offset = (page - 1) * pageSize;
            query.setFirstRow(offset).setMaxRows(pageSize);

            // Execute main query
            List<Excel> entries = query.findList();

            // Get filtered count
            io.ebean.Query<Excel> countQuery = Excel.find().query();
            countQuery.where().eq("batch.author.id", currentUserId);
            countQuery.where().eq("batch.imported", true);

            if (filenameFilter != null && !filenameFilter.isEmpty()) {
                countQuery.where().ilike("filename", "%" + filenameFilter + "%");
            }
            if (importTimestampFromFilter != null && !importTimestampFromFilter.isEmpty()) {
                try {
                    LocalDate fromDateTime = LocalDate.parse(importTimestampFromFilter);
                    Timestamp fromTs = Timestamp.valueOf(fromDateTime.atStartOfDay());
                    countQuery.fetch("batch");
                    countQuery.where().ge("batch.createTimestamp", fromTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }
            if (importTimestampToFilter != null && !importTimestampToFilter.isEmpty()) {
                try {
                    LocalDate toDateTime = LocalDate.parse(importTimestampToFilter);
                    Timestamp toTs = Timestamp.valueOf(toDateTime.atTime(23, 59, 59));
                    countQuery.fetch("batch");
                    countQuery.where().le("batch.createTimestamp", toTs);
                } catch (Exception e) {
                    // Ignore invalid date format
                }
            }
            int filteredCount = countQuery.findCount();

            // Get total count
            int totalCount = Excel.find().query()
                .where().eq("batch.author.id", currentUserId)
                .where().eq("batch.imported", true)
                .findCount();

            // Build response
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode dataArray = mapper.createArrayNode();

            for (Excel excel : entries) {
                ExcelBatchDto dto = ExcelBatchDto.fromExcel(excel);
                ObjectNode node = mapper.createObjectNode();
                node.put("id", dto.id());
                node.put("filename", dto.filename() != null ? dto.filename() : "");
                node.put("warningsCount", dto.warningsCount());
                node.put("errorsCount", dto.errorsCount());
                node.put("infosCount", dto.infosCount());
                node.put("recordsCount", dto.recordsCount());
                node.put("batchId", dto.batchId() != null ? dto.batchId() : 0);
                node.put("imported", dto.imported() != null ? dto.imported() : false);
                node.put("importTimestamp", dto.importTimestamp() != null
                    ? dto.importTimestamp().toString() : "");
                node.put("committerId", dto.committerId() != null ? dto.committerId() : 0);
                node.put("committerName", dto.committerName() != null ? dto.committerName() : "");
                node.put("committerEmail", dto.committerEmail() != null ? dto.committerEmail() : "");
                node.put("hasDeletionCode", dto.hasDeletionCode() != null ? dto.hasDeletionCode() : false);
                dataArray.add(node);
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("data", dataArray);
            response.put("filteredCount", filteredCount);
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Error: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }
}
