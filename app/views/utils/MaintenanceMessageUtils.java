package views.utils;

import models.Maintenance;

import java.util.List;

public class MaintenanceMessageUtils {

    public static Maintenance getMessage() {
        List<Maintenance> all = Maintenance.find().all();
        if (all.isEmpty()) {
            return null;
        }
        return all.getFirst();
    }
}
