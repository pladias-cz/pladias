package controllers.security;

import models.User;

public class AuthorizedAsSysAdmin extends AuthenticatorBase {

    @Override
    protected boolean isAuthorized(User user) {
        return (user != null && user.isSysAdmin());
    }
}
