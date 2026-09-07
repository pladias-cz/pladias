package controllers.atlas;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.ExcelBatchDto;
import global.ServerConstants;
import io.ebean.DB;
import io.ebean.SqlUpdate;
import mail.MailAttachment;
import mail.MailMessageBuilder;
import mail.MailService;
import models.Batch;
import models.Excel;
import models.User;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Workbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.export.table.TableExportWriter;
import service.record.serialization.ModifiedRecordsExportService;
import utils.ExcelUtils;
import utils.JsonResult;
import utils.SessionUtils;

import javax.inject.Inject;
import javax.mail.MessagingException;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Security.Authenticated(Authorized.class)
public class MapAdminImportController extends ControllerBase {

    private static final int DeletionCodeLength = 25;

    private final Logger _logger = LoggerFactory.getLogger(MapAdminImportController.class);
    private final ModifiedRecordsExportService modifiedRecordsExportService = new ModifiedRecordsExportService();

    @Inject
    private MailService _mailService;

    /**
     * Get imports data for React datatable with pagination, sorting, and filtering.
     *
     * <p>The table data and the export of the very same rows are answered by this endpoint: the
     * client asks for the XLSX variant by sending the XLSX media type in the {@code Accept}
     * header. Pagination is applied only when both {@code page} and {@code pageSize} are
     * present, so an export request (which sends neither) receives all filtered rows.</p>
     */
    public Result getImports(Http.Request request) {
        try {
            // Authorization check
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isMapAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Get pagination parameters - without them the whole filtered list is returned
            boolean paginated = request.getQueryString("page") != null
                && request.getQueryString("pageSize") != null;
            int page = paginated ? Integer.parseInt(request.getQueryString("page")) : 1;
            int pageSize = paginated ? Integer.parseInt(request.getQueryString("pageSize")) : 0;

            // Build and execute main query
            io.ebean.Query<models.Excel> query = buildImportsQuery(request);
            if (paginated) {
                query.setFirstRow((page - 1) * pageSize).setMaxRows(pageSize);
            }
            List<ExcelBatchDto> imports = ExcelBatchDto.fromExcelList(query.findList());

            if (TableExportWriter.acceptsXlsx(request)) {
                byte[] workbook = TableExportWriter.write(
                    "imports", ExcelBatchDto.exportColumns(), imports, getMessages(request));
                String filename = String.format("attachment; filename=%s",
                    "imports_" + LocalDate.now() + ".xlsx");
                return ok(workbook).withHeader("Content-disposition", filename).as("application/x-download");
            }

            // Get number of rows matching the filters and total number of imported files
            int filteredCount = countFilteredImports(request);
            int totalCount = models.Excel.find().query()
                .where().eq("batch.imported", true)
                .findCount();

            // Build response
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode dataArray = mapper.createArrayNode();

            for (ExcelBatchDto importDto : imports) {
                ObjectNode node = mapper.createObjectNode();
                node.put("id", importDto.id());
                node.put("filename", importDto.filename() != null ? importDto.filename() : "");
                node.put("warningsCount", importDto.warningsCount());
                node.put("errorsCount", importDto.errorsCount());
                node.put("infosCount", importDto.infosCount());
                node.put("recordsCount", importDto.recordsCount());

                if (importDto.batchId() != null) {
                    node.put("batchId", importDto.batchId());
                    node.put("imported", importDto.imported());
                    node.put("importTimestamp", importDto.importTimestamp() != null
                        ? importDto.importTimestamp().toString() : "");

                    if (importDto.committerId() != null) {
                        node.put("committerId", importDto.committerId());
                        node.put("committerName", importDto.committerName() != null
                            ? importDto.committerName() : "");
                        node.put("committerEmail", importDto.committerEmail() != null
                            ? importDto.committerEmail() : "");
                    }

                    node.put("hasDeletionCode", importDto.hasDeletionCode());
                }

                dataArray.add(node);
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("data", dataArray);
            response.put("filteredCount", filteredCount);
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("pageSize", paginated ? pageSize : imports.size());
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            _logger.error("Error fetching imports", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Error: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Query over imported excel files, filtered and sorted the way the React datatable requested them.
     */
    private io.ebean.Query<models.Excel> buildImportsQuery(Http.Request request) {
        io.ebean.Query<models.Excel> query = models.Excel.find().query();
        query.fetch("batch").fetch("batch.committer");
        applyImportsFilters(query, request);
        applyImportsSorting(query, request);
        return query;
    }

    /**
     * Number of rows the React datatable shows for the filters of the request.
     */
    private int countFilteredImports(Http.Request request) {
        io.ebean.Query<models.Excel> countQuery = models.Excel.find().query();
        applyImportsFilters(countQuery, request);
        return countQuery.findCount();
    }

    private void applyImportsFilters(io.ebean.Query<models.Excel> query, Http.Request request) {
        // Get filter parameters
        String committerNameFilter = request.getQueryString("CommitterNameFilter");

        String importTimestampFromFilter = request.getQueryString("ImportTimestamp:fromFilter");
        String importTimestampToFilter = request.getQueryString("ImportTimestamp:toFilter");

        query.where().eq("batch.imported", true);

        if (committerNameFilter != null && !committerNameFilter.isEmpty()) {
            query.where().or()
                .ilike("batch.committer.name", "%" + committerNameFilter + "%")
                .ilike("batch.committer.surname", "%" + committerNameFilter + "%");
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
    }

    private void applyImportsSorting(io.ebean.Query<models.Excel> query, Http.Request request) {
        // Get sorting parameters
        String sortBy = request.getQueryString("sortBy");
        String sortOrder = request.getQueryString("sortOrder");

        if (sortBy != null && !sortBy.isEmpty()) {
            String sortExpr = switch (sortBy) {
                case "committerName" -> "batch.committer.name";
                case "importTimestamp" -> "batch.createTimestamp";
                case "batchId" -> "batch.id";
                case "filename" -> "filename";
                case "recordsCount" -> "records";
                default -> sortBy;
            };
            if ("desc".equalsIgnoreCase(sortOrder)) {
                sortExpr += " desc";
            }
            query.orderBy(sortExpr);
        } else {
            query.orderBy("batch.createTimestamp desc");
        }
    }

    public Result downloadBatchModified(Http.Request request, Long batchId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (!currentUser.isMapAdmin()) {
            return ok("error");
        }

        try {
            Messages messages = getMessages(request);
            return doDownloadBatchModifiedEntries(messages, batchId);
        } catch (Exception e) {
            _logger.error("Exception while preparing batch modified entries", e);
        }
        return ok("error");
    }

    private Result doDownloadBatchModifiedEntries(Messages messages, Long batchId) throws IOException {
        Workbook wb = modifiedRecordsExportService.serializeModifiedBatchEntries(batchId, messages);
        String filename = String.format("attachment; filename=%s", String.format("Batch%d_modifikace.xls", batchId));
        return ok(ExcelUtils.toInputStream(wb))
            .withHeader("Content-disposition", filename)
            .as("application/xls");
    }

    private String generateMessageContents(Messages messages, Batch batch, Excel excel) throws MessagingException {
        String hostname = ServerConstants.getHostname();
        String batchDeletionUrl =
            String.format("%s://%s//api/react/atlasadmin/deleteBatch/%d/password/%s",
                ServerConstants.Protocol, hostname,
                batch.getId(), batch.getDeletionCode());

        return messages.at("ImportsManager.batchDeletionEmail",
            hostname,
            excel.getFilename(), batch.getCreateTimestamp(), batchDeletionUrl);
    }

    private Batch populateBatchWithDeletionCode(Long batchId) {
        Batch batch = Batch.find().byId(batchId);
        String deletionCode = RandomStringUtils.randomNumeric(DeletionCodeLength);
        batch.setDeletionCode(deletionCode);
        batch.update();
        return batch;
    }

    public Result completeDeletion(Http.Request request, Long batchId, String password) {
        Batch batch = Batch.find().byId(batchId);
        Messages messages = getMessages(request);
        User currentUser = SessionUtils.getCurrentUser(request.session());

        if (batch == null) {
            return redirect("/react/atlasAdmin/imports")
                .flashing("success", messages.at("ImportsManager.batchNotExists"));
        }

        if (!batch.getCommitter().getId().equals(currentUser.getId())) {
            return redirect("/react/atlasAdmin/imports")
                .flashing("success", messages.at("ImportsManager.notAuthorizedToDeleteBatch"));
        }
        if (StringUtils.isBlank(password) || !password.equals(batch.getDeletionCode())) {
            return redirect("/react/atlasAdmin/imports")
                .flashing("success", messages.at("ImportsManager.incorrectPassword"));

        }

        StringBuilder buffer = new StringBuilder();
        buffer.append("BEGIN;")
            .append("delete from atlas.users_comments UC where exists ")
            .append("(select 1 from atlas.records R INNER JOIN atlas.comments C on R.id = C.record_id ")
            .append("  WHERE  R.batch_id = :batch_id AND C.id =  UC.comments_id")
            .append(");")
            .append("delete from atlas.records_history RH where RH.record_id in ")
            .append("  (select id from atlas.records R where R.batch_id = :batch_id);")
            .append("delete from atlas.comments C where exists ")
            .append("  (select 1 from atlas.records R where R.batch_id = :batch_id AND C.record_id = R.id);")
            .append("delete from atlas.records_history RH where exists")
            .append("  (select 1 from atlas.records R where R.batch_id = :batch_id and RH.record_id = R.id);")
            .append("delete from atlas.records where batch_id = :batch_id;")
            .append("delete from atlas.excel where batch_id = :batch_id;")
            .append("delete from atlas.batch where id = :batch_id;")
            .append("delete from atlas.records_herbariums RH where not exists (select 1 from atlas.records R where R.id = RH.records_id);")
            .append("delete from atlas.records_quadrants RQ where not exists (select 1 from atlas.records R where R.id = RQ.records_id);")
            .append("delete from atlas.records_authors RA where not exists (select 1 from atlas.records R where R.id = RA.records_id);")
            .append("COMMIT;");

        SqlUpdate query = DB.sqlUpdate(buffer.toString());
        query.setParameter("batch_id", batchId);
        query.execute();
        return redirect("/react/atlasAdmin/imports")
            .flashing("success", messages.at("ImportsManager.batchDeleted"));

    }

    public Result prepareDeletion(Http.Request request, Long batchId) {
        try {
            Messages messages = getMessages(request);
            Workbook digestWorkBook = modifiedRecordsExportService.serializeModifiedBatchEntries(batchId, messages);

            Batch batch = populateBatchWithDeletionCode(batchId);
            Excel importedExcel = Excel.find().query().where().eq("batch.id", batchId).findOne();

            MailMessageBuilder builder = new MailMessageBuilder();
            builder.setSubject("Mazani davky PLADIAS");
            builder.setContents(generateMessageContents(messages, batch, importedExcel));
            MailAttachment origXlsAttachment = new MailAttachment(ExcelUtils.serializeWorkbook(digestWorkBook), "application/xls", String.format("Batch%d_modifications.xls", batchId));
            builder.addAttachment(origXlsAttachment);

            InputStream is = importedExcel.getProcessedFileInputStream();
            MailAttachment processedXlsAttachment = new MailAttachment(IOUtils.toByteArray(is), "application/xls", importedExcel.getVersionDecoratedFilename());

            builder.addAttachment(processedXlsAttachment);

            builder.addRecipient(batch.getCommitter().getEmail());
            _mailService.sendMail(builder.build());

            batch.update();
        } catch (Exception e) {
            _logger.info("Error while preparing batch deletion", e);
            return ok(JsonResult.error(e.getMessage()));
        }
        return ok(JsonResult.buildSuccess());
    }
}
