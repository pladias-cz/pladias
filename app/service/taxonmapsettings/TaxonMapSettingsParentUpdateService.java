package service.taxonmapsettings;

import io.ebean.DB;
import io.ebean.Transaction;
import models.TaxonMapSettings;
import play.Logger;

public class TaxonMapSettingsParentUpdateService {
    private final TaxonMapSettings current;

    public TaxonMapSettingsParentUpdateService(TaxonMapSettings current) {
        if (current == null) throw new IllegalArgumentException("parameter cannot be null");
        this.current = current;
    }

    public void setParent(TaxonMapSettings parent) {
        if (parent == null) {
            throw new IllegalArgumentException("parent cannot be null");
        }

        try (Transaction transaction = DB.beginTransaction()) {
            doSetParent(parent);
            transaction.commit();
        } catch (Exception e) {
            Logger.info("Failed to update TaxonMapSettings.parent", e);
        }
    }

    private void doSetParent(TaxonMapSettings parent) throws Exception {
        if (current.getParent() != null) {
            throw new Exception("Taxon already has parent defined");
        }

        current.setParent(parent);
        DB.save(current);

        if (parent != null) {
            if (parent.getParent() == null) {
                parent.setParent(parent); //create self-referencing loop
                DB.save(parent);
            }
        }
    }

    public void removeParent() {
        try (Transaction transaction = DB.beginTransaction()) {
            doRemoveParent();
            transaction.commit();
        } catch (Exception e) {
            Logger.info("Failed to remove TaxonMapSettings.parent", e);
        }
    }

    private void doRemoveParent() {
        TaxonMapSettings parent = current.getParent();
        if (parent == null) {
            return;
        }
        current.setParent(null);
        DB.save(current);

        if (isSelfReferencing(parent)) //parent is root of the hiearachy and its parent pointer points to itself
        {
            boolean deleted = deleteSelfReferenceIfNoSubordinatesExist(parent);
            if (deleted) {
                DB.save(parent);
            }
        }
    }

    private boolean deleteSelfReferenceIfNoSubordinatesExist(TaxonMapSettings parent) {
        int count = getSubordinateTaxonMapSettingsCount(parent);
        if (count == 0) {
            parent.setParent(null);
            return true;
        }
        return false;
    }

    private int getSubordinateTaxonMapSettingsCount(TaxonMapSettings parent) {
        return TaxonMapSettings.find().query()
            .where()
            .eq("parent.id", parent.getId())
            .ne("id", parent.getId()).findCount();
    }

    private boolean isSelfReferencing(TaxonMapSettings parent) {
        return (parent != null &&
            parent.getParent() != null &&
            parent.getParent().getId() == parent.getId());
    }
}
