package helpers.parsers;

import static org.junit.Assert.assertEquals;

import java.util.List;

import org.junit.Test;



public class HerbariumListParserTest {

	@Test
	public void testStandardHerbarium() 
	{
		String input = "herbPR";
		
		List<String> list = HerbariumListParser.parse(input);
		assertEquals(1,list.size());
		assertEquals(list.get(0),"PR");
		
	}
	
	@Test
	public void testMultipleStandardHerbariums() 
	{
		String input = "herbPR; herbPRC";
		
		List<String> list = HerbariumListParser.parse(input);
		assertEquals(2,list.size());
		assertEquals(list.get(0),"PR");
		assertEquals(list.get(1),"PRC");
	}
	
	@Test
	public void testInvalidStandardHerbarium() 
	{
		String input = "herPR";
		
		List<String> list = HerbariumListParser.parse(input);
		assertEquals(0,list.size());
	}
	
	@Test
	public void testPrivateStandardHerbarium() 
	{
		String input = "herb. Z. Kaplan";
		
		List<String> list = HerbariumListParser.parse(input);
		assertEquals(1,list.size());
		assertEquals(input,list.get(0));
		
	}
	
	@Test
    public void testPrivateStandardHerbariumWithSpecialCharacter() 
    {
        String input = "herb. S. Jeßen";
        
        List<String> list = HerbariumListParser.parse(input);
        assertEquals(1,list.size());
        assertEquals(input,list.get(0));
        
    }

	@Test
    public void testPrivateStandardHerbariumWithDiacritics() 
    {
        String input = "herb. P. Koutecký";
        
        List<String> list = HerbariumListParser.parse(input);
        assertEquals(1,list.size());
        assertEquals(input,list.get(0));
        
    }
	
	@Test
    public void testPrivateStandardHerbariumWithDiacritics2() 
    {
        String input = "herb. P. KoutecKÝ";
        
        List<String> list = HerbariumListParser.parse(input);
        assertEquals(1,list.size());
        assertEquals(input,list.get(0));
        
    }
	
	@Test
	public void testMultiplePrivateHerbariums() 
	{
		String input = "Herb. Z. Kaplan; herb. J. Danihelka";
		
		List<String> list = HerbariumListParser.parse(input);
		assertEquals(2,list.size());
		assertEquals("Herb. Z. Kaplan",list.get(0));
		assertEquals("herb. J. Danihelka",list.get(1));
		
	}
	
}
