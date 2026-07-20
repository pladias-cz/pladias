package service.accessrights;

import models.User;
import play.libs.typedmap.TypedKey;

public final class SecurityAttrs {
    public static final TypedKey<User> AUTH_USER = TypedKey.create("auth.user");

    private SecurityAttrs() {
    }
}
