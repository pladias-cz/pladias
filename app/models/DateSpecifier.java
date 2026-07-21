package models;

import helpers.date.DateDescriptor;
import jakarta.persistence.Embeddable;

import java.util.Calendar;
import java.util.Date;

@Embeddable
public class DateSpecifier {

    public static final String DATE_PRECISION_YEAR = "Y";
    public static final String DATE_PRECISION_MONTH = "M";
    public static final String DATE_PRECISION_DAY = "D";
    private Date date;
    private String datePrecision;

    public DateSpecifier(Date date, String datePrecision) {
        this.date = date;
        this.datePrecision = datePrecision;
    }

    public static DateSpecifier createFromDateDescriptor(DateDescriptor dateDesc) {

        String datePrecision = switch (dateDesc.getPrecision()) {
            case DAY -> DateSpecifier.DATE_PRECISION_DAY;
            case MONTH -> DateSpecifier.DATE_PRECISION_MONTH;
            case YEAR -> DateSpecifier.DATE_PRECISION_YEAR;
            default -> null;
        };
        return new DateSpecifier(dateDesc.getDate(), datePrecision);
    }

    public Date getDate() {
        return date;
    }

    public void setDate(Date date) {
        this.date = date;
    }

    public String getDatePrecision() {
        return datePrecision;
    }

    public void setDatePrecision(String datePrecision) {
        this.datePrecision = datePrecision;
    }

    public Integer getYear() {
        if (date == null && datePrecision == null) {
            return null;
        }
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        return cal.get(Calendar.YEAR);
    }

    @Override
    public String toString() {
        if (date == null && datePrecision == null) {
            return "s. d.";
        }

        Calendar cal = Calendar.getInstance();
        cal.setTime(date);

        String result = switch (datePrecision) {
            case DATE_PRECISION_YEAR -> String.format("%d", cal.get(Calendar.YEAR));
            case DATE_PRECISION_MONTH -> String.format("%d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1);
            case DATE_PRECISION_DAY ->
                    String.format("%d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));
            default -> "DateSpecifier.InvalidDate";
        };
        return result;
    }
}
