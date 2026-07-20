package views.utils;

import models.User;

public class UserViewUtils {

    public static String getFullUserNameHtml(User user) {
        StringBuilder builder = new StringBuilder();
        builder.append(user.getName()).append(' ').append(user.getSurname());
        builder.append(" <a href=\"mailto:");
        builder.append(user.getEmail());
        builder.append("\" title=\"poslat email\"><span class=\"fa fa-envelope-open-o\" aria-hidden=\"true\"></span></a>");
        return builder.toString();
    }

    public static String getUsersNames(String key) {
        StringBuilder builder = new StringBuilder();
        String separator = "";

        User[] users = utils.UserUtils.getUsersFromConfiguration(key);
        for (User user : users) {
            builder.append(separator)
                .append(user.getName())
                .append(' ')
                .append(user.getSurname());
            separator = ", ";
        }
        return builder.toString();
    }

    public static String getUsersNamesWithMailto(String key) {
        User[] users = utils.UserUtils.getUsersFromConfiguration(key);
        StringBuilder builder = new StringBuilder();
        String separator = "";

        for (User user : users) {
            builder.append(separator)
                .append(getFullUserNameHtml(user));
            separator = ", ";
        }
        return builder.toString();
    }
}
