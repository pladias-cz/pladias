package helpers.ranges;

import org.apache.commons.lang3.Range;

import java.util.ArrayList;
import java.util.List;

public class RangeList {
    private List<Range<Integer>> ranges = new ArrayList<>();

    public List<Range<Integer>> getIntervals() {
        return ranges;
    }

    public void add(Range<Integer> newRange) {
        List<Range<Integer>> newRanges = new ArrayList<>();

        for (Range<Integer> current : ranges) {
            if (current.isAfterRange(newRange)) {
                newRanges.add(newRange);
                newRange = current;
            } else if (current.isOverlappedBy(newRange)) {
                int min = getMin(current, newRange);
                int max = getMax(current, newRange);
                newRange = Range.between(min, max);
            } else if (current.isBeforeRange(newRange)) {
                newRanges.add(current);
            }
        }
        newRanges.add(newRange);
        ranges = newRanges;
    }

    private int getMin(Range<Integer> first, Range<Integer> second) {
        return first.getMinimum() < second.getMinimum()
            ? first.getMinimum()
            : second.getMinimum();
    }

    private int getMax(Range<Integer> first, Range<Integer> second) {
        return first.getMaximum() > second.getMaximum()
            ? first.getMaximum()
            : second.getMaximum();
    }

    public boolean isEmpty() {
        return ranges.isEmpty();
    }
}
