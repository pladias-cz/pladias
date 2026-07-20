package geom;

public class Point {

    private final double x;
    private final double y;
    private final int srid;
    public Point(double x, double y, int srid) {
        this.x = x;
        this.y = y;
        this.srid = srid;
    }

    public double getX() {
        return x;
    }

    public double getY() {
        return y;
    }

    public int getSrid() {
        return srid;
    }
}
