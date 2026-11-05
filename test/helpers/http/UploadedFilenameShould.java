package helpers.http;

import org.junit.Assert;
import org.junit.Test;

public class UploadedFilenameShould
{
    @Test
    public void keepPlainFilename()
    {
        Assert.assertEquals("map.png", UploadedFilename.sanitize("map.png", "fallback.png"));
    }

    @Test
    public void keepCzechDiacritics()
    {
        Assert.assertEquals("mapa_červenka.png", UploadedFilename.sanitize("mapa_červenka.png", "fallback.png"));
    }

    @Test
    public void stripPathTraversal()
    {
        Assert.assertEquals("passwd", UploadedFilename.sanitize("../../etc/passwd", "fallback.png"));
        Assert.assertEquals("evil.png", UploadedFilename.sanitize("..\\..\\evil.png", "fallback.png"));
        Assert.assertEquals("a.png", UploadedFilename.sanitize("/tmp/a.png", "fallback.png"));
    }

    @Test
    public void replaceControlCharsQuotesAndDel()
    {
        Assert.assertEquals("ma__p.png", UploadedFilename.sanitize("ma\r\np.png", "fallback.png"));
        Assert.assertEquals("a_b.png", UploadedFilename.sanitize("a\"b.png", "fallback.png"));
        Assert.assertEquals("a_b.png", UploadedFilename.sanitize("a\u007Fb.png", "fallback.png"));
    }

    @Test
    public void fallbackForNullEmptyAndPathOnly()
    {
        Assert.assertEquals("fallback.png", UploadedFilename.sanitize(null, "fallback.png"));
        Assert.assertEquals("fallback.png", UploadedFilename.sanitize("", "fallback.png"));
        Assert.assertEquals("fallback.png", UploadedFilename.sanitize("   ", "fallback.png"));
        Assert.assertEquals("fallback.png", UploadedFilename.sanitize("../../", "fallback.png"));
    }

    @Test
    public void truncateTo255Chars()
    {
        StringBuilder longName = new StringBuilder();
        for (int i = 0; i < 300; i++)
        {
            longName.append('a');
        }
        longName.append(".png");

        Assert.assertEquals(255, UploadedFilename.sanitize(longName.toString(), "fallback.png").length());
    }
}
