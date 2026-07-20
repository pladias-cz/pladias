package helpers.strings;

import org.junit.Assert;
import org.junit.Test;

public class StringNormalizerShould
{
    @Test
    public void ignoreNullInput()
    {
        Assert.assertNull(StringNormalizer.normalizeSpaces(null));
    }

    @Test
    public void replaceNonBreakableSpace()
    {
        String input = "Sentence\u00A0with\u00A0nonbreakable\tspaces";
        String normalized = StringNormalizer.normalizeSpaces(input);
        Assert.assertEquals("Sentence with nonbreakable spaces", normalized);
    }

    @Test
    public void normalizeMultipleWhitespaces()
    {
        String input = "Sentence  \r\n  with\t\tmultiple\n\nwhitespaces.";
        String normalized = StringNormalizer.normalizeSpaces(input);
        Assert.assertEquals("Sentence with multiple whitespaces.", normalized);
    }

    @Test
    public void replaceUnicodeSpaces()
    {
        String input = " Sentence  with different types\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B\u202F\u205F\u3000\uFEFFof spaces. ";
        String normalized = StringNormalizer.normalizeSpaces(input);
        Assert.assertEquals("Sentence with different types of spaces.", normalized);
    }

    public void normalizeMultipleWhitespaces2()
    {
        String input = "A\u00A0\u1680\u180E\u2000\u2002\u2003\u200B\u202F\u205F\u3000\uFEFFB";
        String normalized = StringNormalizer.normalizeSpaces(input);
        Assert.assertEquals("A B", normalized);
    }
}
