package service.excel.terminology;

import excel.ExcelErrorInfo;
import models.Taxon;
import models.TaxonSynonym;
import play.i18n.Messages;
import service.excel.IDocument;
import service.excel.IExcelTableColumns;
import service.excel.ParsedRecordDetails;
import service.excel.impl.DocumentLoadService;
import service.excel.impl.RecordRowProvider;
import service.excel.impl.recordRow.DocumentRowParserBase;
import service.excel.impl.recordRow.NonVascularTerminologyVerificationBuilder;
import service.excel.impl.wrapper.RecordDetailsBuilderBase;
import service.excel.impl.wrapper.TerminologyVerificationRecordWrapperBuilder;

import java.io.IOException;
import java.util.List;

public class SynonymsService {
    private final IDocument doc;
    private final DocumentRowParserBase recordRowBuilder;
    private final RecordDetailsBuilderBase recordWrapperBuilder;
    private final Messages messages;

    private final int taxonColumn;
    private final int origTaxonColumn;

    public SynonymsService(IDocument doc, DocumentRowParserBase builder, Messages messages) {
        this.doc = doc;
        this.recordRowBuilder = builder;
        this.messages = messages;
        this.recordWrapperBuilder =
            new TerminologyVerificationRecordWrapperBuilder(
                new NonVascularTerminologyVerificationBuilder(),
                messages);
        taxonColumn = recordRowBuilder.getColumn(IExcelTableColumns.TAXON_COLUMN_ID);
        origTaxonColumn = recordRowBuilder.getColumn(IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID);
    }

    public Iterable<ParsedRecordDetails> build() throws IOException {
        DocumentLoadService service = new DocumentLoadService(recordWrapperBuilder);
        RecordRowProvider recordRowProvider = new RecordRowProvider(doc, recordRowBuilder);
        Iterable<ParsedRecordDetails> wrappers = service.loadRecords(recordRowProvider);
        resolveTaxons(wrappers);
        return wrappers;
    }

    private void resolveTaxons(Iterable<ParsedRecordDetails> wrappers) {
        //columns order:
		/* IExcelTableColumns.ERROR_REPORT_COLUMN_ID,
		   IExcelTableColumns.INFO_REPORT_COLUMN_ID,
		   IExcelTableColumns.WARNING_REPORT_COLUMN_ID */

        for (ParsedRecordDetails wrapper : wrappers) {
            resolveTaxon(wrapper);
        }
    }

    private void resolveTaxon(ParsedRecordDetails wrapper) {
        String inputTaxon = wrapper.getRecordRow().get(taxonColumn);
        Taxon taxon = Taxon.find().query().where().ieq("nameLat", inputTaxon).findOne();
        List<TaxonSynonym> taxonSynonyms = TaxonSynonym.find().query().where().ieq("nameLat", inputTaxon).findList();

        computeTaxonDetails(wrapper, inputTaxon, taxon, taxonSynonyms);

        computeOriginalTaxonDetails(wrapper, inputTaxon, taxon, taxonSynonyms);

        if (notDefined(taxon)) {
            computeStatusMessage(wrapper, inputTaxon, taxonSynonyms);
        }
    }

    private void computeStatusMessage(
        ParsedRecordDetails wrapper, String inputTaxon, List<TaxonSynonym> taxonSynonyms) {
        TaxonSynonymsStatus status = computeTaxonSynonymsStatus(taxonSynonyms);
        buildStatusDetails(wrapper, status);
    }

    private void computeOriginalTaxonDetails(ParsedRecordDetails wrapper, String inputTaxon, Taxon taxon,
                                             List<TaxonSynonym> taxonSynonyms) {
        if (oneSynonymMatches(taxonSynonyms)) {
            TaxonSynonym synonym = taxonSynonyms.getFirst();
            Taxon referenceTaxon = synonym.getTaxon();
            String text = inputTaxon + " - " + referenceTaxon.getNameLat();
            wrapper.addInfo(buildReport(wrapper, text));
        } else {
            String origTaxonName = wrapper.getRecordRow().get(origTaxonColumn);
            wrapper.addInfo(buildReport(wrapper, origTaxonName));
        }
    }

    private void computeTaxonDetails(ParsedRecordDetails wrapper, String inputTaxon, Taxon taxon, List<TaxonSynonym> taxonSynonyms) {
        ExcelErrorInfo errorInfo = null;
        if (notDefined(taxon, taxonSynonyms) || multipleSynonyms(taxonSynonyms)) {
            errorInfo = buildReport(wrapper, inputTaxon);
        } else if (oneSynonymMatches(taxonSynonyms)) {
            TaxonSynonym synonym = taxonSynonyms.getFirst();
            Taxon referenceTaxon = synonym.getTaxon();
            errorInfo = buildReport(wrapper, referenceTaxon.getNameLat());
        } else if (taxon != null) {
            errorInfo = buildReport(wrapper, inputTaxon);
        }

        if (errorInfo != null) {
            wrapper.addError(errorInfo);
        }
    }

    private boolean oneSynonymMatches(List<TaxonSynonym> taxonSynonyms) {
        return taxonSynonyms.size() == 1;
    }

    private boolean multipleSynonyms(List<TaxonSynonym> taxonSynonyms) {
        return taxonSynonyms.size() > 1;
    }

    private boolean notDefined(Taxon taxon) {
        return taxon == null;
    }

    private boolean notDefined(Taxon taxon, List<TaxonSynonym> synonyms) {
        return notDefined(taxon) && synonyms.isEmpty();
    }

    private void buildStatusDetails(ParsedRecordDetails wrapper, TaxonSynonymsStatus status) {
        long row = wrapper.getRowNumber();
        String message = getStatusMessage(status);
        ExcelErrorInfo errorInfo = new ExcelErrorInfo(row, 0, message);
        wrapper.addWarning(errorInfo);
    }

    private String getStatusMessage(TaxonSynonymsStatus status) {
        String message = switch (status) {
            case Changed -> messages.at("SynonymsService.ChangedTaxon");
            case Duplicate -> messages.at("SynonymsService.DuplicateTaxon");
            case NotFound -> messages.at("SynonymsService.NotFound");
        };
        return message;
    }

    private ExcelErrorInfo buildReport(ParsedRecordDetails wrapper, String taxonName) {
        long row = wrapper.getRowNumber();
        return new ExcelErrorInfo(row, 0, taxonName);
    }

    private TaxonSynonymsStatus computeTaxonSynonymsStatus(List<TaxonSynonym> taxonSynonyms) {
        return switch (taxonSynonyms.size()) {
            case 0 -> TaxonSynonymsStatus.NotFound;
            case 1 -> TaxonSynonymsStatus.Changed;
            default -> TaxonSynonymsStatus.Duplicate;
        };
    }

    enum TaxonSynonymsStatus {
        Changed,
        Duplicate,
        NotFound
    }
}
