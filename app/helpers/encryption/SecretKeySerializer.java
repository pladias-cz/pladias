package helpers.encryption;

import org.apache.commons.codec.binary.Base64;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

public class SecretKeySerializer {
    public static String keyToBase64(SecretKey secretKey) {
        return Base64.encodeBase64String(secretKey.getEncoded());
    }

    public static SecretKey base64ToKey(String base64Input, String algorithm) {
        byte[] encodedKey = Base64.decodeBase64(base64Input);
        SecretKey originalKey = new SecretKeySpec(encodedKey, 0, encodedKey.length, algorithm);
        return originalKey;
    }
}
