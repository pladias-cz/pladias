package service.trait.detailexport;

public class CellDetail {

    private int columnSpan;
    private String text;
    private CellType cellType;

    public CellDetail(int columnSpan, String text, CellType cellType) {
        this.columnSpan = columnSpan;
        this.text = text;
        this.cellType = cellType;
    }

    public int getColumnSpan() {
        return columnSpan;
    }

    public void setRowSpan(int columnSpan) {
        this.columnSpan = columnSpan;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public CellType getCellType() {
        return cellType;
    }

    public void setCellType(CellType cellType) {
        this.cellType = cellType;
    }
}
