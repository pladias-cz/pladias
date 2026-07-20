package service.excel.impl;

import models.dto.UploadedFile;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.IOException;

public class WorkbookWrapperFactory {

    public static WorkbookWrapper createAndDelete(UploadedFile uploadedFile) throws EncryptedDocumentException, IOException {
        try {
            return create(uploadedFile);
        } finally {
            uploadedFile.delete();
        }
    }

    public static WorkbookWrapper create(UploadedFile uploadedFile) throws EncryptedDocumentException, IOException {
        Workbook workbook = WorkbookFactory.create(uploadedFile.getFile());
        if (workbook instanceof HSSFWorkbook) {
            return new HSSFWorkbookWrapper((HSSFWorkbook) workbook, uploadedFile.getName());
        }

        if (workbook instanceof XSSFWorkbook) {
            return new XSSFWorkbookWrapper((XSSFWorkbook) workbook, uploadedFile.getName());
        }

        throw new IOException("Unsupported workbook type " + workbook.getClass().getSimpleName());
    }
}
