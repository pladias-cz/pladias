package service.password;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import java.io.UnsupportedEncodingException;

public interface IEncryptionService {
    String encrypt(String input) throws UnsupportedEncodingException, IllegalBlockSizeException, BadPaddingException;

    String decrypt(String encrypted) throws IllegalBlockSizeException, BadPaddingException, UnsupportedEncodingException;
}
