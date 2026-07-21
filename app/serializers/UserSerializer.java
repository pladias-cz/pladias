package serializers;

import models.User;

import java.util.List;

public class UserSerializer {

    public static String serialize(List<User> users, boolean includeFirstNames) {
        StringBuilder builder = new StringBuilder();

        for (User u : users) {
            if (!builder.isEmpty()) {
                builder.append(", ");
            }
            if (includeFirstNames) {
                builder.append(String.format("%s ", u.getName()));
            }
            builder.append(String.format("%s", u.getSurname()));
        }
        return builder.toString();
    }
}
