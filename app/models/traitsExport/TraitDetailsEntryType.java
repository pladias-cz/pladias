package models.traitsExport;

public enum TraitDetailsEntryType {
    Original(1),
    Inherited(2),
    Aggregated(3),
    Composite(4);

    private final int index;

    TraitDetailsEntryType(int index) {
        this.index = index;
    }

    public static TraitDetailsEntryType make(int type) {
        for (TraitDetailsEntryType t : TraitDetailsEntryType.values()) {
            if (t.index == type)
                return t;
        }
        throw new IllegalArgumentException("type");
    }

    public int getIndex() {
        return index;
    }
}
