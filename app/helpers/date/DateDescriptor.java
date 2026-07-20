package helpers.date;

import java.util.Date;

public class DateDescriptor {
    private final Date date;
    private final DatePrecision datePrecision;

    public DateDescriptor(Date date, DatePrecision datePrecision) {
        this.date = date;
        this.datePrecision = datePrecision;
    }

    public Date getDate() {
        return date;
    }

    public DatePrecision getPrecision() {
        return datePrecision;
    }
}
