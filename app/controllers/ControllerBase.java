package controllers;

import models.User;
import platform.ProjectConstants;
import play.api.i18n.MessagesImpl;
import play.i18n.Lang;
import play.i18n.Messages;
import play.mvc.Controller;
import play.mvc.Http;
import play.mvc.Http.Session;
import service.config.IConfigService;
import utils.SessionUtils;

import javax.inject.Inject;

public abstract class ControllerBase extends Controller {

    protected static final String FlashError = "error";
    protected static final String FlashInfo = "info";
    @Inject
    protected IConfigService configService;
    @Inject
    private play.i18n.MessagesApi messagesApi;

    protected Messages getMessages(Http.Request request) {
        return getMessages(request.session());
    }

    protected Messages getMessages(Session session) {
        User currentUser = SessionUtils.getCurrentUser(session);
        Lang lang = Lang.forCode(ProjectConstants.DefaultLang);
        if (currentUser != null) {
            lang = currentUser.getLanguage();
        }
        return buildMessages(lang);
    }

    protected Messages getMessages(User user) {
        Lang lang = user.getLanguage();
        return buildMessages(lang);
    }

    private Messages buildMessages(Lang lang) {
        return new MessagesImpl(lang.asJava(), messagesApi.asScala()).asJava();
    }
}
