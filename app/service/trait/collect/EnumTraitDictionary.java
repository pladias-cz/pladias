package service.trait.collect;

import models.traits.Datatype;
import models.traits.Enumerate;
import models.traits.EnumerateValue;

import java.util.HashMap;
import java.util.List;

public class EnumTraitDictionary {
    private final Datatype datatype;
    private final HashMap<Integer, EnumerateValue> idToEnumerateValueMap = new HashMap<Integer, EnumerateValue>();
    private final HashMap<Integer, Integer> idToOrderMap = new HashMap<Integer, Integer>();

    public EnumTraitDictionary(Datatype datatype, Enumerate enumerate) {
        this.datatype = datatype;
        populate(enumerate.getEnumerateValues());
    }

    public Datatype getDatatype() {
        return datatype;
    }

    public EnumerateValue getById(int id) {
        return idToEnumerateValueMap.get(id);
    }

    public int getOrderFromId(int id) {
        return idToOrderMap.get(id);
    }

    private void populate(List<EnumerateValue> values) {
        if (values.size() == 0)
            return;

        sortByOrder(values);
    }

    private void sortByOrder(List<EnumerateValue> values) {
        int orderCounter = 0;

        for (EnumerateValue enumerateValue : values) {
            int key = enumerateValue.getId();
            idToEnumerateValueMap.put(key, enumerateValue);
            idToOrderMap.put(key, orderCounter++);
        }
    }
}
