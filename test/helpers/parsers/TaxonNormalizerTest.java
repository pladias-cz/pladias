package helpers.parsers;

import static org.junit.Assert.assertEquals;

import org.junit.Test;




public class TaxonNormalizerTest {

	/* Jmeno krizence
	  a)  Alnus x pubescens (pismeno + mezera)
	  b) Alnus × pubescens (nasobitko + mezera)
	  c) Alnus ×pubescens (nasobitko bez mezery)
	  */
 	
	@Test
	public void testXSpaceTransformation1() 
	{
		String input = "Alnus x pubescens";// letter x must transform to symbol '×'
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals("Alnus ×pubescens", normalized);
	}
	
	@Test
	public void testMultiplySpaceTransformation2() 
	{
		String input = "Alnus × pubescens";// remove space after symbol '×'
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals("Alnus ×pubescens", normalized);
	}
	
	@Test
	public void testMultiplySpaceTransformation3() 
	{
		String input = "Alnus ×pubescens";// no change
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals(input, normalized);
	}
	
	/*  a) x Orchidactyla boudieri
	    b) × Orchidactyla boudieri
        c) ×Orchidactyla boudieri*/
	@Test
	public void testBeginXSpaceTransformation1() 
	{
		String input = "x Orchidactyla boudieri";// letter x must transform to symbol '×', remove superfluous space
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals("×Orchidactyla boudieri", normalized);
	}
	
	@Test
	public void testBeginXSpaceTransformation2() 
	{
		String input = "× Orchidactyla boudieri";// remove superfluous space
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals("×Orchidactyla boudieri", normalized);
	}
	
	@Test
	public void testBeginXSpaceTransformation3() 
	{
		String input = "×Orchidactyla boudieri";// no change
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals(input, normalized);
	}
	
	  /*
	  Mezi druhy:
	  a) Veronica incana x V. maritima
	  b) Veronica incana × V. maritima
	  
	  ci 
	  Mezi rody:
	  a) Matricaria x Triplerospermum
	  b) Matricaria × Triplerospermum
	  */
	
	@Test
	public void testMiddleSpaceXSpaceTransformation1() 
	{
		String input = "Veronica incana x V. maritima";// symbol x -> change
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals("Veronica incana × V. maritima", normalized);
	}
	
	@Test
	public void testMiddleSpaceXSpaceTransformation2() 
	{
		String input = "Veronica incana × V. maritima";// symbol '×' -> no change
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals(input, normalized);
	}
	
	/*Centaurea erdneri x C. jacea x C. oxylepis*/
	@Test
	public void testTripleMutant() 
	{
		String input = "Centaurea erdneri x C. jacea x C. oxylepis";
		
		String normalized = TaxonNormalizer.normalize(input);
		assertEquals("Centaurea erdneri × C. jacea × C. oxylepis", normalized);
	}
}
