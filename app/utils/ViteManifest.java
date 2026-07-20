package utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import play.Environment;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.List;


@Singleton
public class ViteManifest {
    private final Map<String, JsonNode> manifest = new HashMap<>();

    @Inject
    public ViteManifest(Environment env) throws IOException {
        File manifestFile = env.getFile("public/react/.vite/manifest.json");
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(manifestFile);
        root.fields().forEachRemaining(entry -> manifest.put(entry.getKey(), entry.getValue()));
    }

    public String jsFile(String entryPoint) {
        JsonNode node = manifest.get(entryPoint);
        if (node != null && node.has("file")) {
            return "/assets/react/" + node.get("file").asText();
        }
        return null;
    }

    public List<String> cssFiles(String entryPoint) {
        JsonNode node = manifest.get(entryPoint);
        if (node != null && node.has("css")) {
            List<String> files = new ArrayList<>();
            node.get("css").forEach(css -> files.add("/assets/react/" + css.asText()));
            return files;
        }
        return Collections.emptyList();
    }
}
