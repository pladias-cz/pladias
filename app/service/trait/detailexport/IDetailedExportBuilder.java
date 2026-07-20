package service.trait.detailexport;

import java.io.IOException;

public interface IDetailedExportBuilder {

    byte[] build(IExportDataTransformer exportDataProvider) throws IOException;

    String getExtension();
}
