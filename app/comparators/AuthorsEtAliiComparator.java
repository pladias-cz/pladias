package comparators;

import models.RecordAuthor;

import java.util.Comparator;

public class AuthorsEtAliiComparator implements Comparator<RecordAuthor> {

    @Override
    public int compare(RecordAuthor arg0, RecordAuthor arg1) {
        boolean isArg0 = isEtAlii(arg0);
        boolean isArg1 = isEtAlii(arg1);

        if (isArg0 && isArg1)
            return 0;

        if (isArg0)
            return 1;

        if (isArg1)
            return -1;

        return 0;
    }

    public boolean isEtAlii(RecordAuthor authorRecord) {
        return "kolektiv".equalsIgnoreCase(authorRecord.getAuthor().getSurname()) ||
            "et al.".equalsIgnoreCase(authorRecord.getAuthor().getSurname());
    }
}
