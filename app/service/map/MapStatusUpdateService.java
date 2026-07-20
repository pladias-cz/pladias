package service.map;

import mail.*;
import models.Taxon;
import models.TaxonMapSettings;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import service.config.IConfigService;
import service.taxon.ITaxonService;

import javax.mail.MessagingException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public abstract class MapStatusUpdateService {

    protected final ITaxonService taxonService;
    protected final User currentUser;
    protected final Messages messages;
    protected final IConfigService _configService;

    private final Logger _logger = LoggerFactory.getLogger(MapStatusUpdateService.class);

    public MapStatusUpdateService(User currentUser, ITaxonService taxonService, IConfigService configService, Messages messages) {
        this.currentUser = currentUser;
        this.taxonService = taxonService;
        this._configService = configService;
        this.messages = messages;
    }

    public abstract void update(TaxonMapSettings settings, int newStatus) throws Exception;

    protected abstract String getCurrentStatusDescription(TaxonMapSettings settings);

    protected MailMessage getMailMessage(MailInfo mailInfo) throws MessagingException {
        MailMessageBuilder builder = new MailMessageBuilder();
        builder.setSubject(mailInfo.getSubject());
        builder.setContents(mailInfo.getContents());
        builder.addRecipient(mailInfo.getRecipient().getEmail());
        for (MailAttachment attachment : mailInfo.getAttachments()) {
            builder.addAttachment(attachment);
        }
        return builder.build();
    }

    protected void notifyAdminByEmail(TaxonMapSettings settings, User recipient) {
        MailInfo mailInfo = prepareMailInfo(settings, recipient, new MailAttachment[0]);
        try {
            MailMessage message = getMailMessage(mailInfo);
            new MailService(_configService).sendMail(message);
            _logger.info(String.format("Email sent to: '%s'", mailInfo.getRecipient().getEmail()));
        } catch (MessagingException e) {
            _logger.error("Unable to send e-mail notification", e);
        }
    }

    //can be overriden
    protected MailInfo prepareMailInfo(TaxonMapSettings settings, User recipient, MailAttachment[] attachments) {
        Taxon taxon = Taxon.find().byId(settings.getId());

        String subject = messages.at("MapStatusUpdateService.taxonStatusChangeSubject", taxon.getNameLat());
        String contents = messages.at("MapStatusUpdateService.taxonStatusChangeAdminMailContents",
            taxon.getNameLat(), getCurrentStatusDescription(settings), currentUser.getEmail());

        MailInfo mailInfo = new MailInfo(subject, contents, recipient);
        for (MailAttachment attachment : attachments) {
            mailInfo.addAttachment(attachment);
        }
        return mailInfo;
    }

    protected void notifyRevisorsByEmail(TaxonMapSettings settings, String contents, User adminUserThatWasAlreadyNotified) {
        Taxon taxon = Taxon.find().byId(settings.getId());
        String subject = String.format("PLADIAS: taxon %s status change", taxon.getNameLat());

        Set<User> revisors = taxonService.getInheritedRevisors(taxon);
        if (adminUserThatWasAlreadyNotified != null) {
            revisors.remove(adminUserThatWasAlreadyNotified);
        }

        List<String> revisorEmails = getRevisorEmails(revisors);
        try {
            MailMessageBuilder builder = new MailMessageBuilder();
            builder.setSubject(subject);
            builder.setContents(contents);
            builder.addRecipients(revisorEmails);
            new MailService(_configService).sendMail(builder.build());
        } catch (MessagingException e) {
            _logger.error("Unable to send e-mail notification", e);
        }
    }

    private List<String> getRevisorEmails(Set<User> revisors) {
        List<String> emails = new ArrayList<String>();
        for (User r : revisors) {
            emails.add(r.getEmail());
        }
        return emails;
    }

}
