package service.accessrights;

import models.User;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import javax.inject.Inject;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class BearerAuthAction extends Action.Simple {
    private final ITokenAuthService tokenAuthService;

    @Inject
    public BearerAuthAction(ITokenAuthService tokenAuthService) {
        this.tokenAuthService = tokenAuthService;
    }

    @Override
    public CompletionStage<Result> call(Http.Request req) {
        Optional<String> bearer = extractBearer(req);
        if (bearer.isEmpty()) {
            return CompletableFuture.completedFuture(
                Results.unauthorized("Missing Bearer token")
            );
        }

        Optional<User> user = tokenAuthService.authenticatedUser(bearer.get());
        if (user.isEmpty()) {
            return CompletableFuture.completedFuture(
                Results.unauthorized("Invalid or expired token")
            );
        }

        Http.Request withAttr = req.addAttr(SecurityAttrs.AUTH_USER, user.get());
        return delegate.call(withAttr);
    }

    private Optional<String> extractBearer(Http.Request req) {
        return req.headers().get("Authorization")
            .flatMap(h -> {
                if (h.startsWith("Bearer ")) {
                    String token = h.substring(7).trim();
                    return token.isEmpty() ? Optional.empty() : Optional.of(token);
                }
                return Optional.empty();
            });
    }
}
