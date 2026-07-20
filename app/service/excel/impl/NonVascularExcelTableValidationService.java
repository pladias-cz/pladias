package service.excel.impl;

import excel.ExcelErrorInfo;
import models.District;
import models.Phytochorion;
import models.Project;
import models.Record;
import play.i18n.Messages;
import service.config.IConfigService;
import service.excel.ErrorType;
import service.excel.IExcelTableColumns;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;
import service.phytochorion.PhytochorionService;

public class NonVascularExcelTableValidationService extends AbstractExcelTableValidationService {

    public NonVascularExcelTableValidationService(IRecordColumnMapper colMapper,
                                                  PhytochorionService phytochorionService, Project project, Messages messages, IConfigService configService) {
        super(colMapper, phytochorionService, project, messages, configService);
    }

    @Override
    protected void validateCustom(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();

        if (record.hasCoords()) {
            computePhyto(record);
            computeDistrict(record);
            validateCoordsInsideRegion(wrapper);
        } else {
            wrapper.addError(new ExcelErrorInfo(wrapper.getRecordRow().getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.GPS_COORDS_COLUMN_ID),
                messages.at("ExcelTableValidationService.gpsCoordsMissing")));
        }

        validateHerbariumHasAuthor(wrapper, ErrorType.ERROR);

    }

    private void validateCoordsInsideRegion(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        if (!record.hasCoords()) {
            return;
        }

        if (!District.liesWithinTopRegion(record.getCoords())) {
            wrapper.addError(new ExcelErrorInfo(wrapper.getRecordRow().getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.GPS_COORDS_COLUMN_ID),
                messages.at("ExcelTableValidationService.gpsCoordsOutOfBounds")));
        }
    }

    private void computeDistrict(Record record) {
        District district = District.findDistrictByPoint(record.getCoords());
        record.setDistrict(district);
    }

    private void computePhyto(Record record) {
        Phytochorion phytochorion = phytochorionService.findByPoint(record.getCoords());
        record.setPhytochorion(phytochorion);
    }
}
