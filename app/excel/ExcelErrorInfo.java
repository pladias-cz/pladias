package excel;

public class ExcelErrorInfo {

    private final long row;
    private final int column;
    private final String description;

    public ExcelErrorInfo(long row, int column, String description) {
        this.row = row;
        this.column = column;
        this.description = description;
    }

    public long getRow() {
        return row;
    }

    public int getColumn() {
        return column;
    }

    public String getDescription() {
        return description;
    }
}
