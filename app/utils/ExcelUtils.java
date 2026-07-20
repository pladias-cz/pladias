package utils;

import org.apache.commons.io.output.ByteArrayOutputStream;
import org.apache.poi.ss.usermodel.Workbook;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

public class ExcelUtils {

    public static byte[] serializeWorkbook(Workbook workbook) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        workbook.write(bos);
        return bos.toByteArray();
    }

    public static InputStream toInputStream(Workbook workbook) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        workbook.write(bos);
        return new ByteArrayInputStream(bos.toByteArray());
    }
}
