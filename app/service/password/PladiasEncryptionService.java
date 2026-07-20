package service.password;

import com.google.inject.Inject;
import helpers.encryption.DesEncrypter;
import helpers.encryption.SecretKeySerializer;
import service.config.IConfigService;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.SecretKey;
import java.io.UnsupportedEncodingException;

public class PladiasEncryptionService implements IEncryptionService {

    private static final String SecretKey = "secretKey";
    private final DesEncrypter encrypter;

    @Inject
    public PladiasEncryptionService(IConfigService configService) throws Exception {
        String key = configService.getString(SecretKey);
        SecretKey secretKey = SecretKeySerializer.base64ToKey(key, "DES");
        encrypter = new DesEncrypter(secretKey);
    }

    @Override
    public synchronized String encrypt(String input) throws UnsupportedEncodingException, IllegalBlockSizeException, BadPaddingException {
        return encrypter.encrypt(input);
    }

    @Override
    public synchronized String decrypt(String encrypted) throws IllegalBlockSizeException, BadPaddingException, UnsupportedEncodingException {
        return encrypter.decrypt(encrypted);
    }
}
