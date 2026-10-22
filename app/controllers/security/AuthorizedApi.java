package controllers.security;

import models.User;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;

import java.util.Map;

/**
 * Autentizace JSON endpointů konzumovaných výhradně frontendovým apiClientem
 * (fetch). Na rozdíl od {@link AuthenticatorBase} nevrací redirect na login –
 * ten by fetch tiše sledoval a jako soubor stáhl HTML přihlašovací stránky –
 * ale standardní HTTP 401 s JSON chybou; apiClient na něj přesměruje na /login
 * (apiClient.handleUnauthorized).
 */
public class AuthorizedApi extends AuthenticatorBase {

    @Override
    protected boolean isAuthorized(User user) {
        return (user != null);
    }

    @Override
    public Result onUnauthorized(Http.Request ctx) {
        try {
            Thread.sleep(5000);//slow down possible attacker
        } catch (Exception e) {
        }
        return unauthorized(Json.toJson(Map.of("error", "Not Authorized")))
            .withNewSession();
    }
}
