package repositories;

public enum TaxonSupervisorListDetail {

    LOW(0),
    NORMAL(1),
    DETAILED(2);

    private final int value;

    TaxonSupervisorListDetail(int value) {
        this.value = value;
    }

    public static TaxonSupervisorListDetail fromValue(int value) {
        switch (value) {
            case 0:
                return LOW;
            case 1:
                return NORMAL;
            case 2:
                return DETAILED;
        }

        return null;
    }

    public int toValue() {
        return value;
    }
}
