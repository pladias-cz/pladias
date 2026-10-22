package controllers.common;

import controllers.ControllerBase;
import controllers.security.AuthorizedApi;
import dto.DownloadDto;
import models.Author;
import models.Downloads;
import models.Herbarium;
import models.PlayMessage;
import models.Taxon;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.*;
import play.mvc.Security;
import service.export.table.ExportColumn;
import service.export.table.TableExportWriter;
import service.herbarium.HerbariumSerializationService;
import service.taxon.TaxonSerializationService;
import views.utils.UserViewUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Seznam souborů ke stažení a dynamické xlsx exporty (seznam taxonů, herbářů,
 * nálezců). Routy konzumuje výhradně apiClient (fetch), proto
 * {@link AuthorizedApi}: neúspěšná autentizace vrací HTTP 401 s JSON chybou
 * místo redirectu na login. Chyby exportu odpovídají HTTP 500 s JSON chybou
 * (frontend ji zobrazí Toast notifikací), úspěch je soubor s hlavičkou
 * Content-disposition.
 */
@Security.Authenticated(AuthorizedApi.class)
public class DownloadsController extends ControllerBase {

    final Logger logger = LoggerFactory.getLogger(DownloadsController.class);

    private static final String TaxonListUrl = "/api/react/downloads/taxa";
    private static final String HerbariumListUrl = "/api/react/downloads/herbaria";
    private static final String FindersListUrl = "/api/react/downloads/finders";

    public Result getAll(Http.Request request) {
        List<Downloads> downloads = Downloads.find().query().orderBy("succession asc").findList();

        String today = new java.text.SimpleDateFormat("dd.MM.yyyy").format(new java.util.Date())
            + " (dynamic)";

        List<DownloadDto> dtos = new ArrayList<>();

        // 1️⃣ seznam taxonů (vždy – taxony jsou společné pro všechny moduly)
        dtos.add(new DownloadDto(
            "Seznam taxonů v aplikaci " + configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY),
            UserViewUtils.getUsersNames(platform.ProjectConstants.TaxonAdminKey),
            today,
            TaxonListUrl,
            true
        ));

        // 2️⃣ + 3️⃣ seznam herbářů a nálezců – jen s aktivním atlasovým modulem
        if (configService.hasAtlasModule()) {
            dtos.add(new DownloadDto(
                "Seznam herbářů v aplikaci " + configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY),
                UserViewUtils.getUsersNames(platform.ProjectConstants.HerbariumsManagerKey),
                today,
                HerbariumListUrl,
                true
            ));
            dtos.add(new DownloadDto(
                "Seznam nálezců v aplikaci " + configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY),
                UserViewUtils.getUsersNames(platform.ProjectConstants.FindersManagerKey),
                today,
                FindersListUrl,
                true
            ));
        }

        // 4️⃣ položky z DB – statické soubory z /public
        dtos.addAll(
            downloads.stream()
                .map(d -> new DownloadDto(
                    d.getNameCz(),
                    UserViewUtils.getUsersNames(d.getManager()),
                    d.getVersion(),
                    "/assets/downloads/" + d.getFilePath(),
                    false
                ))
                .collect(Collectors.toList())
        );

        // pole bez JsonResult obálky – standardní REST odpověď (docs/gotchas.md)
        return ok(Json.toJson(dtos));
    }

    public Result exportTaxons(Http.Request request) {
        Messages messages = getMessages(request);
        try {
            List<Taxon> taxons = Taxon.find().query().orderBy("lft").findList();
            return xlsx(TaxonSerializationService.serializeExcel(taxons), "taxonList.xlsx");
        } catch (Exception e) {
            logger.error("Taxon list export failed", e);
            return exportFailed(messages.at("ModelDataSource.taxonDetailsFailed"));
        }
    }

    public Result exportHerbariums(Http.Request request) {
        Messages messages = getMessages(request);
        try {
            List<Herbarium> herbariums = Herbarium.find().query().orderBy("name").findList();
            return xlsx(HerbariumSerializationService.serialize(herbariums), "herbariumList.xlsx");
        } catch (Exception e) {
            logger.error("Herbarium list export failed", e);
            return exportFailed(messages.at("HerbariumController.herbariumDetailsFailed"));
        }
    }

    public Result exportFinders(Http.Request request) {
        Messages messages = getMessages(request);
        try {
            List<Author> finders = Author.find().query().orderBy("surname, name").findList();
            List<ExportColumn<Author>> columns = List.of(
                ExportColumn.text("AuthorsController.surname", Author::getSurname),
                ExportColumn.text("AuthorsController.name", Author::getName)
            );
            return xlsx(TableExportWriter.write("finders", columns, finders, messages), "findersList.xlsx");
        } catch (Exception e) {
            logger.error("Finders list export failed", e);
            return exportFailed(messages.at("AuthorsController.authorsDetailsFailed"));
        }
    }

    /** Úspěšný export – xlsx s hlavičkou Content-disposition (vzor MapAdminImportController). */
    private Result xlsx(byte[] data, String filename) {
        return ok(data)
            .withHeader("Content-disposition", "attachment; filename=" + filename)
            .as("application/x-download");
    }

    /** Neúspěšný export – HTTP 500 s JSON chybou, frontend ji zobrazí Toast notifikací. */
    private Result exportFailed(String message) {
        return internalServerError(Json.toJson(Map.of("error", message)));
    }
}

