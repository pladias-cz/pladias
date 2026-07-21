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
        return switch (value) {
            case 0 -> LOW;
            case 1 -> NORMAL;
            case 2 -> DETAILED;
            default -> null;
        };

    }

    public int toValue() {
        return value;
    }
}
