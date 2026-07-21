package service.excel.impl;

import com.google.common.collect.Iterators;
import io.ebean.DB;
import io.ebean.Transaction;
import models.*;
import models.Record;
import models.nonvascular.NonVascularRecordExtension;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.db.Database;
import service.config.IConfigService;
import service.excel.IExcelTableImportService;
import service.excel.ParsedRecordDetails;
import sql.SqlExecutor;

import javax.inject.Inject;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class ExcelTableImportService implements IExcelTableImportService {
    private final Logger _logger = LoggerFactory.getLogger(ExcelTableImportService.class);

    private final SqlExecutor _sqlExecutor;
    private final IConfigService _configService;

    @Inject
    public ExcelTableImportService(Database database, IConfigService configService) {
        _sqlExecutor = new SqlExecutor(database);
        _configService = configService;
    }

    @Override
    public void prepareImport(Iterable<ParsedRecordDetails> wrappers, Batch batch, Project project) {
        Set<Taxon> supervisedTaxons = batch.getCommitter().getSupervisedTaxons();
        for (ParsedRecordDetails wrapper : wrappers) {
            prepareImport(wrapper.getRecord(), batch, project, supervisedTaxons);
        }
    }

    @Override
    public void executeImport(final Iterable<ParsedRecordDetails> wrappers, User currentUser) {
        doExecuteImport(wrappers, currentUser);
        doCleanup();
    }

    private void doCleanup() {
        try {
            String[] tables = new String[]
                {
                    Record.QualifiedTableName, Batch.QualifiedTableName,
                    Author.QualifiedTableName, Excel.QualifiedTableName
                };
            for (String table : tables) {
                _sqlExecutor.executeCommand("VACUUM " + table);
            }
        } catch (SQLException ex) {
            _logger.error("Failed to complete DB cleanup");
        }
    }

    private void doExecuteImport(final Iterable<ParsedRecordDetails> wrappers, User currentUser) {
        _logger.info(String.format("Executing record import by user %s %s", currentUser.getName(), currentUser.getSurname()));

        try (Transaction transaction = DB.beginTransaction()) {
            for (ParsedRecordDetails wrapper : wrappers) {
                Record record = wrapper.getRecord();
                DB.save(record);
                if (wrapper.getNonVascularExtension() != null) {
                    NonVascularRecordExtension extension = wrapper.getNonVascularExtension();
                    extension.setRecordId(record.getId());
                    DB.save(extension);
                }
                saveRecordAuthors(record);
            }

            List<RecordHistory> histories = new ArrayList<>();
            for (ParsedRecordDetails wrapper : wrappers) {
                Record r = wrapper.getRecord();
                if (r.getValidationStatusId() == RecordValidationStatus.Accepted) {
                    histories.add(RecordHistory.build(
                        r.getId(), currentUser, RecordChangeType.FLAG, "validation_status",
                        /*oldValue=*/ "Unprocessed", /*newCalue=*/"Accepted"));
                }
                if (r.isIncludedInMap()) {
                    histories.add(RecordHistory.build(
                        r.getId(), currentUser, RecordChangeType.FLAG, "include_in_map",
                        /*oldValue=*/ Boolean.FALSE.toString(), /*newCalue=*/Boolean.TRUE.toString()));
                }
                if (r.isHerbariumQuality()) {
                    histories.add(RecordHistory.build(
                        r.getId(), currentUser, RecordChangeType.FLAG, "herbarium_quality",
                        /*oldValue=*/ Boolean.FALSE.toString(), /*newCalue=*/Boolean.TRUE.toString()));
                }
            }

            for (RecordHistory rh : histories) {
                rh.save();
            }

            transaction.commit();
            _logger.info(String.format("%d records imported, %d record history entries saved", Iterators.size(wrappers.iterator()), histories.size()));
        } catch (Exception e) {
            _logger.error("Import failed", e);
            throw e;
        }
    }

    private void saveRecordAuthors(Record record) {
        if (!record.getRecordAuthors().isEmpty()) {

            for (RecordAuthor ra : record.getRecordAuthors()) {
                if (ra.getAuthor().getId() == 0) {
                    DB.save(ra.getAuthor());

                }
                ra.setAuthor(ra.getAuthor());
                ra.setRecord(record);
                DB.save(ra);
            }
        }
    }

    private void autovalidateRecordIfEligible(Record record, Set<Taxon> supervisedTaxons, Project project) {
        if (_configService.isVascular() && project.getId() != Project.AtlasExcerptionProjectId)
            return;

        Taxon t = record.getTaxon();
        boolean taxonSupervised = t.isDescendant(supervisedTaxons);
        if (taxonSupervised && herbariumRequirementsForAutovalidationFulfilled(record)) {
            record.setValidationStatusId(RecordValidationStatus.Accepted);
            record.setIncludedInMap(true);

            if (!record.getHerbariums().isEmpty()) {
                record.setHerbariumQuality(true);
            }
        }
    }

    private boolean herbariumRequirementsForAutovalidationFulfilled(Record record) {
        if (_configService.isNonVascular())
            return true;

        return !record.getHerbariums().isEmpty();
    }

    private void prepareImport(Record record, Batch batch, Project project, Set<Taxon> supervisedTaxons) {
        record.setBatch(batch);
        record.setProject(project);
        autovalidateRecordIfEligible(record, supervisedTaxons, project);
    }
}
