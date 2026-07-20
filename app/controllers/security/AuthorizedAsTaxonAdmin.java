package controllers.security;

import models.User;

public class AuthorizedAsTaxonAdmin extends AuthenticatorBase {

    @Override
    protected boolean isAuthorized(User user) {
        return (user != null && user.isTaxonAdmin());
    }
}
