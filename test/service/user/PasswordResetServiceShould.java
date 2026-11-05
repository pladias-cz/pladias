package service.user;

import org.junit.Assert;
import org.junit.Test;

import java.util.HashSet;
import java.util.Set;

/**
 * Testy logiky reset tokenu z PasswordResetService (M2 – reset hesla přes
 * jednorázový odkaz místo posílání hesla e-mailem). Testuje se čistá část bez
 * závislosti na DB (user_settings) – DB vrstva nemá v testech harness
 * a vzor je krytý stejným kódem jako TokenAuthService.
 */
public class PasswordResetServiceShould {

    @Test
    public void generateUrlSafeTokenWithSufficientEntropy() {
        String token = PasswordResetService.generateToken();

        // 32 bajtů Base64url bez paddingu = 43 znaků, jen URL-safe znaky
        Assert.assertEquals(43, token.length());
        Assert.assertTrue(token.matches("[A-Za-z0-9_-]+"));
    }

    @Test
    public void generateDistinctTokens() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            tokens.add(PasswordResetService.generateToken());
        }
        Assert.assertEquals(100, tokens.size());
    }

    @Test
    public void hashTokenDeterministically() {
        String hash1 = PasswordResetService.hashToken("token");
        String hash2 = PasswordResetService.hashToken("token");

        // SHA-256 hex = 64 znaků
        Assert.assertEquals(64, hash1.length());
        Assert.assertEquals(hash1, hash2);
        Assert.assertTrue(hash1.matches("[0-9a-f]+"));
    }

    @Test
    public void validateStoredTokenValueRoundTrip() {
        String hashedToken = PasswordResetService.hashToken(PasswordResetService.generateToken());
        String storedValue = PasswordResetService.tokenValue(hashedToken, System.currentTimeMillis());

        Assert.assertTrue(PasswordResetService.isTokenValueValid(storedValue, hashedToken));
    }

    @Test
    public void rejectExpiredStoredTokenValue() {
        String hashedToken = PasswordResetService.hashToken("token");
        // uložené před 25 hodinami (platnost je 24 h)
        String expired = PasswordResetService.tokenValue(hashedToken, System.currentTimeMillis() - 25 * 3600_000L);

        Assert.assertFalse(PasswordResetService.isTokenValueValid(expired, hashedToken));
    }

    @Test
    public void rejectStoredValueForDifferentToken() {
        String hashedToken = PasswordResetService.hashToken("token");
        String differentHash = PasswordResetService.hashToken("other-token");
        String storedValue = PasswordResetService.tokenValue(hashedToken, System.currentTimeMillis());

        Assert.assertFalse(PasswordResetService.isTokenValueValid(storedValue, differentHash));
    }

    @Test
    public void rejectCorruptedStoredValues() {
        String hashedToken = PasswordResetService.hashToken("token");

        Assert.assertFalse(PasswordResetService.isTokenValueValid(null, hashedToken));
        // chybí oddělovač s expirací
        Assert.assertFalse(PasswordResetService.isTokenValueValid(hashedToken, hashedToken));
        // nečíselná expirace
        Assert.assertFalse(PasswordResetService.isTokenValueValid(hashedToken + ":zítra", hashedToken));
    }
}
