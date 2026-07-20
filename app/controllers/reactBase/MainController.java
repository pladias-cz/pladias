package controllers.reactBase;

import controllers.ControllerBase;
import controllers.security.Authorized;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.ViteManifest;

import javax.inject.Inject;
import java.util.List;

@Security.Authenticated(Authorized.class)
public class MainController extends ControllerBase {

    private final ViteManifest vite;

    @Inject
    public MainController(ViteManifest vite) {
        this.vite = vite;
    }

    public Result reactApp(Http.Request request, String path) {
        String jsFile = vite.jsFile("src/index.tsx");
        List<String> cssFiles = vite.cssFiles("src/index.tsx");
        return ok(views.html.react.index.render(jsFile, cssFiles, request));
    }


}
