package service.excel;

import models.Batch;
import models.Project;
import models.User;

public interface IExcelTableImportService {

    void prepareImport(Iterable<ParsedRecordDetails> wrappers, Batch batch, Project project);

    void executeImport(Iterable<ParsedRecordDetails> wrappers, User currentUser);

}
