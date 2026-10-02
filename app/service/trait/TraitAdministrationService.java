package service.trait;

import exceptions.NotEligibleException;
import io.ebean.DB;
import io.ebean.Transaction;
import mail.MailService;
import models.User;
import models.traits.Feature;
import models.traits.Trait;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import repositories.ITraitRepository;
import scheduler.SingleThreadedExecutor;
import tasks.TraitRebuildTask;
import utils.UserUtils;

import javax.inject.Inject;
import java.util.List;

/**
 * Administrative operations with traits - deletion, switching the default trait and the
 * recomputation of all trait values.
 */
public class TraitAdministrationService {

    private final Logger logger = LoggerFactory.getLogger(TraitAdministrationService.class);

    @Inject
    private ITraitService traitService;

    @Inject
    private ITraitRepository traitRepository;

    @Inject
    private MailService mailService;

    @Inject
    private SingleThreadedExecutor singleThreadedExecutor;

    public TraitActionResult deleteTrait(User user, Messages messages, int traitId) {
        Trait trait = Trait.find().byId(traitId);
        Feature feature = trait.getFeature();

        if (!UserUtils.isElligibleForTraitDeletion(user, feature)) {
            return TraitActionResult.failure(messages.at("TraitsController.UserNotElligible"));
        }

        trait.setDeleted(true);
        boolean isDefault = trait.isDefault();

        try {
            trait.setDefault(false);
            trait.save();
            if (isDefault) {
                assignNewDefaultTrait(feature.getId());
            }
            return TraitActionResult.success(messages.at("TraitsController.traitDeleted"));
        } catch (Exception e) {
            return TraitActionResult.failure(messages.at("TraitsController.deletionFailed"));
        }
    }

    public TraitActionResult setDefaultTrait(User user, Messages messages, int traitId) {
        Trait trait = Trait.find().byId(traitId);
        if (trait == null) {
            return TraitActionResult.failure(messages.at("TraitsController.TraitDoesNotExits"));
        }

        if (!user.isTraitAdmin() && user.equals(trait.getFeature().getAdmin())) {
            return TraitActionResult.failure(messages.at("TraitsController.UserNotElligible"));
        }

        Feature f = trait.getFeature();
        List<Trait> traits = f.getSubordinateTraits();

        for (Trait t : traits) {
            t.setDefault(false);
        }
        trait.setDefault(true);

        try (Transaction transaction = DB.beginTransaction()) {
            DB.saveAll(traits);
            DB.save(trait);
            transaction.commit();
        } catch (Exception e) {
            logger.error("Unable to set default trait", e);
            return TraitActionResult.failure(messages.at("TraitsController.UnableToSetDefaultTrait"));
        }

        return TraitActionResult.success();
    }

    /**
     * Registers the recomputation of all trait values to run in background.
     *
     * @throws NotEligibleException if the user is not a trait administrator
     */
    public void recomputeAllTraits(User currentUser, Messages messages) throws NotEligibleException {
        if (!currentUser.isTraitAdmin()) {
            throw new NotEligibleException(messages.at("TraitsController.UserNotElligible"));
        }

        TraitRebuildTask rebuildTask = new TraitRebuildTask(currentUser, traitRepository, traitService, mailService, messages);

        singleThreadedExecutor.register(() -> rebuildTask.execute());
    }

    private void assignNewDefaultTrait(int featureId) {
        Trait newDefault = Trait.find().query().where()
            .eq("feature.id", featureId)
            .eq("deleted", false)
            .orderBy("id asc")
            .setMaxRows(1)
            .findOne();
        if (newDefault != null) {
            newDefault.setDefault(true);
            newDefault.save();
        }
    }
}
