package helpers.parsers;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;

import org.apache.commons.lang3.tuple.Pair;
import org.junit.Test;
import play.i18n.Messages;



import java.security.InvalidParameterException;

public class CoordinatesParserTest {

	private final double Delta = 0.000001;

	private Messages messages()
	{
		return mock(Messages.class);
	}
	
	@Test
	public void testValidNorthHemisphere() 
	{
		String input = "50°2'16.967\"N, 14°29'52.468\"E";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
		assertEquals(50.0380464, p.getRight(), Delta);
		assertEquals(14.4979078, p.getLeft(), Delta);
	}
	
	@Test
	public void testAlternativeNorthHemisphere()
	{
		String input = "50°09'04.2''N, 12°26'25.8''E";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
		assertEquals(50.1511666, p.getRight(), Delta);
		assertEquals(12.4405, p.getLeft(), Delta);
		
	}
	
	@Test
	public void testValidNorthHemisphereComma()
	{
		String input = "49°00'12,8\"N, 14°20'06,3\"E";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
		assertEquals(49.00355555, p.getRight(), Delta);
		assertEquals(14.33508333, p.getLeft(), Delta);
	}
	
	@Test
    public void testValidNorthHemisphereAlternativeFormatting() 
    {
        String input = "50,2,16.967,N 14,29,52.468,E";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
        assertEquals(50.0380464, p.getRight(), Delta);
        assertEquals(14.4979078, p.getLeft(), Delta);
    }
	
	@Test(expected=IllegalArgumentException.class)
	public void testNullInput()
	{
		CoordinatesParser.parse(null, messages());
	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testInvalidInput()
	{
		CoordinatesParser.parse("invalid", messages());
	}
	
	@Test
	public void testSouthHemisphere()
	{
		String input = "50°2'16.967\"S, 14°29'52.468\"W";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
		assertEquals(-50.0380464, p.getRight(), Delta);
		assertEquals(-14.4979078, p.getLeft(), Delta);
	}
	
	@Test
	public void testSouthHemisphereAlternateFormatting()
    {
        String input = "50,2,16.967,S 14,29,52.468,W";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
        assertEquals(-50.0380464, p.getRight(), Delta);
        assertEquals(-14.4979078, p.getLeft(), Delta);
    }
	
	@Test
	public void testImplicitNorthHemisphere() 
	{
		String input = "50°2'16.967\", 14°29'52.468\"";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
		assertEquals(50.0380464, p.getRight(), Delta);
		assertEquals(14.4979078, p.getLeft(), Delta);
	}
	
	@Test
	public void testSimpleFormat() 
	{
		String input = "500216.967,  142952.468";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
		assertEquals(50.0380464, p.getRight(), Delta);
		assertEquals(14.4979078, p.getLeft(), Delta);
	}

	@Test(expected = InvalidParameterException.class)
	public void testSimpleFormatWrongLatitudeSeconds()
	{
		String input = "500266.967,  142952.468";
		CoordinatesParser.parse(input, messages());
	}

	@Test(expected = InvalidParameterException.class)
	public void testSimpleFormatWrongLongitudeMinutes()
	{
		String input = "500216.967,  146952.468";
		CoordinatesParser.parse(input, messages());
	}

	@Test
	public void testLonLatFormat()
	{
		String input = "50.0380464,  14.4979078";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
		assertEquals(50.0380464, p.getRight(), Delta);
		assertEquals(14.4979078, p.getLeft(), Delta);
	}
	
	@Test
    public void testLonLatWithHemispheresFormat()
    {
        String input = "50.0380464N,    14.4979078E";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
        assertEquals(50.0380464, p.getRight(), Delta);
        assertEquals(14.4979078, p.getLeft(), Delta);
    }
	
	@Test
    public void testLonLatWithSouthWestHemispheresFormat()
    {
        String input = "50.0380464S,    14.4979078W";
		Pair<Double, Double> p = CoordinatesParser.parse(input, messages());
        assertEquals(-50.0380464, p.getRight(), Delta);
        assertEquals(-14.4979078, p.getLeft(), Delta);
    }
	
	@Test(expected=IllegalArgumentException.class)
	public void testInvalidLonLatFormat()
	{
		String input = "50,  14.4979078";
		CoordinatesParser.parse(input, messages());
	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testInvalidGpsRangeX() 
	{
		String input = "90°2'16.967\"N, 11°29'52.468\"E";
		CoordinatesParser.parse(input, messages());

	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testInvalidGpsRangeY() 
	{
		String input = "50°2'16.967\"N, 181°29'52.468\"E";
		CoordinatesParser.parse(input, messages());
	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testInvalidGpsRangeSimpleFormatX() 
	{
		String input = "910216.967,  142952.468";
		CoordinatesParser.parse(input, messages());
	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testInvalidGpsRangeSimpleFormatY() 
	{
		String input = "500216.967,  1922952.468";
		CoordinatesParser.parse(input, messages());
	}
}