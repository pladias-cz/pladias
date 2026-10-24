package service.user;

import io.ebean.DB;
import global.ServerConstants;
import mail.MailMessageBuilder;
import mail.MailService;
import models.PlayMessage;
import models.User;
import models.UserSettingPK;
import models.UserSettings;
import play.i18n.Messages;
import service.config.IConfigService;
import service.password.IHashService;

import javax.inject.Inject;
import javax.mail.MessagingException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * Reset zapomenutého hesla přes jednorázový odkaz (docs/security.md M2 – heslo se nikdy
 * neposílá e-mailem ani nevrací v API odpovědi, uživatel si nové heslo zvolí sám).
 *
 * Token má 256 bitů entropie (SecureRandom) a v DB se ukládá pouze jeho SHA-256 hash
 * do existující KV tabulky user_settings (žádná změna schématu). Platný je vždy jen
 * poslední vygenerovaný token, je jednorázový a platí omezenou dobu – stejný vzor
 * jako auth_token v {@code service.accessrights.TokenAuthService}.
 */
public class PasswordResetService {

    /** Klíč v user_settings; hodnota má tvar "<sha256hex>:<expiryMillis>". */
    public static final String ResetTokenKey = "password_reset_token";

    /** Platnost odkazu pro reset hesla v hodinách. */
    public static final int ValidityHours = 24;

    private static final char TokenValueSeparator = ':';

    private static final SecureRandom RNG = new SecureRandom();

    private final MailService mailService;
    private final IHashService hashService;
    private final IConfigService configService;

    @Inject
    public PasswordResetService(MailService mailService, IHashService hashService, IConfigService configService) {
        this.mailService = mailService;
        this.hashService = hashService;
        this.configService = configService;
    }

    /**
     * Vygeneruje jednorázový token, uloží jeho hash a pošle uživateli e-mail s odkazem
     * na nastavení nového hesla. Nový požadavek přepíše starý token (platný je vždy jen poslední).
     * Selhání odeslání mailu se loguje uvnitř MailService a nezpůsobí chybu požadavku.
     */
    public void requestPasswordReset(User user, Messages messages) throws MessagingException {
        String token = generateToken();
        saveToken(user, token);

        String resetLink = String.format("%s://%s/resetPassword?token=%s",
            ServerConstants.Protocol, ServerConstants.getHostname(), token);

        MailMessageBuilder mail = new MailMessageBuilder();
        mail.setSubject(messages.at("PasswordReset.mailSubject", configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY)));
        mail.setContents(messages.at("PasswordReset.mailBody",
            configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY), ValidityHours, resetLink));
        mail.addRecipient(user.getEmail());
        mailService.sendMail(mail.build());
    }

    /**
     * Ověří token – najde řádek v user_settings podle hashe, zkontroluje expiraci
     * a existenci nesmazaného uživatele.
     */
    public Optional<User> validateToken(String token) {
        if (token == null || token.isEmpty()) {
            return Optional.empty();
        }
        String hashedToken = hashToken(token);
        UserSettings settings = UserSettings.find().query().where()
            .eq("settings.key", ResetTokenKey)
            .startsWith("value", hashedToken + TokenValueSeparator)
            .findOne();
        if (settings == null || !isTokenValueValid(settings.getValue(), hashedToken)) {
            return Optional.empty();
        }
        User user = User.find().byId(settings.getSettings().getUserId());
        if (user == null || user.isDeleted()) {
            return Optional.empty();
        }
        return Optional.of(user);
    }

    /**
     * Nastaví uživateli nové heslo (Argon2id) a smaže token – ten je tedy jednorázový.
     * Volající musí token předem ověřit přes {@link #validateToken(String)}.
     */
    public void resetPassword(User user, String newPassword) {
        try {
            user.setPlainPassword(newPassword, hashService);
        } catch (Exception e) {
            // User.setPlainPassword deklaruje legacy checked výjimky z doby DES šifrování,
            // samotné hashování přes IHashService nic nevyhazuje
            throw new RuntimeException("Unable to hash password", e);
        }
        DB.update(user);
        deleteToken(user.getId());
    }

    private void saveToken(User user, String token) {
        UserSettings settings = UserSettings.find().query().where()
            .eq("settings.userId", user.getId())
            .eq("settings.key", ResetTokenKey)
            .findOne();
        if (settings == null) {
            UserSettingPK pk = new UserSettingPK();
            pk.setUserId(user.getId());
            pk.setKey(ResetTokenKey);
            settings = new UserSettings();
            settings.setSettings(pk);
        }
        settings.setValue(tokenValue(hashToken(token), System.currentTimeMillis()));
        settings.save();
    }

    private void deleteToken(Long userId) {
        UserSettings settings = UserSettings.find().query().where()
            .eq("settings.userId", userId)
            .eq("settings.key", ResetTokenKey)
            .findOne();
        if (settings != null) {
            settings.delete();
        }
    }

    /** Hodnota uložená v user_settings: "<sha256hex tokenu>:<expiryMillis>". */
    static String tokenValue(String hashedToken, long currentTimeMillis) {
        return hashedToken + TokenValueSeparator + (currentTimeMillis + ValidityHours * 3600_000L);
    }

    /** Ověří, že uložená hodnota odpovídá danému hashi tokenu a ještě nevypršela. */
    static boolean isTokenValueValid(String storedValue, String hashedToken) {
        if (storedValue == null) {
            return false;
        }
        int separatorIndex = storedValue.indexOf(TokenValueSeparator);
        if (separatorIndex < 0) {
            return false;
        }
        if (!storedValue.substring(0, separatorIndex).equals(hashedToken)) {
            return false;
        }
        long expiryMillis;
        try {
            expiryMillis = Long.parseLong(storedValue.substring(separatorIndex + 1));
        } catch (NumberFormatException e) {
            return false;
        }
        return System.currentTimeMillis() <= expiryMillis;
    }

    /** 32 náhodných bajtů z SecureRandom, Base64url bez paddingu (~43 znaků). */
    static String generateToken() {
        byte[] bytes = new byte[32]; // 256-bit entropy
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** SHA-256 hexadecimálně – v DB nikdy není samotný token. */
    static String hashToken(String token) {
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
}
