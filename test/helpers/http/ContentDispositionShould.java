package helpers.http;

import org.junit.Assert;
import org.junit.Test;

public class ContentDispositionShould
{
    @Test
    public void quotePlainAsciiFilename()
    {
        Assert.assertEquals(
            "attachment; filename=\"taxonList.csv\"; filename*=UTF-8''taxonList.csv",
            ContentDisposition.attachment("taxonList.csv"));
    }

    @Test
    public void stripDiacriticsInFallbackAndEncodeUtf8InFilenameStar()
    {
        Assert.assertEquals(
            "attachment; filename=\"mereni.xlsx\"; filename*=UTF-8''m%C4%9B%C5%99en%C3%AD.xlsx",
            ContentDisposition.attachment("měření.xlsx"));
    }

    @Test
    public void replaceQuotesBackslashesAndControlChars()
    {
        String header = ContentDisposition.attachment("a\"b\\c\rd.xlsx");
        Assert.assertTrue(header.contains("filename=\"a_b_c_d.xlsx\""));
        Assert.assertTrue(header.contains("filename*=UTF-8''a%22b%5Cc%0Dd.xlsx"));
    }

    @Test
    public void bareAttachmentForNullFilename()
    {
        Assert.assertEquals("attachment", ContentDisposition.attachment(null));
    }
}
