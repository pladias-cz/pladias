package helpers.encryption;

import org.apache.commons.codec.binary.Base64;

import javax.crypto.*;
import java.io.UnsupportedEncodingException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

public class DesEncrypter {

    private static final String DES = "DES";
    private static final String UTF8 = "UTF8";
    private final Cipher ecipher;
    private final Cipher dcipher;

    public DesEncrypter(SecretKey key) throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException {
        ecipher = Cipher.getInstance(DES);
        dcipher = Cipher.getInstance(DES);
        ecipher.init(Cipher.ENCRYPT_MODE, key);
        dcipher.init(Cipher.DECRYPT_MODE, key);
    }

    public String encrypt(String str) throws UnsupportedEncodingException, IllegalBlockSizeException, BadPaddingException {
        // Encode the string into bytes using utf-8
        byte[] utf8 = str.getBytes(UTF8);

        // Encrypt
        byte[] enc = ecipher.doFinal(utf8);

        // Encode bytes to base64 to get a string
        return Base64.encodeBase64String(enc);
    }

    public String decrypt(String str) throws IllegalBlockSizeException, BadPaddingException, UnsupportedEncodingException {
        // Decode base64 to get bytes
        byte[] dec = Base64.decodeBase64(str);

        byte[] utf8 = dcipher.doFinal(dec);

        // Decode using utf-8
        return new String(utf8, UTF8);
    }
}
