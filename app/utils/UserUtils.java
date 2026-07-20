package utils;

import io.ebean.Junction;
import models.User;
import models.traits.Feature;
import models.traits.Trait;
import models.traits.VisibilityStatus;
import platform.ProjectConstants;
import play.Logger;

import java.util.ArrayList;
import java.util.List;

public class UserUtils {

    public static boolean isElligibleForTraitDownload(User user, Trait t) {
        if (user.isTraitAdmin())
            return true;

        VisibilityStatus visibility = t.getVisibilityStatus();

        if (visibility.getId() == VisibilityStatus.PublicAccessId ||
            visibility.getId() == VisibilityStatus.RegisteredAccessId) {
            return true;
        }

        //is current user feature admin?
        return user.supervises(t.getFeature());
    }

    public static boolean isElligibleForTraitDeletion(User user, Feature feature) {
        return isFeatureOwner(user, feature);
    }

    public static boolean isElligibleForTraitImport(User user, Feature feature) {
        return isFeatureOwner(user, feature);
    }

    private static boolean isFeatureOwner(User user, Feature feature) {
        return user.supervises(feature);
    }

    public static boolean isTraitAdmin(User user) {
        return user.getId() == ConfigHelper.getLong(ProjectConstants.TraitMasterAdminKey);
    }

    public static User getMasterAdmin() {
        return User.find().byId(ConfigHelper.getLong(ProjectConstants.MasterAdminKey));
    }

    public static User[] getMapDesigners() {
        List<Integer> userIds = ConfigHelper.getIntList(ProjectConstants.MapDesignersKey);
        return getUsersByIds(userIds);
    }

    private static User[] getUsersByIds(List<Integer> userIds) {
        List<User> users = new ArrayList<User>();
        for (int userId : userIds) {
            User user = User.find().byId((long) userId);
            if (user != null) {
                users.add(user);
            } else {
                Logger.error(String.format("Unable to find employee with id {%d}", userId));
            }
        }
        return users.toArray(new User[users.size()]);
    }

    public static User[] getUsersFromConfiguration(String configKey) {
        if (!ConfigHelper.hasKey(configKey)) {
            return new User[0];
        }
        try {
            int userId = ConfigHelper.getInteger(configKey);
            return new User[]{User.find().byId((long) userId)};
        } catch (Exception e) {
        }

        List<Integer> userIds = ConfigHelper.getIntList(configKey);
        return getUsersByIds(userIds);
    }


    public static User getBulkImporter() {
        return User.find().byId(utils.ConfigHelper.getLong(ProjectConstants.BulkEditsUserKey));
    }

    public static boolean isAsyncImporter(User user) {
        List<User> importers = getAsyncImporters();
        return importers.stream().anyMatch((candiate) -> candiate.getEmail().equals(user.getEmail()));
    }

    public static List<User> getAsyncImporters() {

        List<String> candidateEmails = utils.ConfigHelper.getStringList(ProjectConstants.AsyncImportersEmail);

        Junction<User> junction = User.find().query().where().disjunction();
        for (String candidateEmail : candidateEmails) {
            junction.eq("email", candidateEmail);
        }
        return junction.findList();
    }
}
