package service.excel.impl;

import excel.ExcelErrorInfo;
import models.*;
import models.Record;
import platform.ProjectConstants;
import play.i18n.Messages;
import service.config.IConfigService;
import service.excel.*;
import service.phytochorion.PhytochorionService;

import java.util.List;

public abstract class AbstractExcelTableValidationService implements IExcelTableValidationService {
    protected final IRecordColumnMapper colMapper;
    protected final Messages messages;
    protected final PhytochorionService phytochorionService;
    protected final Project project;

    protected final IConfigService _configService;

    public AbstractExcelTableValidationService(IRecordColumnMapper colMapper,
                                               PhytochorionService phytochorionService, Project project, Messages messages, IConfigService configService) {
        this.colMapper = colMapper;
        this.phytochorionService = phytochorionService;
        this.project = project;
        this.messages = messages;
        this._configService = configService;
    }

    @Override
    public void validateAll(Iterable<ParsedRecordDetails> wrappers) {
        for (ParsedRecordDetails rw : wrappers) {
            validate(rw);
        }
    }

    @Override
    public void validate(ParsedRecordDetails wrapper) {
        validateHasCoords(wrapper);
        validateTaxonNotLocked(wrapper);
        validateTaxonNotSuppressed(wrapper);

        validateAltitude(wrapper);

        validateCustom(wrapper);
    }

    private void validateHasCoords(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        if (!record.hasCoords()) {
            String errorMessage = messages.at("ExcelTableValidationService.missingCoords");
            wrapper.addError(
                new ExcelErrorInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.GPS_COORDS_COLUMN_ID), errorMessage));
        }
    }

    protected abstract void validateCustom(ParsedRecordDetails wrapper);

    private void validateAltitude(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        if (record.getAltitudeMin() != null && record.getAltitudeMax() != null) {
            if (record.getAltitudeMin() < _configService.getInteger(ProjectConstants.CheckMinAltitudeKey) ||
                record.getAltitudeMax() > _configService.getInteger(ProjectConstants.CheckMaxAltitudeKey)) {
                String errorMessage = messages.at("ExcelTableValidationService.altitudeOutOfRange");
                wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.ALTITUDE_COLUMN_ID), errorMessage));
            }
        }
    }

    protected void validateHerbariumHasAuthor(ParsedRecordDetails wrapper, ErrorType resultErrorType) {
        Record record = wrapper.getRecord();
        List<Herbarium> herbariums = record.getHerbariums();
        List<Author> authors = record.getAuthorsSorted();

        if (herbariums == null || herbariums.isEmpty())
            return;

        if (authors == null || authors.isEmpty()) {
            generateHerbariumAuthorRelationError(wrapper, resultErrorType);
        }
    }

    private void generateHerbariumAuthorRelationError(ParsedRecordDetails wrapper, ErrorType resultErrorType) {

        String descMessage = (resultErrorType == ErrorType.ERROR)
            ? messages.at("ExcelTableValidationService.herbariumRequiresFinder")
            : messages.at("ExcelTableValidationService.provideHerbariumFinderIfAvailable");
        ExcelErrorInfo errorInfo = new ExcelErrorInfo(wrapper.getRowNumber(),
            colMapper.getColumn(IExcelTableColumns.SOURCE_COLUMN_ID), descMessage);
        if (resultErrorType == ErrorType.ERROR) {
            wrapper.addError(errorInfo);
        } else {
            wrapper.addWarning(errorInfo);
        }
    }

    private void validateTaxonNotLocked(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        Taxon taxon = record.getTaxon();
        if (taxon == null)
            return;
        TaxonMapSettings settings = taxon.getTaxonMapSettings();
        if (settings != null && settings.isLocked()) {
            wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.TAXON_COLUMN_ID),
                messages.at("RecordEditController.taxonIsLockedDueToMapPreviewGeneration")));
        }
    }

    private void validateTaxonNotSuppressed(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        Taxon taxon = record.getTaxon();
        if (taxon == null)
            return;
        if (taxon.isSuppressed()) {
            wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.TAXON_COLUMN_ID),
                messages.at("Taxon.isSuppressed")));
        }
    }
}
