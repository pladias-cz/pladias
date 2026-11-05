package controllers.common;

import com.fasterxml.jackson.databind.JsonNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import controllers.security.AuthorizedAsSysAdmin;
import dto.PlayMessageDto;
import models.PlayMessage;
import models.types.LanguageCode;
import play.mvc.*;
import java.util.ArrayList;
import java.util.HashSet;
import utils.JsonResult;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Security.Authenticated(Authorized.class)
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

    /**
     * Get all PlayMessage constants with their values for the specified language (sysAdmin only).
     * GET /api/react/playmessage/admin/all
     * <p>
     * Required query parameter: lang - language code (e.g., "en", "cs", "sk", "pl").
     * A value is null when the language variant does not exist in the database yet.
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result getAllForAdmin(Http.Request request) {
        LanguageCode language = parseLanguage(request.getQueryString("lang"));
        if (language == null) {
            return badRequest(JsonResult.error("Missing or invalid required query parameter: lang. Valid values: cs, en, sk, pl"));
        }

        List<PlayMessageDto> dtos = PlayMessage.getConstantKeys().stream()
            .map(key -> {
                PlayMessage message = PlayMessage.getMessage(key, language);
                return new PlayMessageDto(
                    message != null ? message.getId() : null,
                    key,
                    language.name().toLowerCase(),
                    message != null ? message.getValue() : null
                );
            })
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }

    /**
     * Save values of PlayMessage constants for one language (sysAdmin only).
     * PUT /api/react/playmessage/admin/save
     * <p>
     * Body: {"lang": "cs", "values": [{"key": "project_name", "value": "..."}]}
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result save(Http.Request request) {
        JsonNode body = request.body().asJson();
        if (body == null) {
            return badRequest(JsonResult.error("Missing JSON body"));
        }

        LanguageCode language = parseLanguage(body.path("lang").asText(null));
        if (language == null) {
            return badRequest(JsonResult.error("Missing or invalid field: lang. Valid values: cs, en, sk, pl"));
        }

        Set<String> constantKeys = new HashSet<>(PlayMessage.getConstantKeys());
        List<PlayMessage> toSave = new ArrayList<>();

        for (JsonNode entry : body.path("values")) {
            String key = entry.path("key").asText(null);
            String value = entry.path("value").asText(null);
            if (key == null || !constantKeys.contains(key)) {
                return badRequest(JsonResult.error("Unknown PlayMessage key: " + key));
            }
            if (value == null || value.isEmpty()) {
                return badRequest(JsonResult.error("Value of " + key + " must not be empty"));
            }

            PlayMessage message = PlayMessage.getMessage(key, language);
            if (message == null) {
                message = new PlayMessage();
                message.setKey(key);
                message.setLanguage(language);
            }
            message.setValue(value);
            toSave.add(message);
        }

        for (PlayMessage message : toSave) {
            message.save();
        }

        return ok(JsonResult.success("PlayMessages saved"));
    }

    private LanguageCode parseLanguage(String langParam) {
        if (langParam == null || langParam.isEmpty()) {
            return null;
        }
        try {
            return LanguageCode.valueOf(langParam.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

}
