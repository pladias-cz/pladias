package service.encryption;

import org.junit.Assert;
import org.junit.Test;

import service.config.IConfigService;
import service.password.PladiasEncryptionService;

public class PladiasEncryptionServiceShould {

    @Test
    public void encryptPassword() throws Exception
    {
        final String SECRET_KEY_CONFIG_KEY = "secretKey";
        final String SECRET_KEY_CONFIG_VALUE = "AeAQ5kB1Xas";

        final String PASSWORD_PLAINTEXT = "acerjaponicum2024";
        final String PASSWORD_CIPHERTEXT = "uTuvnrzjLgaYdOpw438K3HHQti9gLfis";

        IConfigService configService = org.mockito.Mockito.mock(IConfigService.class);
        org.mockito.Mockito.when(configService.getString(SECRET_KEY_CONFIG_KEY)).thenReturn(SECRET_KEY_CONFIG_VALUE);

        PladiasEncryptionService service = new PladiasEncryptionService(configService);
        String encrypted = service.encrypt(PASSWORD_PLAINTEXT);
        Assert.assertEquals(PASSWORD_CIPHERTEXT, encrypted);

        String encrypted2 = service.encrypt("supercalifragile");
        Assert.assertEquals("NompXYnnyNN1vuHXBg0lGN+vEHNDug/j", encrypted2);

    }
}
