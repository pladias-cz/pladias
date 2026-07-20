package service.phytochorion;

import geom.Coordinates;
import models.Phytochorion;
import models.PhytochorionForeign;

public class PhytochorionService {

    public Phytochorion findByPoint(Coordinates coords) {
        Phytochorion phyto = Phytochorion.findByPoint(coords);
        if (phyto != null) {
            return phyto;
        }
        //coords not inside phytochorion. Lets search outside of our republic
        PhytochorionForeign phytoOutsideCzechia = PhytochorionForeign.findByPoint(coords);
        return (phytoOutsideCzechia != null)
            ? Phytochorion.findByPhytoId(phytoOutsideCzechia.getPhytoId())
            : null;
    }
}
