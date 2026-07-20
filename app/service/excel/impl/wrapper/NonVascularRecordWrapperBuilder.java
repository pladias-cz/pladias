package service.excel.impl.wrapper;

import excel.ExcelErrorInfo;
import models.Herbarium;
import models.Record;
import models.nonvascular.NonVascularRecordExtension;
import models.nonvascular.Substrate1;
import models.nonvascular.Substrate2;
import org.apache.commons.lang3.StringUtils;
import play.i18n.Messages;
import service.excel.IExcelTableColumns;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;
import service.excel.impl.recordRow.RecordRow;
import utils.MapSquareResolver;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class NonVascularRecordWrapperBuilder extends SharedRecordWrapperBuilder {
    private static final int MaxHerbariumAbbrevLength = 64;

    public NonVascularRecordWrapperBuilder(MapSquareResolver squareResolver, IRecordColumnMapper colMapper, Messages messages) {
        super(squareResolver, colMapper, messages);
    }

    @Override
    protected ParsedRecordDetails populateCustomDetails(Record item, RecordRow recordRow,
                                                        List<ExcelErrorInfo> errors,
                                                        List<ExcelErrorInfo> warnings,
                                                        List<ExcelErrorInfo> infos) {
        resolveNonVascularHerbariums(recordRow, item, errors);
        resolveNonVascularSource(recordRow, item);
        resolveForeignId(recordRow, item);
        resolveLicense(recordRow, item, errors);

        NonVascularRecordExtension nonVascularRecord = new NonVascularRecordExtension();

        resolveSubstrateNote(nonVascularRecord, recordRow);
        resolveChemical(nonVascularRecord, recordRow);
        Substrate1 substrate1 = resolveSubstrate1(nonVascularRecord, recordRow, errors);
        resolveSubstrate2(nonVascularRecord, substrate1, recordRow, errors);
        resolveAuxiliaryLocality(nonVascularRecord, recordRow);
        return new ParsedRecordDetails(item, recordRow, nonVascularRecord, errors, warnings, infos);
    }

    private void resolveAuxiliaryLocality(NonVascularRecordExtension nonVascularRecord, RecordRow recordRow) {
        if (!colMapper.containsColumn(IExcelTableColumns.LOCALITY_AUXILIARY_COLUMN_ID))
            return;

        int column = colMapper.getColumn(IExcelTableColumns.LOCALITY_AUXILIARY_COLUMN_ID);
        String input = recordRow.get(column);

        nonVascularRecord.setLocalityExtra(input);
    }

    private void resolveNonVascularHerbariums(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        if (!colMapper.containsColumn(IExcelTableColumns.HERBARIUM_COLUMN_ID))
            return;

        int column = colMapper.getColumn(IExcelTableColumns.HERBARIUM_COLUMN_ID);
        String input = recordRow.get(column);

        if (StringUtils.isBlank(input))
            return;

        input = input.trim();

        if (input.length() > MaxHerbariumAbbrevLength) {
            String message = messages.at("NonVascularRecordWrapperBuilder.HerbariumTooLong", MaxHerbariumAbbrevLength);
            errors.add(createErrorInfo(recordRow, column, message));
            return;
        }

        Herbarium herbarium = Herbarium.findByAbbrev(input);
        if (herbarium == null) {
            herbarium = new Herbarium();
            herbarium.setAbbrev(input);
            herbarium.setName(input);
            herbarium.setImportId(input);
        }
        herbarium.save();
        List<Herbarium> herbList = new ArrayList<Herbarium>();
        herbList.add(herbarium);
        item.setHerbariums(herbList);
    }

    private void resolveNonVascularSource(RecordRow recordRow, Record item) {
        int column = colMapper.getColumn(IExcelTableColumns.SOURCE_COLUMN_ID);
        String input = recordRow.get(column);

        item.setSource(input);
    }

    private Substrate1 resolveSubstrate1(NonVascularRecordExtension nonVascularRecord,
                                         RecordRow recordRow, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.SUBSTRATE1_COLUMN_ID);
        String input = recordRow.get(column);

        if (StringUtils.isEmpty(input))
            return null;

        Optional<Substrate1> substrate1 = Substrate1.FindByKeyCz(input);
        if (substrate1.isPresent()) {
            nonVascularRecord.setSubstrate1(substrate1.get());
            return substrate1.get();
        }

        String message = messages.at("NonVascularRecordWrapperBuilder.Substrate1Invalid");
        errors.add(createErrorInfo(recordRow, column, message));
        return null;
    }

    private void resolveSubstrate2(NonVascularRecordExtension nonVascularRecord,
                                   Substrate1 substrate1, RecordRow recordRow, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.SUBSTRATE2_COLUMN_ID);
        String input = recordRow.get(column);

        if (StringUtils.isEmpty(input))
            return;

        if (substrate1 == null) {
            String message = messages.at("NonVascularRecordWrapperBuilder.Substrate1NeededForSubstrate2");
            errors.add(createErrorInfo(recordRow, column, message));
            return;
        }

        Optional<Substrate2> substrate2 = Substrate2.FindByKeyCzAndSubstrate1(input, substrate1);
        if (substrate2.isPresent())
            nonVascularRecord.setSubstrate2(substrate2.get());
        else {
            String message = messages.at("NonVascularRecordWrapperBuilder.Substrate2Invalid");
            errors.add(createErrorInfo(recordRow, column, message));
        }
    }

    private void resolveSubstrateNote(NonVascularRecordExtension nonVascularRecord, RecordRow recordRow) {
        int column = colMapper.getColumn(IExcelTableColumns.SUBSTRATE_NOTE_COLUMN_ID);
        String input = recordRow.get(column);
        if (StringUtils.isNotEmpty(input)) {
            //optional field
            nonVascularRecord.setSubstrate(input);
        }
    }

    private void resolveChemical(NonVascularRecordExtension nonVascularRecord, RecordRow recordRow) {
        int column = colMapper.getColumn(IExcelTableColumns.CHEMICAL_DATA_COLUMN_ID);
        String input = recordRow.get(column);
        if (StringUtils.isNotEmpty(input)) {
            //optional field
            nonVascularRecord.setChemical(input);
        }
    }
}
