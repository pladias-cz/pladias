package helpers.parsers;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;

import java.util.List;

import org.apache.commons.lang3.tuple.Pair;
import org.junit.Test;
import play.i18n.Messages;

public class AuthorListParserTest {

	private Messages messages()
	{
		return mock(Messages.class);
	}

	
	@Test
	public void testSimpleName() 
	{
		String input = "Doe, John";
		
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
		assertEquals("Doe", list.get(0).getLeft());
		assertEquals("John", list.get(0).getRight());
	}
	
	@Test
	public void testSurname() 
	{
		String input = "Doe";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
		assertEquals("Doe", list.get(0).getLeft());
		assertEquals("", list.get(0).getRight());
	}
	
	@Test
	public void testNameList() 
	{
		String input = "Doe, John; Doe, J.";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(2, list.size());
		assertEquals("Doe", list.get(0).getLeft());
		assertEquals("John", list.get(0).getRight());
		assertEquals("Doe", list.get(1).getLeft());
		assertEquals("J.", list.get(1).getRight());
	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testInvalidEntryInNameList() 
	{
		String input = "Doe, John; Doe J.";
		AuthorListParser.parse(input, messages());
	}
	
	@Test
	public void testMultipleEntriesWithEtConjunction() 
	{
		String input = "Doe, John et Doe, J.";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(2, list.size());
		assertEquals("Doe", list.get(0).getLeft());
		assertEquals("John", list.get(0).getRight());
		assertEquals("Doe", list.get(1).getLeft());
		assertEquals("J.", list.get(1).getRight());
	}
	
	@Test
	public void testMultipleEntriesWithAmpersandConjunction() 
	{
		String input = "Doe, John & Doe, J.";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(2, list.size());
		assertEquals("Doe", list.get(0).getLeft());
		assertEquals("John", list.get(0).getRight());
		assertEquals("Doe", list.get(1).getLeft());
		assertEquals("J.", list.get(1).getRight());
	}
	
	@Test
	public void testMultipleEntriesWithEtAl() 
	{
		String input = "Doe, John; et al.";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(2, list.size());
		assertEquals("Doe", list.get(0).getLeft());
		assertEquals("John", list.get(0).getRight());
		assertEquals("et al.", list.get(1).getLeft());
	}
	
	@Test
	public void testMultipleEntriesWithAKol() 
	{
		String input = "Doe, John; a kol.";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(2, list.size());
		assertEquals("Doe", list.get(0).getLeft());
		assertEquals("John", list.get(0).getRight());
		assertEquals("et al.", list.get(1).getLeft());
	}
	
	@Test
	public void testAuthorUnknown() 
	{
		String input = AuthorListParser.NoAuthorDefined;
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
	}
	
	@Test
	public void testAuthorUnreadable() 
	{
		String input = AuthorListParser.AuthorUnreadable;
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
	}
	
	@Test
	public void testCompoundName()
	{
		String input = "Niessl von Mayendorf, Gustaf";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
		assertEquals("Niessl von Mayendorf", list.get(0).getLeft());
		assertEquals("Gustaf", list.get(0).getRight());
	}
	
	@Test
	public void testNameWithAbbrev()
	{
		String input = "Reuss jun.";
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
		assertEquals("Reuss jun.", list.get(0).getLeft());
	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testNameWithAbbrevMissingFullStop()
	{
		AuthorListParser.parse("Reuss jun", messages());
	}
	
	@Test(expected=IllegalArgumentException.class)
	public void testNameWithAbbrevStartingWithUppercaseLetter()
	{
		AuthorListParser.parse("Reuss Jun.", messages());
	}
	
	@Test
	public void testCompoundSurnameAndName() 
	{
		String input = "Dalla Torre, Ignatius";
		
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
		assertEquals("Dalla Torre", list.get(0).getLeft());
		assertEquals("Ignatius", list.get(0).getRight());
	}

	@Test
	public void testCompoundSurnameNoFirstName() 
	{
		String input = "Dalla_Torre";
		
		List<Pair<String,String>> list = AuthorListParser.parse(input, messages());
		assertEquals(1, list.size());
		assertEquals("Dalla Torre", list.get(0).getLeft());
		assertEquals("", list.get(0).getRight());
	}
	
}

