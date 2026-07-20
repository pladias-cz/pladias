package utils;

import org.apache.commons.lang3.RandomStringUtils;

public class PasswordGenerator {

    private PasswordGenerator() {
    }

    public static String Generate(int passwordLength) {
        return RandomStringUtils.randomAlphanumeric(passwordLength);
    }
}
