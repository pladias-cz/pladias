package mail;

import models.User;

import java.util.ArrayList;
import java.util.List;

public class MailInfo {
    private final String subject;
    private final String contents;
    private final User recipient;
    private final List<MailAttachment> attachments;

    public MailInfo(String subject, String contents, User recipient) {
        this.subject = subject;
        this.contents = contents;
        this.recipient = recipient;
        attachments = new ArrayList<MailAttachment>();
    }

    public String getSubject() {
        return subject;
    }

    public String getContents() {
        return contents;
    }

    public User getRecipient() {
        return recipient;
    }

    public MailAttachment[] getAttachments() {
        return attachments.toArray(new MailAttachment[attachments.size()]);
    }

    public void addAttachment(MailAttachment attachment) {
        attachments.add(attachment);
    }

}
