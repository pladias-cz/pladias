package geom;

public class Coordinates {

    private final Double _longitude;
    private final Double _latitude;

    private Coordinates(Double longitude, Double latitude) {
        _longitude = longitude;
        _latitude = latitude;
    }

    public static Coordinates of(Double longitude, Double latitude) {
        return new Coordinates(longitude, latitude);
    }

    public double getLongitude() {
        return _longitude;
    }

    public double getLatitude() {
        return _latitude;
    }

    public boolean isValid() {
        return _longitude != null && _latitude != null;
    }
}
