package excel;

import com.google.common.io.Files;
import play.i18n.Messages;

import java.io.IOException;

public class ExcelHelper {
    public static final String ExcelWorkbook = "xlsx";
    public static final String Excel97 = "xls";

    public static void verifyExcelFilename(String filename, Messages messages) throws IOException {
        String extension = Files.getFileExtension(filename);
        if (extension != null &&
            !(Excel97.equals(extension) || ExcelWorkbook.equals(extension))) {
            throw new IOException(messages.at("ExcelHelper.InvalidExcelFileName"));
        }
    }
}
