package helpers.interval;

import static org.junit.Assert.assertEquals;

import helpers.ranges.RangeList;
import org.apache.commons.lang3.Range;
import org.junit.Test;


public class RangeSetShould {

    @Test
    public void addInterval()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(1, 2));
        Range<Integer> expected = Range.between(1, 2);
        assertEquals(expected, ranges.getIntervals().get(0));
    }
    
    @Test
    public void addTwoNonOverlappingIntervals()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(1, 2));
        ranges.add(Range.between(3, 4));
        assertEquals(2, ranges.getIntervals().size());
        
        assertEquals(Range.between(1, 2), ranges.getIntervals().get(0));
        assertEquals(Range.between(3, 4), ranges.getIntervals().get(1)); 
    }
    
    @Test
    public void beInitiallyEmpty()
    {
        RangeList ranges = new RangeList();
        assertEquals(true, ranges.isEmpty());
    }
    
    @Test
    public void beNonEmptyWhenThereIsAtLeastOneInterval()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(1, 2));
        assertEquals(false, ranges.isEmpty());
    }
    
    @Test
    public void mergeTwoOverlappingIntervals()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(1, 4));
        ranges.add(Range.between(3, 5));
        assertEquals(1, ranges.getIntervals().size());
        
        assertEquals(Range.between(1, 5), ranges.getIntervals().get(0));        
    }

    @Test
    public void mergeThreeOverlappingIntervals()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(1, 4));
        ranges.add(Range.between(3, 6));
        ranges.add(Range.between(5, 7));
        
        assertEquals(1, ranges.getIntervals().size());
        
        assertEquals(Range.between(1, 7), ranges.getIntervals().get(0));        
    }
    
    @Test
    public void mergeContainedIntervalIntoContainingInterval()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(3, 4));
        ranges.add(Range.between(1, 5));
        ranges.add(Range.between(2, 4));
        
        assertEquals(1, ranges.getIntervals().size());
        
        assertEquals(Range.between(1, 5), ranges.getIntervals().get(0));        
    }
    
    @Test
    public void orderIntervalsInIncreasingOrder()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(3, 4));
        ranges.add(Range.between(1, 2));
        
        assertEquals(2, ranges.getIntervals().size());
        
        assertEquals(Range.between(1, 2), ranges.getIntervals().get(0));
        assertEquals(Range.between(3, 4), ranges.getIntervals().get(1));     
    }
    
    @Test
    public void mergeTwoNonOverlappingIntervalsIntoOne()
    {
        RangeList ranges = new RangeList();
        ranges.add(Range.between(4, 6));
        ranges.add(Range.between(2, 3));
        ranges.add(Range.between(1, 6));
        
        
        assertEquals(1, ranges.getIntervals().size());
        
        assertEquals(Range.between(1, 6), ranges.getIntervals().get(0));
    }
}
