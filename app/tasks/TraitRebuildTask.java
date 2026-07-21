package tasks;

import mail.MailMessageBuilder;
import mail.MailService;
import models.User;
import models.traits.Trait;
import org.apache.commons.lang3.time.StopWatch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import repositories.ITraitRepository;
import service.trait.ITraitService;
import utils.TimeUtils;

import javax.mail.MessagingException;
import java.util.concurrent.TimeUnit;

public class TraitRebuildTask implements ITask {

    private final Logger _logger = LoggerFactory.getLogger(TraitRebuildTask.class);

    private final User _user;

    private final MailService _mailService;

    private final Messages _messages;

    private final ITraitRepository _traitRepository;

    private final ITraitService _traitService;

    public TraitRebuildTask(User user, ITraitRepository traitRepository, ITraitService traitService, MailService mailer, Messages messages) {
        _user = user;
        _traitRepository = traitRepository;
        _traitService = traitService;
        _mailService = mailer;
        _messages = messages;
    }

    @Override
    public String getName() {
        String name = "traitRebuildTask";
        return name;
    }

    @Override
    public void execute() {
        try {
            int traitCounter = 0;
            StopWatch stopWatch = new StopWatch();
            stopWatch.start();
            StringBuilder errors = new StringBuilder();
            for (Trait trait : _traitRepository.getStandardTraits()) {
                recompute(trait, errors);
                traitCounter++;
            }
            _logger.info("Trait values repopulated");
            _traitService.vacuumTables();

            notifyUser(errors, stopWatch, traitCounter);
        } catch (Exception ex) {
            _logger.error("Failed trait repopulation", ex);
        }
    }

    private void notifyUser(StringBuilder errors, StopWatch stopWatch, int traitsProcessed) throws MessagingException {
        MailMessageBuilder builder = new MailMessageBuilder();
        builder.setSubject(_messages.at("TraitRebuildTask.RebuildCompletedEmailSubject"));
        builder.addRecipient(_user.getEmail());
        builder.setContents(createContents(traitsProcessed, stopWatch, errors));
        _mailService.sendMail(builder.build());
    }

    private String createContents(int traitsProcessed, StopWatch stopWatch, StringBuilder errors) {
        long seconds = stopWatch.getTime(TimeUnit.SECONDS);
        String time = TimeUtils.formatToString(seconds);
        return _messages.at("TraitRebuildTask.RebuildCompletedEmailContents", traitsProcessed, time, errors.toString());
    }

    private void recompute(Trait trait, StringBuilder errors) {
        try {
            _traitService.recomputeTraitValues(trait);
        } catch (Exception e) {
            errors.append(e.getMessage());
        }
    }
}
