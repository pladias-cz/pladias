package excel;

public class UpdateEntryInfo {
    private final long row;
    private final int column;
    private final String text;

    public UpdateEntryInfo(long row, int column, String text) {
        this.row = row;
        this.column = column;
        this.text = text;
    }

    public long getRow() {
        return row;
    }

    public int getColumn() {
        return column;
    }

    public String getText() {
        return text;
    }
}
