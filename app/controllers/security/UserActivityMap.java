package controllers.security;

import models.User;
import org.joda.time.DateTime;
import org.joda.time.DateTimeConstants;

import java.util.HashMap;

public class UserActivityMap {

    private static UserActivityMap instance;
    private final HashMap<Long, DateTime> userActivityMap;

    private UserActivityMap() {
        userActivityMap = new HashMap<Long, DateTime>();
    }

    public static synchronized UserActivityMap getInstance() {
        if (instance == null) {
            instance = new UserActivityMap();
        }
        return instance;
    }

    public void refreshUser(User user) {
        userActivityMap.put(user.getId(), new DateTime());
    }

    public boolean isUserActive(long userId) {
        if (!userActivityMap.containsKey(userId))
            return false;

        DateTime lastActivityTimestamp = userActivityMap.get(userId);
        DateTime now = new DateTime();

        long diff = (now.getMillis() - lastActivityTimestamp.getMillis());
        return diff <= (2 * DateTimeConstants.MILLIS_PER_HOUR);
    }
}
