package controllers.react;

import controllers.ControllerBase;
import controllers.security.Authorized;
import models.Maintenance;
import models.User;
import models.UserSettings;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Http.Session;
import play.mvc.Result;
import play.mvc.Security;
import utils.SessionUtils;
import utils.UserUtils;
import views.utils.MaintenanceMessageUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Security.Authenticated(Authorized.class)
public class ConfigController extends ControllerBase {

    public Result config(Http.Request request) {
        Session session = request.session();
        User currentUser = SessionUtils.getCurrentUser(session);
        Map<String, Object> config = new HashMap<>();

        // Instance configuration (shared across users)
        config.put("isVascular", configService.isVascular());
        config.put("hasAtlasModule", configService.hasAtlasModule());
        config.put("hasMeasurementsModule", configService.hasTraitModule());
        config.put("hasBiblioModule", configService.hasBiblioModule());

        // User-specific data (can change during session)
        config.put("id", currentUser.getId());
        config.put("isMapAdmin", currentUser.isMapAdmin());
        config.put("isSysAdmin", currentUser.isSysAdmin());
        config.put("isTraitAdmin", currentUser.isTraitAdmin());
        config.put("isTaxonAdmin", currentUser.isTaxonAdmin());
        config.put("isBulkEditor", (currentUser.isMapAdmin() || UserUtils.getBulkImporter().getId() == currentUser.getId()));
        config.put("isAsyncImporter", UserUtils.isAsyncImporter(currentUser));
        config.put("userEmail", currentUser.getEmail());

        // Add supervised taxon IDs for permission checks
        List<Long> supervisedTaxonIds = new ArrayList<>();
        if (currentUser.getSupervisedTaxons() != null) {
            for (models.Taxon taxon : currentUser.getSupervisedTaxons()) {
                supervisedTaxonIds.add(taxon.getId());
            }
        }
        config.put("supervisedTaxonIds", supervisedTaxonIds);

        // Get user language preference from database, default to "cs" if not set
        String userLanguage = "cs";
        UserSettings languageSetting = UserSettings.find().query().where()
            .eq("settings.userId", currentUser.getId())
            .eq("settings.key", "application_language").findOne();

        if (languageSetting != null) {
            userLanguage = languageSetting.getValue();
        }

        config.put("language", userLanguage);

        return ok(Json.toJson(config));
    }

    public Result infoGlobal(Http.Request request) {
        List<Maintenance> messages = new ArrayList<>();

        Maintenance message = MaintenanceMessageUtils.getMessage();
        if (message != null) {
            messages.add(message);
        }
        return ok(Json.toJson(messages));
    }
}
