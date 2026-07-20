package comparators;

import models.QuadrantNew;
import models.Record;

import java.util.Comparator;
import java.util.Optional;

public class RecordQuadrantComparator implements Comparator<Record> {

    @Override
    public int compare(Record arg0, Record arg1) {

        Optional<QuadrantNew> q0 = arg0.getQuadrant();
        Optional<QuadrantNew> q1 = arg1.getQuadrant();

        if (q0.isPresent() && q1.isPresent())
            return q0.get().getCode().compareTo(q1.get().getCode());

        if (q0.isPresent())
            return -1;

        if (q1.isPresent())
            return 1;

        // both are empty
        return 0;
    }
}
