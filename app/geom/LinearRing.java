package geom;

import java.util.ArrayList;
import java.util.List;

public class LinearRing {

    private final Point[] points;

    public LinearRing(net.postgis.jdbc.geometry.LinearRing linearRing) {
        List<Point> pointList = new ArrayList<>();
        for (net.postgis.jdbc.geometry.Point postgisPoint : linearRing.getPoints()) {
            int srid = postgisPoint.getSrid();
            Point p = new Point(postgisPoint.getX(), postgisPoint.getY(), srid);
            pointList.add(p);
        }
        points = pointList.toArray(new Point[pointList.size()]);
    }

    public Point[] getPoints() {
        return points;
    }
}
