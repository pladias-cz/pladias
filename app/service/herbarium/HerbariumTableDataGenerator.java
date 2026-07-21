package service.herbarium;

import models.Herbarium;

import java.util.ArrayList;
import java.util.List;

public class HerbariumTableDataGenerator {

    public List<String> getHerbariumHeaders() {
        List<String> list = new ArrayList<>();
        list.add("Abbreviation");
        list.add("Name");
        list.add("Abbreviation explanation");
        return list;
    }

    public List<String> prepareHerbariumFields(Herbarium h) {
        List<String> list = new ArrayList<>();
        list.add(h.getAbbrev());
        list.add(h.getName());
        list.add(h.getAbbrevExplanation() != null ? h.getAbbrevExplanation() : "");
        return list;
    }

    public int getFieldsCount() {
        return 3;
    }
}
