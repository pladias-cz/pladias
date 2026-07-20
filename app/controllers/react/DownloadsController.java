package controllers.react;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.DownloadDto;
import models.Downloads;
import models.PlayMessage;
import models.User;
import play.mvc.*;
import play.mvc.Security;
import utils.JsonResult;
import utils.SessionUtils;
import views.utils.UserViewUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Security.Authenticated(Authorized.class)
public class DownloadsController extends ControllerBase {




    /* ===================== GET ===================== */


    public Result getAll(Http.Request request) {
        List<Downloads> downloads = Downloads.find().query().orderBy("succession asc").findList();

        User currentUser = SessionUtils.getCurrentUser(request.session());

        String today = new java.text.SimpleDateFormat("dd.MM.yyyy").format(new java.util.Date())
            + " (dynamic)";

        List<DownloadDto> dtos = new ArrayList<>();

        // 1️⃣ seznam taxonů
        dtos.add(new DownloadDto(
            "Seznam taxonů v aplikaci " + configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY),
            UserViewUtils.getUsersNames(platform.ProjectConstants.TaxonAdminKey),
            today,
            "TODO"
//                controllers.routes.ModelDataSource.getTaxonDetails().url()
        ));

// TODO - only when isAtlasModuleActive!
        // 2️⃣ seznam herbářů
        dtos.add(new DownloadDto(
            "Seznam herbářů v aplikaci " + configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY),
            UserViewUtils.getUsersNames(platform.ProjectConstants.HerbariumsManagerKey),
            today,
            "TODO"
//                controllers.routes.HerbariumController.displayHerbariums().url()
        ));
// TODO - only when isAtlasModuleActive!
        // 3️⃣ seznam nálezců
        dtos.add(new DownloadDto(
            "Seznam nálezců v aplikaci " + configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY),
            UserViewUtils.getUsersNames(platform.ProjectConstants.FindersManagerKey),
            today,
            "TODO"
//                controllers.routes.AuthorsController.displayAuthors().url()
        ));

        // 4️⃣ položky z DB
        dtos.addAll(
            downloads.stream()
                .map(d -> new DownloadDto(
                    d.getNameCz(),
                    UserViewUtils.getUsersNames(d.getManager()),
                    d.getVersion(),
                    "/assets/downloads/" + d.getFilePath()
                ))
                .collect(Collectors.toList())
        );


        return ok(JsonResult.buildSuccess(dtos));

    }


}
