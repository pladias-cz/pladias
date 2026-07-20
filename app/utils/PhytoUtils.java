package utils;

import models.Phytochorion;

public class PhytoUtils {

    public static boolean areEqual(Phytochorion p1, Phytochorion p2) {
        if (p1 == null && p2 == null)
            return true;

        if (p1 != null && p2 != null) {
            return p1.getRowid() == p2.getRowid();
        }

        //p1 == null xor p2 == null
        return false;
    }
}
