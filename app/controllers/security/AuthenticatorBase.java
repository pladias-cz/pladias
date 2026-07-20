package controllers.security;

import controllers.routes;
import models.User;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Result;
import play.mvc.Security;
import utils.ConfigHelper;
import utils.SessionUtils;

import java.util.Optional;


public abstract class AuthenticatorBase extends Security.Authenticator {
    private static final String GET = "GET";

    final Logger logger = LoggerFactory.getLogger(AuthenticatorBase.class);


    @Override
    public java.util.Optional<java.lang.String> getUsername(play.mvc.Http.Request ctx) {
        User user = SessionUtils.getCurrentUser(ctx.session());

        if (user == null) {
            return Optional.empty();
        }

        if (!ConfigHelper.getBoolean("debug") && !UserActivityMap.getInstance().isUserActive(user.getId())) {
            logger.info(String.format("User %s was automatically logged off", user.getEmail()));
            return Optional.empty();
        }

        UserActivityMap.getInstance().refreshUser(user);

        if (isAuthorized(user)) {
            return Optional.of(user.getEmail());
        }

        return Optional.empty();
    }

    @Override
    public Result onUnauthorized(play.mvc.Http.Request ctx) {
        Result result = redirect(routes.Application.login())
            .flashing("error", "Not Authorized")
            .withNewSession();

        if (GET.equals(ctx.method()) && StringUtils.isNotBlank(ctx.uri())) {
            result = result.addingToSession(ctx, SessionUtils.TargetUrlKey, ctx.uri());
        }
        try {
            Thread.sleep(5000);//slow down possible attacker
        } catch (Exception e) {
        }
        return result;
    }

    protected abstract boolean isAuthorized(User user);

}
