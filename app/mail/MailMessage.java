package mail;

import javax.mail.internet.MimeMultipart;
import java.util.ArrayList;
import java.util.List;

public class MailMessage {
    private final List<String> recipients;
    private final String subject;
    private final MimeMultipart body;

    public MailMessage(String recipientEmail, String subject, MimeMultipart body) {
        recipients = new ArrayList<>();
        recipients.add(recipientEmail);
        this.subject = subject;
        this.body = body;
    }

    public MailMessage(List<String> recipients, String subject, MimeMultipart body) {
        this.recipients = recipients;
        this.subject = subject;
        this.body = body;
    }

    public List<String> getRecepientEmails() {
        return recipients;
    }

    public String getSubject() {
        return subject;
    }

    public MimeMultipart getBody() {
        return body;
    }
}
