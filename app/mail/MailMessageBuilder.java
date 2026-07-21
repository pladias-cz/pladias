package mail;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.mail.MessagingException;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMultipart;
import javax.mail.util.ByteArrayDataSource;
import java.util.ArrayList;
import java.util.List;

public class MailMessageBuilder {

    private final List<String> recipients = new ArrayList<>();
    private String contents = "";
    private String subject = "";
    private final List<MimeBodyPart> attachments = new ArrayList<>();

    public MailMessageBuilder() {
    }


    public MailMessageBuilder addRecipient(String email) {
        recipients.add(email);
        return this;
    }

    public MailMessageBuilder addRecipients(List<String> emails) {
        recipients.addAll(emails);
        return this;
    }

    public MailMessageBuilder setContents(String contents) {
        this.contents = contents;
        return this;
    }

    public MailMessageBuilder addAttachment(MailAttachment attachment) throws MessagingException {
        DataSource dataSource = new ByteArrayDataSource(attachment.getData(), attachment.getMimeType());
        MimeBodyPart attachmentBodyPart = new MimeBodyPart();
        attachmentBodyPart.setDataHandler(new DataHandler(dataSource));
        attachmentBodyPart.setFileName(attachment.getFilename());
        attachments.add(attachmentBodyPart);
        return this;
    }

    public MailMessageBuilder setSubject(String subject) {
        this.subject = subject;
        return this;
    }

    public MailMessage build() throws MessagingException {
        MimeMultipart mimeMultipart = new MimeMultipart();

        MimeBodyPart textBodyPart = new MimeBodyPart();
        textBodyPart.setText(contents);
        mimeMultipart.addBodyPart(textBodyPart);

        for (MimeBodyPart attachment : attachments) {
            mimeMultipart.addBodyPart(attachment);
        }

        return new MailMessage(recipients, subject, mimeMultipart);
    }
}
