package models;

public enum MapType {
    Default(1),
    LostVersusRecent(2),
    NativeVersusAlien(3),
    HerbariumVersusNonHerbarium(4);

    private final int id;

    MapType(int id) {
        this.id = id;
    }

    public static MapType findById(int id) {
        for (MapType m : values()) {
            if (m.getId() == id)
                return m;
        }
        return null;
    }

    public int getId() {
        return id;
    }
}
