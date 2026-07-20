package service.excel;

import models.Project;
import play.i18n.Messages;

import java.util.List;

public interface IExcelTableValidationServiceFactory {
    List<IExcelTableValidationService> getExcelValidationServices(IRecordColumnMapper colMapper, Project project,
                                                                  Messages messages);
}
