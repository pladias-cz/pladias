package controllers;

import controllers.security.Authorized;
import controllers.security.UserActivityMap;
import models.User;
import models.UserActivity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Http.Request;
import play.mvc.Http.Session;
import play.mvc.Result;
import play.mvc.Security;
import service.password.IHashService;
import service.taxon.TaxonUpdaterService;
import service.user.UserActivityService;
import utils.SessionUtils;
import utils.TaxonEditorLock;
import utils.ViteManifest;
import views.html.login;

import javax.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class Application extends ControllerBase {

    final Logger logger = LoggerFactory.getLogger(Application.class);
    private final ViteManifest vite;
    @Inject
    private FormFactory formFactory;

    @Inject
    private IHashService hashService;

    @Inject
    public Application(ViteManifest vite) {
        this.vite = vite;
    }

    @Security.Authenticated(Authorized.class)
    public Result index(Http.Request request) {
        Session session = request.session();
        User currentUser = SessionUtils.getCurrentUser(session);
        if (currentUser == null) {
            return ok(login.render(configService, request));
        }
        String jsFile = vite.jsFile("src/index.tsx");
        List<String> cssFiles = vite.cssFiles("src/index.tsx");
        return ok(views.html.react.index.render(jsFile, cssFiles, request));
    }

    public Result login(Http.Request request) {
        try {
            return doLogin(request);

        } catch (Exception ex) {
            logger.error("Error during login", ex);
        }
        return ok(login.render(configService, request));
    }

    private Result doLogin(Request request) {
        Session session = request.session();
        User user = SessionUtils.getCurrentUser(session);
        if (user == null) {
            return ok(login.render(configService, request));
        }

        Messages messages = getMessages(request);
        UserActivityMap map = UserActivityMap.getInstance();
        if (!map.isUserActive(user.getId())) {
            backupTaxonTreeIfNeeded(session);
            return ok(login.render(configService, request))
                .flashing(SessionUtils.FailureReason, messages.at("Application.inactivity"));
        }

        Optional<String> targetUrl = request.session().getOptional(SessionUtils.TargetUrlKey);
        if (!targetUrl.isPresent()) {
            return index(request);
        }
        //clear per-request session value
        return redirect(targetUrl.get()).removingFromSession(request, SessionUtils.TargetUrlKey);
    }

    public Result logout(Http.Request request) {
        Session session = request.session();
        Messages messages = getMessages(request);
        UserActivityService.recordActivity(session, UserActivity.Logout);

        backupTaxonTreeIfNeeded(session);
        return redirect(controllers.routes.Application.login())
            .withNewSession()
            .flashing(SessionUtils.FailureReason, messages.at("Application.userHasLoggedOut"));
    }

    private void backupTaxonTreeIfNeeded(Session session) {
        User currentUser = SessionUtils.getCurrentUser(session);
        if (TaxonEditorLock.Instance.HoldsLock(currentUser)) {
            boolean isDirty = TaxonEditorLock.Instance.IsDirty();
            TaxonEditorLock.Instance.Unlock(currentUser);
            logger.info(String.format("User %s unlocked taxon editor", currentUser.getSurname()));
            if (isDirty) {
                logger.info("Creating taxon tree snapshot");
                TaxonUpdaterService service = new TaxonUpdaterService();
                service.createTaxonTreeSnapshot(currentUser);
                TaxonEditorLock.Instance.SetDirty(false);
            }
        }
    }

    public Result authenticate(Http.Request request) {
        try {
            return doAuthenticate(request);
        } catch (Exception ex) {
            logger.error("Failure during authentication", ex);
        }

        return redirect(controllers.routes.Application.login());
    }

    private Result redirectWithDelay(play.mvc.Call call) {
        try {
            Thread.sleep(5000);
        } catch (Exception e) {
        }
        return redirect(call);
    }

    private Result doAuthenticate(Request request) {

        logger.info("Starting user authentication.");
        Form<Login> loginForm = formFactory.form(Login.class).bindFromRequest(request);

        if (loginForm.hasErrors()) {
            logger.info("Login details have errors.");

            return redirectWithDelay(controllers.routes.Application.login());
        }
        Login loginDetails = loginForm.get();
        User user = null;
        try {
            user = getUserFromLogin(loginDetails.getEmail());
        } catch (Exception e) {
            logger.error("Unable to login", e);
            return redirectWithDelay(controllers.routes.Application.login())
                .flashing(SessionUtils.FailureReason, e.getMessage());
        }

        Messages messages = getMessages(request);
        if (user == null) {
            logger.info("unable to identify user " + loginDetails.getEmail());

            return redirectWithDelay(controllers.routes.Application.login())
                .flashing(SessionUtils.FailureReason, messages.at("Application.invalidUserNameOrPassword"));
        }
        if (!user.verifyPassword(loginForm.get().password, hashService)) {
            logger.info("User password verification failed.");
            return redirectWithDelay(controllers.routes.Application.login())
                .flashing(SessionUtils.FailureReason, messages.at("Application.invalidUserNameOrPassword"));
        }
        if (user.isDeleted()) {
            return redirectWithDelay(controllers.routes.Application.login())
                .flashing(SessionUtils.FailureReason, messages.at("Application.userIsDeleted"));
        }
        logger.info("User successfully authenticated.");

        UserActivityMap.getInstance().refreshUser(user);
        UserActivityService.recordActivity(user, UserActivity.Login);
        logger.info(String.format("User %s logged in", user.getEmail()));

        Map<String, String> map = new HashMap<String, String>();
        map.put(SessionUtils.UserIdKey, "" + user.getId());
        map.put(SessionUtils.EmailKey, user.getEmail());

        return buildAthenticationResponse(request, map);
    }

    private Result buildAthenticationResponse(Request request, Map<String, String> map) {

        Result result = null;
        Optional<String> targetUrl = request.session().getOptional(SessionUtils.TargetUrlKey);
        if (targetUrl.isPresent()) {
            logger.info("Removing TargtUrlKey from session");
            result = redirect(targetUrl.get())
                .removingFromSession(request, SessionUtils.TargetUrlKey);
        } else {
            result = redirect(controllers.routes.Application.index());
        }

        return result.addingToSession(request, map);
    }

    private User getUserFromLogin(String email) {
        return User.find().query().where().ieq("email", email).findOne();
    }

    public static class Login {
        @Required
        private String email;
        @Required
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
