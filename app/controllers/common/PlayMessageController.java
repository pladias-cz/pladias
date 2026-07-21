package controllers.common;

import controllers.ControllerBase;
import dto.PlayMessageDto;
import models.PlayMessage;
import models.types.LanguageCode;
import play.mvc.*;
import utils.JsonResult;

import java.util.List;
import java.util.stream.Collectors;

public class PlayMessageController extends ControllerBase {

    /**
     * Get a PlayMessage by key for the specified language.
     * GET /api/react/playmessage/:key
     * <p>
     * Required query parameter: lang - language code (e.g., "en", "cs", "sk", "pl")
     */
    public Result getByKey(String key, Http.Request request) {
        // Get lang query parameter (required)
        String langParam = request.getQueryString("lang");

        if (langParam == null || langParam.isEmpty()) {
            return badRequest(JsonResult.error("Missing required query parameter: lang"));
        }

        LanguageCode language;
        try {
            language = LanguageCode.valueOf(langParam.toUpperCase());
        } catch (IllegalArgumentException e) {
            return badRequest(JsonResult.error("Invalid language code. Valid values: cs, en, sk, pl"));
        }

        PlayMessage message = PlayMessage.getMessage(key, language);

        if (message == null) {
            // Try to fall back to Czech if the requested language is not available
            if (language != LanguageCode.CS) {
                message = PlayMessage.getMessage(key, LanguageCode.CS);
            }
        }

        if (message == null) {
            return notFound(JsonResult.error("PlayMessage not found for key: " + key));
        }

        PlayMessageDto dto = new PlayMessageDto(
            message.getId(),
            message.getKey(),
            message.getLanguage().name().toLowerCase(),
            message.getValue()
        );

        return ok(JsonResult.buildSuccess(dto));
    }

    /**
     * Get all PlayMessages for the specified language.
     * GET /api/react/playmessage/all
     * <p>
     * Required query parameter: lang - language code (e.g., "en", "cs", "sk", "pl")
     */
    public Result getAll(Http.Request request) {
        // Get lang query parameter (required)
        String langParam = request.getQueryString("lang");

        if (langParam == null || langParam.isEmpty()) {
            return badRequest(JsonResult.error("Missing required query parameter: lang"));
        }

        LanguageCode language;
        try {
            language = LanguageCode.valueOf(langParam.toUpperCase());
        } catch (IllegalArgumentException e) {
            return badRequest(JsonResult.error("Invalid language code. Valid values: cs, en, sk, pl"));
        }

        List<PlayMessageDto> dtos = PlayMessage.find().query()
            .where()
            .eq("language", language)
            .findList()
            .stream()
            .map(m -> new PlayMessageDto(
                m.getId(),
                m.getKey(),
                m.getLanguage().name().toLowerCase(),
                m.getValue()
            ))
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }

    /**
     * Get all PlayMessages for all languages.
     * GET /api/react/playmessage/all/all-languages
     */
    public Result getAllForAllLanguages() {
        List<PlayMessageDto> dtos = PlayMessage.find().query()
            .findList()
            .stream()
            .map(m -> new PlayMessageDto(
                m.getId(),
                m.getKey(),
                m.getLanguage().name().toLowerCase(),
                m.getValue()
            ))
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }

}
