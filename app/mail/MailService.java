package mail;

import com.google.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.config.IConfigService;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.util.Properties;

public class MailService {

    private static final String MailSmtpHostKey = "mail.smtp.host";
    private static final String MailUserKey = "mail.user";

    private static final String MailFromKey = "mail.from";
    private static final String MailPasswordKey = "mail.password";
    private static final String MailSmtpPortKey = "mail.smtp.port";
    private static final String MailSmtpSocketFactoryPort = "mail.smtp.socketFactory.port";
    private static final String MailSmtpAuth = "mail.smtp.auth";
    private static final String MailSmtpStartTlsEnableKey = "mail.smtp.starttls.enable";
    private static final String MailSmtpStartTlsRequiredKey = "mail.smtp.starttls.required";
    private static final String MailSmtpSslEnableKey = "mail.smtp.ssl.enable";
    private static final String MailSmtpSslTrustKey = "mail.smtp.ssl.trust";
    private static final String MailSmtpSocketFactoryClassKey = "mail.smtp.socketFactory.class";

    private final String username;
    private final String password;
    private final String mailFrom;

    private final Logger _logger = LoggerFactory.getLogger(MailService.class);

    private final IConfigService _configService;

    @Inject
    public MailService(IConfigService configService) {
        _configService = configService;

        username = _configService.getString(MailUserKey);
        password = _configService.getString(MailPasswordKey);
        mailFrom = _configService.getString(MailFromKey);
    }

    private Session createSession() {
        Properties props = new Properties();

        String value = _configService.getString(MailSmtpHostKey);
        props.setProperty(MailSmtpHostKey, value);
        props.setProperty(MailSmtpSslTrustKey, "*");

        value = _configService.getString(MailSmtpPortKey);
        props.setProperty(MailSmtpPortKey, value);
        props.setProperty(MailSmtpSocketFactoryPort, value);

        value = _configService.getString(MailSmtpAuth);
        props.setProperty(MailSmtpAuth, value);

        value = _configService.getString(MailSmtpStartTlsEnableKey);
        props.setProperty(MailSmtpStartTlsEnableKey, value);

        value = _configService.getString(MailSmtpStartTlsRequiredKey);
        props.setProperty(MailSmtpStartTlsRequiredKey, value);

        value = _configService.getString(MailSmtpSslEnableKey);
        props.setProperty(MailSmtpSslEnableKey, value);

        props.put(MailSmtpSocketFactoryClassKey, "javax.net.ssl.SSLSocketFactory");

        //props.put("mail.smtp.reportsuccess","true");
        //props.put("mail.debug", "true");

        return Session.getInstance(props, new javax.mail.Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });
    }

    public void sendMail(MailMessage m) {
        try {
            Session session = createSession();
            MimeMessage message = new MimeMessage(session);
            message.setSubject(m.getSubject());
            for (String recipient : m.getRecepientEmails()) {
                message.addRecipient(MimeMessage.RecipientType.TO, new InternetAddress(recipient));
            }
            message.setFrom(new InternetAddress(mailFrom));
            message.setContent(m.getBody());

            try {
                Transport.send(message);
            } catch (SendFailedException e) {
                StringBuilder builder = new StringBuilder();
                if (e.getInvalidAddresses() != null) {
                    builder.append("Invalid addresses: ");
                    for (Address addr : e.getInvalidAddresses()) {
                        builder.append(addr.toString()).append(" ");
                    }
                }
                builder.append("message:" + e.getMessage());
                _logger.error(builder.toString());
                _logger.error("Error while sending email.", e);
                _logger.error("Error while sending email - inner exception:.", e.getNextException());

                e.printStackTrace();
            } catch (Exception e) {
                _logger.error("Error while sending email.", e);
                e.printStackTrace();
            }
        } catch (MessagingException me) {
            _logger.error(me.getMessage(), me);
        }
    }
}
