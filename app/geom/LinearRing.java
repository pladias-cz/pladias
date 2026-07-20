package geom;

import java.util.ArrayList;
import java.util.List;

public class LinearRing {

    private final Point[] points;

    public LinearRing(org.postgis.LinearRing linearRing) {
        List<Point> pointList = new ArrayList<Point>();
        for (org.postgis.Point postgisPoint : linearRing.getPoints()) {
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
