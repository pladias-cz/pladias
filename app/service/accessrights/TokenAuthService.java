package service.accessrights;

import io.ebean.DB;
import models.User;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

public class TokenAuthService implements ITokenAuthService {
    private static final SecureRandom RNG = new SecureRandom();

    public static String createToken(User user) {
        String tokenValue = generateBearerToken();
        user.setAuthToken(hashToken(tokenValue));
        DB.update(user);
        return tokenValue;
    }

    private static String generateBearerToken() {
        byte[] bytes = new byte[32]; // 256-bit entropy
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String token) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(token.getBytes(StandardCharsets.UTF_8));

            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    @Override
    public Optional<User> authenticatedUser(String token) {
        String hashedToken = hashToken(token);
        User found_user = User.find().query().where().eq("auth_token", hashedToken).findOne();
        if (found_user == null) {
            return Optional.empty();
        }
        return Optional.of(found_user);
    }
}
