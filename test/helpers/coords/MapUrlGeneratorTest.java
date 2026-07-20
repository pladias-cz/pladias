package helpers.coords;



import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class MapUrlGeneratorTest {

	@Test
	public void generateUrl()
	{
		double x = 14.3665445;
		double y = 50.0120539;
		String result = MapUrlGenerator.getMapyCzUrl(x, y);
		                
		assertEquals("https://mapy.cz/turisticka?x=14.3665445&y=50.0120539&z=16&source=coor&id=14.3665445,50.0120539", result);
	}
	

}