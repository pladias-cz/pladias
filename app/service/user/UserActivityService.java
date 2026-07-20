package service.user;

import controllers.Application;
import models.User;
import models.UserActivity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Http.Session;
import utils.SessionUtils;

public class UserActivityService {

    final static Logger logger = LoggerFactory.getLogger(Application.class);

    private UserActivityService() {
    }

    public static void recordActivity(Session session, int activityId, ActivityDetails activityDetails) {
        User user = SessionUtils.getCurrentUser(session);
        recordActivity(user, activityId, activityDetails);
    }

    public static void recordActivity(Session session, int activityId) {
        User user = SessionUtils.getCurrentUser(session);
        recordActivity(user, activityId, null);
    }

    public static void recordActivity(User user, int activityId) {
        recordActivity(user, activityId, null);
    }

    private static void recordActivity(User user, int activityId, ActivityDetails activityDetails) {
        try {
            UserActivity ua = new UserActivity();
            ua.setUser(user);
            ua.setActivityId(activityId);
            if (activityDetails != null) {
                ua.setOldValue(activityDetails.oldValue);
                ua.setNewValue(activityDetails.newValue);
                ua.setDescription(activityDetails.description);
            }
            ua.save();
        } catch (Exception ex) {
            logger.error("Unable to log UserActivity", ex);
        }
    }
}
