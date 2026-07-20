package helpers.html;

import helpers.exceptions.HtmlParseException;
import org.junit.Test;


public class HtmlTagValidatorShould {

	@Test
	public void acceptPlaintext() throws HtmlParseException
	{
		String input = "plaintext without html tags";
		HtmlTagValidator validator = new HtmlTagValidator();
		validator.validate(input);
	}
	
	@Test
	public void acceptTextWithValidHtmlTag() throws HtmlParseException
	{
		String input = "Correctly closed <ital>html text</ital>";
		HtmlTagValidator validator = new HtmlTagValidator();
		validator.validate(input);
	}
	
	@Test
	public void acceptTextWithNestedHtmlTags() throws HtmlParseException
	{
		String input = "Correctly closed <italics>html<bold> text</bold></italics>";
		HtmlTagValidator validator = new HtmlTagValidator();
		validator.validate(input);
	}
	
	@Test (expected = HtmlParseException.class) 
	public void throwWhenOpeningTagMissing() throws HtmlParseException
	{
		String input = "Missing opening tag </b>";
		HtmlTagValidator validator = new HtmlTagValidator();
		validator.validate(input);
	}
	
	@Test (expected = HtmlParseException.class) 
	public void throwWhenClosingTagMissing() throws HtmlParseException
	{
		String input = "Incorrectly closed <italics> html text";
		HtmlTagValidator validator = new HtmlTagValidator();
		validator.validate(input);
	}
	
	@Test (expected = HtmlParseException.class) 
	public void throwWhenTagsIncorrectlyNested() throws HtmlParseException
	{
		String input = "Incorrectly <i> nested <b>html</i> text</b>";
		HtmlTagValidator validator = new HtmlTagValidator();
		validator.validate(input);
	}
	
	@Test (expected = HtmlParseException.class) 
	public void throwWhenEmptyTagEncountered() throws HtmlParseException
	{
		String input = "Empty tag <>.";
		HtmlTagValidator validator = new HtmlTagValidator();
		validator.validate(input);
	}
	
}
