package serializers;

import models.QuadrantNew;

import java.util.ArrayList;
import java.util.List;

public class QuadrantsSerializer {

    public static String serialize(QuadrantNew quadrant) {
        if (quadrant == null)
            return "";

        List<QuadrantNew> quadrants = new ArrayList<>();
        quadrants.add(quadrant);
        return serialize(quadrants);
    }

    public static String serialize(List<QuadrantNew> quadrants) {
        if (quadrants == null)
            return "";
        StringBuilder serialized = new StringBuilder();
        for (QuadrantNew q : quadrants) {
            if (!serialized.isEmpty()) {
                serialized.append(';');
            }
            serialized.append(q.toString());
        }
        return serialized.toString();
    }
}
