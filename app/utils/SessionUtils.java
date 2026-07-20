package utils;

import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Http.Session;

import java.util.Optional;

public class SessionUtils {

    public final static String FailureReason = "failureReason";
    public static final String UserIdKey = "userId";
    public static final String EmailKey = "email";
    public static final String TargetUrlKey = "targetUrl";
    final static Logger logger = LoggerFactory.getLogger(SessionUtils.class);
    public static long InvalidUserId = -1;

    public static User getCurrentUser(Session session) {
        long userId = getCurrentUserId(session);
        if (userId == InvalidUserId)
            return null;

        return User.find().byId(userId);
    }

    public static long getCurrentUserId(Session session) {
        long result = InvalidUserId;
        Optional<String> userIdValue = session.getOptional(UserIdKey);
        if (userIdValue.isPresent()) {
            result = Long.parseLong(userIdValue.get());
        }
        return result;
    }

}
