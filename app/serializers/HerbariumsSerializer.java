package serializers;

import models.Herbarium;

import java.util.List;

public class HerbariumsSerializer {

    public static String serialize(List<Herbarium> herbariums) {
        if (herbariums == null)
            return "";

        StringBuilder serialized = new StringBuilder();
        for (Herbarium h : herbariums) {
            if (!serialized.isEmpty()) {
                serialized.append(';');
            }
            serialized.append(h.getName());
        }
        return serialized.toString();
    }
}
