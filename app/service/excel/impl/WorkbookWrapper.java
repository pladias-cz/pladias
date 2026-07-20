package service.excel.impl;

import org.apache.poi.common.usermodel.Hyperlink;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Workbook;

public abstract class WorkbookWrapper {

    private final String _filename;

    public WorkbookWrapper(String filename) {
        _filename = escape(filename);
    }

    public abstract Workbook getWorkbook();

    public abstract CellStyle createErrorBackgroundCellStyle();

    public abstract CellStyle createInfoBackgroundCellStyle();

    public abstract CellStyle createWarningBackgroundCellStyle();

    public abstract CellStyle createErrorDescriptionCellStyle();

    public abstract CellStyle createInfoDescriptionCellStyle();

    public abstract CellStyle createWarningDescriptionCellStyle();

    public abstract CellStyle createEmptyCellStyle();

    public abstract void populateCellWithHyperlink(Cell cell, String url, String label);

    public String getFilename() {
        return _filename;
    }

    private String escape(String filename) {
        return filename.replace('-', '_').replace('–', '_').replace('—', '_');
    }

    protected Hyperlink createHyperlink(String url, String label) {
        CreationHelper creationHelper = getWorkbook().getCreationHelper();
        Hyperlink link = creationHelper.createHyperlink(HyperlinkType.URL);
        link.setAddress(url);
        link.setLabel(label);
        return link;
    }
}
