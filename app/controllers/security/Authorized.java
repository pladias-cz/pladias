package controllers.security;

import models.User;

public class Authorized extends AuthenticatorBase {

    @Override
    protected boolean isAuthorized(User user) {
        return (user != null);
    }

}
