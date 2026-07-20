package utils;

import com.fasterxml.jackson.databind.node.ObjectNode;
import play.libs.Json;

import java.util.Map;

public class JsonResult {

    public static ObjectNode error(String message) {
        ObjectNode o = Json.newObject();
        o.put("success", false);
        o.put("message", message);

        return o;
    }

    public static ObjectNode error(String message, Map<String, String> additionalData) {
        ObjectNode o = Json.newObject();
        o.put("success", false);
        o.put("message", message);
        for (String key : additionalData.keySet()) {
            o.put(key, additionalData.get(key));
        }
        return o;
    }

    public static ObjectNode success(String message) {
        ObjectNode o = Json.newObject();
        o.put("success", true);
        o.put("message", message);

        return o;
    }

    public static ObjectNode buildSuccess() {
        ObjectNode o = Json.newObject();
        o.put("success", true);
        o.put("message", "");
        return o;
    }

    public static ObjectNode buildSuccess(Map<String, String> additionalData) {
        ObjectNode o = Json.newObject();
        o.put("success", true);
        o.put("message", "");
        for (String key : additionalData.keySet()) {
            o.put(key, additionalData.get(key));
        }
        return o;
    }

    public static ObjectNode buildSuccess(Object data) {
        ObjectNode result = Json.newObject();
        result.put("success", true);
        result.set("data", Json.toJson(data));
        return result;
    }

    public static ObjectNode buildError(String message) {
        ObjectNode result = Json.newObject();
        result.put("success", false);
        result.put("message", message);
        return result;
    }
}
