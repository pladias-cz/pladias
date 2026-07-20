package tasks;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import service.export.records.IRecordsExportService;

public class ExportRecordsToFileTask implements ITask {
    private final static String Name = "exportRecordsToFileTask";

    private final IRecordsExportService _recordsExportService;

    private final Logger logger = LoggerFactory.getLogger(ExportRecordsToFileTask.class);

    public ExportRecordsToFileTask(IRecordsExportService recordsExportService) {
        _recordsExportService = recordsExportService;
    }

    @Override
    public String getName() {
        return Name;
    }

    @Override
    public void execute() {
        try {
            _recordsExportService.buildExport();
        } catch (Exception e) {
            logger.error("Failure during records export build", e);
        }
    }
}
