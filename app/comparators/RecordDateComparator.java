package comparators;

import models.Record;

import java.util.Comparator;
import java.util.Date;

public class RecordDateComparator implements Comparator<Record> {

    @Override
    public int compare(Record r1, Record r2) {
        Date d1 = (r1.getDateSpecifier() == null) ? null : r1.getDateSpecifier().getDate();
        Date d2 = (r2.getDateSpecifier() == null) ? null : r2.getDateSpecifier().getDate();

        if (d1 == null && d2 == null) return 0;
        if (d1 == null && d2 != null) return 1;
        if (d1 != null && d2 == null) return -1;
        return (int) ((d1.getTime() - d2.getTime()) % Integer.MAX_VALUE);
    }

}
