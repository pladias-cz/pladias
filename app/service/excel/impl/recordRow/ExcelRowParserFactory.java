package service.excel.impl.recordRow;

import org.apache.poi.ss.usermodel.Workbook;

import service.config.IConfigService;
import service.excel.impl.ExcelDocHelper;
import service.excel.impl.ExcelFileVersion;

public class ExcelRowParserFactory {


    public static DocumentRowParserBase create(IConfigService configService, Workbook workbook) {
        try {
            if (configService.isNonVascular()) {
                return new NonVascularDocumentRowParser();
            }

            ExcelFileVersion version = ExcelDocHelper.getCategory(workbook);

            if (version == ExcelFileVersion.VERSION2 || version == ExcelFileVersion.VERSION4) {
                return new VascularDocumentRowParserVer2();
            } else if (version == ExcelFileVersion.VERSION3) {
                return new VascularDocumentRowParserVer3();
            }
        } catch (Exception e) {
            //something above went wrong - seems like we are dealing with the basic Excel import form
        }
        return new VascularDocumentRowParserVer2();
    }
}
