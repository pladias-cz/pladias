package service.export.records;

import java.io.InputStream;

public interface IRecordsExportService {

    InputStream getStream() throws Exception;

    void buildExport() throws Exception;

}
