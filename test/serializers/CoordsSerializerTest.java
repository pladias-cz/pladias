package serializers;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class CoordsSerializerTest {

    @Test
    public void testDecToDegMinSecConversion()
    {
        double input = 30.263888889;
        String dms = CoordsSerializer.fromDecToDegMinSec(input);
        assertEquals("30°15'50.00''", dms);
    }
}
