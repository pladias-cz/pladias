package service.excel.impl;

import com.google.inject.Inject;
import models.Project;
import play.i18n.Messages;
import repositories.ISquareRepository;
import service.config.IConfigService;
import service.excel.IExcelTableValidationService;
import service.excel.IExcelTableValidationServiceFactory;
import service.excel.IRecordColumnMapper;
import service.phytochorion.PhytochorionService;

import java.util.ArrayList;
import java.util.List;

public class ExcelTableValidationServiceFactory implements IExcelTableValidationServiceFactory {
    private final ISquareRepository _squareRepository;
    private final PhytochorionService _phytochorionService;
    private final IConfigService _configService;

    @Inject
    public ExcelTableValidationServiceFactory(
        ISquareRepository squareRepository, PhytochorionService phytochorionService, IConfigService configService) {
        _squareRepository = squareRepository;
        _phytochorionService = phytochorionService;
        _configService = configService;
    }

    @Override
    public List<IExcelTableValidationService> getExcelValidationServices(IRecordColumnMapper colMapper, Project project,
                                                                         Messages messages) {
        if (_configService.isVascular()) {
            return getVascularServices(colMapper, project, messages);
        }
        return getNonVascularServices(colMapper, project, messages);
    }

    private List<IExcelTableValidationService> getNonVascularServices(IRecordColumnMapper colMapper,
                                                                      Project project, Messages messages) {
        List<IExcelTableValidationService> validationServices =
            new ArrayList<IExcelTableValidationService>();

        validationServices.add(new NonVascularExcelTableValidationService(
            colMapper, _phytochorionService, project, messages, _configService));
        validationServices.add(new DuplicationValidationServiceNonVascular(colMapper, messages));
        return validationServices;
    }

    private List<IExcelTableValidationService> getVascularServices(IRecordColumnMapper colMapper, Project project,
                                                                   Messages messages) {
        List<IExcelTableValidationService> validationServices = new ArrayList<IExcelTableValidationService>();

        validationServices.add(new VascularExcelTableValidationService(
            _squareRepository, colMapper, _phytochorionService, project, messages, _configService));
        validationServices.add(new DuplicationValidationServiceVascular(colMapper, messages));
        return validationServices;
    }
}
