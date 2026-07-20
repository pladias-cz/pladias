package service.excel.impl.wrapper;

import com.google.common.collect.ImmutableSet;
import excel.ExcelErrorInfo;
import helpers.parsers.HerbariumListParser;
import models.*;
import models.Record;
import org.apache.commons.lang3.StringUtils;
import play.i18n.Messages;
import service.excel.IExcelTableColumns;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;
import service.excel.impl.recordRow.RecordRow;
import utils.MapSquareResolver;

import java.util.ArrayList;
import java.util.List;

public class VascularRecordWrapperBuilder extends SharedRecordWrapperBuilder {

    public VascularRecordWrapperBuilder(MapSquareResolver squareResolver, IRecordColumnMapper colMapper, Messages messages) {
        super(squareResolver, colMapper, messages);
    }

    protected ParsedRecordDetails populateCustomDetails(Record item, RecordRow recordRow,
                                                        List<ExcelErrorInfo> errors,
                                                        List<ExcelErrorInfo> warnings,
                                                        List<ExcelErrorInfo> infos) {
        resolveSourceOrHerbarium(recordRow, item, errors);
        resolveHerbariums(recordRow, item, errors); // this is only applicable for vascular v2 form
        resolveDistrict(recordRow, item, errors);
        resolveNearestTown(recordRow, item, errors);
        resolvePhytochorion(recordRow, item, errors);
        resolveQuadrant(recordRow, item, errors);
        resolveForeignId(recordRow, item);
        resolveLicense(recordRow, item, errors);

        resolveDetrev(recordRow, item);
        resolveExcerptionRemark(recordRow, item);
        resolveOtherRemark(recordRow, item);
        resolveDoubtRemark(recordRow, item);
        resolveEnviroment(recordRow, item);

        return new ParsedRecordDetails(item, recordRow, null, errors, warnings, infos);
    }

    private void resolveSourceOrHerbarium(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.SOURCE_COLUMN_ID);
        String input = recordRow.get(column);

        List<String> list = HerbariumListParser.parse(input);
        list = ImmutableSet.copyOf(list).asList();

        if (list.size() > 0) {
            List<Herbarium> herbariums = validateOrCreateHerbariumsIfNeeded(list, recordRow, column, errors);
            item.setHerbariums(herbariums);
        } else {
            String normalizedSource = normalizeSpaces(input);
            item.setSource(normalizedSource);
        }
    }

    private void resolveDistrict(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.DISTRICT_COLUMN_ID);
        String name = recordRow.get(column);
        if (StringUtils.isNotEmpty(name)) {
            District district = District.find().query().where().eq("name", name).eq("depth", DistrictType.DISTRICT_ID).findOne();
            if (district != null) {
                item.setDistrict(district);
            } else {
                errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidDistrict")));
            }
        }
    }

    private void resolvePhytochorion(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        String phytochorionId = getStringValue(recordRow, IExcelTableColumns.PHYTOCHORION_COLUMN_ID);
        if (StringUtils.isNotEmpty(phytochorionId)) {
            Phytochorion phytochorion = Phytochorion.find().query().where().eq("phyto_id", phytochorionId).findOne();
            item.setPhytochorion(phytochorion);
        }
    }

    private void resolveQuadrant(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        int column = colMapper.getColumn(IExcelTableColumns.SQUARE_COLUMN_ID);
        String input = recordRow.get(column);
        if (StringUtils.isEmpty(input)) {
            return;
        }
        String[] definitions = input.split(";");
        try {
            MapSquareResolver.SquareData data = squareResolver.resolve(definitions);
            if (!data.squares.isEmpty() || data.quadrants.size() > 1) {
                errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidQuadrantId")));
            }

            List<QuadrantNew> quadrants = new ArrayList<QuadrantNew>();
            quadrants.addAll(data.quadrants);
            item.setQuadrantsLegacy(quadrants);
        } catch (Exception e) {
            errors.add(createErrorInfo(recordRow, column, messages.at("ExcelTableLoadService.invalidQuadrantId")));
        }
    }

    private void resolveNearestTown(RecordRow recordRow, Record item, List<ExcelErrorInfo> errors) {
        String name = getStringValue(recordRow, IExcelTableColumns.NEAREST_TOWN_COLUMN_ID);
        if (StringUtils.isNotEmpty(name)) {
            String normalizedName = normalizeSpaces(name);
            item.setNearestTownText(normalizedName);
        }
    }

    private void resolveOtherRemark(RecordRow recordRow, Record item) {
        String value = getStringValue(recordRow, IExcelTableColumns.REMARK_OTHER_ID);
        if (StringUtils.isNotEmpty(value)) {
            String normalizedRemarkOther = normalizeSpaces(value);
            item.setRemarkOther(normalizedRemarkOther);
        }
    }

    private void resolveEnviroment(RecordRow recordRow, Record item) {
        String value = getStringValue(recordRow, IExcelTableColumns.ENVIRONMENT_ID);
        if (StringUtils.isNotEmpty(value)) {
            String normalizedEnvironment = normalizeSpaces(value);
            item.setEnvironment(normalizedEnvironment);
        }
    }

    private void resolveDoubtRemark(RecordRow recordRow, Record item) {
        String value = getStringValue(recordRow, IExcelTableColumns.REMARK_DOUBT_ID);
        if (StringUtils.isNotEmpty(value)) {
            String normalizedRemarkDoubt = normalizeSpaces(value);
            item.setRemarkDoubt(normalizedRemarkDoubt);
        }
    }

    private void resolveExcerptionRemark(RecordRow recordRow, Record item) {
        String value = getStringValue(recordRow, IExcelTableColumns.REMARK_EXCERPTION_ID);
        if (StringUtils.isNotEmpty(value)) {
            String normalizedRemark = normalizeSpaces(value);
            item.setRemarkExcerption(normalizedRemark);
        }

    }

    private void resolveDetrev(RecordRow recordRow, Record item) {
        String value = getStringValue(recordRow, IExcelTableColumns.DETREV_ID);
        if (StringUtils.isNotEmpty(value)) {
            String normalizedDetrev = normalizeSpaces(value);
            item.setDetrev(normalizedDetrev);
        }
    }

    private String getStringValue(RecordRow recordRow, String columnId) {
        if (!colMapper.containsColumn(columnId)) {
            return "";
        }

        int column = colMapper.getColumn(columnId);
        return recordRow.get(column);
    }

}
