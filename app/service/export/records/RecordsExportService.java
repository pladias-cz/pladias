package service.export.records;

import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import serializers.CsvSerializer;
import sql.SqlExecutor;

import javax.inject.Inject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;

public class RecordsExportService implements IRecordsExportService {
    private final static String ExportedRecordsTempFile = "export_records_tmp";
    private final static String ExportedRecordsTargetFile = "export_records.csv";
    private final static String JavaIoTempDir = "java.io.tmpdir";
    private final static String RecordsExportTableName = "atlas_nonvascular.m_records_export";

    private final Logger _logger = LoggerFactory.getLogger(RecordsExportService.class);

    private final SqlExecutor _sqlExecutor;
    private final String _tmpFolder;

    @Inject
    public RecordsExportService(SqlExecutor sqlExecutor) {
        _sqlExecutor = sqlExecutor;
        _tmpFolder = getTempFolder();
        _logger.info(String.format("using temp folder: %s", _tmpFolder));
    }

    @Override
    public synchronized void buildExport() throws Exception {
        File tempFile = getTempFile();
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            try (CsvSerializer serializer = new CsvSerializer(fos)) {
                Iterable<String> columns = _sqlExecutor.getMaterializedViewColumnNames(RecordsExportTableName);
                serializer.printLine(columns);
                _sqlExecutor.printTableDetails(RecordsExportTableName, "id", "0", serializer);
                _logger.info(String.format("exported data to file:%s/%s", _tmpFolder.toString(), ExportedRecordsTempFile));
            }
        }
        renameToTargetFile(tempFile);
    }

    @Override
    public InputStream getStream() throws Exception {
        File targetFile = getTargetFile();
        if (!targetFile.exists()) {
            buildExport();
        }
        return FileUtils.openInputStream(targetFile);
    }

    private File getTempFile() {
        Path tempFilePath = Paths.get(_tmpFolder, ExportedRecordsTempFile);
        return tempFilePath.toFile();
    }

    private File getTargetFile() {
        Path targetFilePath = Paths.get(_tmpFolder, ExportedRecordsTargetFile);
        return targetFilePath.toFile();
    }

    private void renameToTargetFile(File tempFile) {
        File targetFile = getTargetFile();
        targetFile.delete();

        tempFile.renameTo(targetFile);
        _logger.info(String.format("exported data file changed to:%s/%s", _tmpFolder.toString(), ExportedRecordsTargetFile));
    }

    private String getTempFolder() {
        return System.getProperty(JavaIoTempDir);
    }
}
