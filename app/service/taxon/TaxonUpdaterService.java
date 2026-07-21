package service.taxon;

import cache.TaxonCache;
import controllers.taxon.TaxonManagerController.AddTaxon;
import controllers.taxon.TaxonManagerController.MoveTaxonBeforeNewSibling;
import io.ebean.CallableSql;
import io.ebean.DB;
import io.ebean.Transaction;
import models.*;
import models.traits.DistributionDatatype;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import utils.TaxonUtils;

import java.sql.Types;
import java.util.List;
import java.util.Objects;

public class TaxonUpdaterService {
    public static final String AddTaxonFunctionName = "pladias_functions.mptt_taxons_appendchild";
    public static final String MoveTaxonFunctionName = "pladias_functions.mptt_taxons_move_subtree_real";
    public static final String MoveTaxonBeforeSiblingFunctionName = "pladias_functions.mptt_taxons_move_subtree_before";
    public static final String BackupTaxonTree = "pladias_functions.backup_taxon_tree";
    public static final String DeleteLeafTaxon = "pladias_functions.mptt_taxons_delete_leaf";

    final Logger logger = LoggerFactory.getLogger(TaxonUpdaterService.class);

    private static void includeTaxonInMapSettings(Taxon newTaxon) {
        TaxonMapSettings settings = new TaxonMapSettings();
        settings.setId(newTaxon.getId());
        settings.setRevisionStatus(RevisionStatus.find().byId(RevisionStatus.StatusNotStarted));
        settings.setPublicationStatus(PublicationStatus.find().byId(PublicationStatus.StatusNotStarted));
        settings.setMapType(MapType.Default.getId());
        settings.save();
    }

    private static void updateTaxonHistory(Taxon newTaxon, Taxon oldParent, String operation) {
        TaxonHistory history = new TaxonHistory();
        history.setTaxon(newTaxon);
        if (oldParent != null) {
            history.setOldParent(oldParent.getId());
        }
        history.setNewParent(newTaxon.getParent().getId());
        history.setOperationType(operation);
        history.save();
    }

    public Taxon insertNew(AddTaxon form) {

        try (Transaction transaction = DB.beginTransaction()) {
            long newTaxonId = prepareAndExecuteAddTaxonSql(form);
            Taxon newTaxon = Taxon.find().byId((long) newTaxonId);
            if (TaxonUtils.canBeMapped(newTaxon)) {
                includeTaxonInMapSettings(newTaxon);
            }
            updateTaxonHistory(newTaxon, null, "Add");
            transaction.commit();
            return newTaxon;
        }
    }

    public void deleteLeafTaxon(Taxon taxonToDelete) {
        Objects.requireNonNull(taxonToDelete);

        if (!taxonToDelete.IsLeaf()) {
            throw new IllegalStateException(String.format("Taxon '%s' is not a leaf taxon", taxonToDelete.getNameLat()));
        }

        try (Transaction transaction = DB.beginTransaction()) {
            List<DistributionDatatype> frequencies = DistributionDatatype
                .find().query()
                .where().eq("taxonId", taxonToDelete.getId())
                .findList();
            DB.deleteAll(frequencies);


            CallableSql cs = DB.createCallableSql("{call " + DeleteLeafTaxon + "(?, ?)}");
            cs.setParameter(1, (int) taxonToDelete.getId());
            cs.registerOut(2, Types.BOOLEAN);
            cs.addModification(Taxon.QualifiedName, false, true, true);
            DB.getDefault().execute(cs);

            TaxonCache.getInstance().clear();

            transaction.commit();
        } catch (Exception e) {
            logger.error("Failure while deleting entry from taxon tree", e);
            throw e;
        }
    }

    public Taxon moveBeforeSibling(MoveTaxonBeforeNewSibling form) throws Exception {
        try (Transaction transaction = DB.beginTransaction()) {
            Taxon oldParent = Taxon.find().byId(form.taxonId).getParent();
            int errorCode = prepareAndExecuteMoveTaxonBeforeNewSibling(form);
            if (errorCode != 0) {
                throw new Exception("Error code " + errorCode);
            } else {
                Taxon taxon = Taxon.find().byId(form.taxonId);
                updateTaxonHistory(taxon, oldParent, "MoveBeforeSibling");
                transaction.commit();
                return taxon;
            }
        }
    }

    public Taxon moveAsLastSibling(Long taxonId, Long newParentId) throws Exception {

        Taxon newParent = Taxon.find().byId(newParentId);
        if (newParent == null) {
            throw new Exception("Parent does not exist");
        }

        Taxon taxon = Taxon.find().byId(taxonId);
        Taxon oldParent = taxon.getParent();

        try (Transaction transaction = DB.beginTransaction()) {
            int errorCode = prepareAndExecuteMoveTaxonSql(taxon, newParent);
            if (errorCode != 0) {
                throw new Exception("Error code " + errorCode);
            } else {
                taxon.refresh();
                updateTaxonHistory(taxon, oldParent, "MoveToParentAsLastChild");
                transaction.commit();
                return taxon;
            }
        }
    }

    public void createTaxonTreeSnapshot(User currentUser) {
        try {
            String sql = String.format("{call %s(?)}", BackupTaxonTree);
            CallableSql cs = DB.createCallableSql(sql);
            cs.setParameter(1, currentUser.getId().intValue());
            cs.addModification("public.taxons_backup_version_summary", true, false, false);
            cs.addModification("public.taxons_backup", true, false, false);
            DB.getDefault().execute(cs);
        } catch (Exception e) {
            logger.error(e.getMessage());
        }
    }

    private int prepareAndExecuteMoveTaxonBeforeNewSibling(MoveTaxonBeforeNewSibling form) throws Exception {
        String sql = String.format("{call %s(?,?,?,?)}", MoveTaxonBeforeSiblingFunctionName);
        CallableSql cs = DB.createCallableSql(sql);
        cs.setParameter(1, (int) form.taxonId);
        cs.setParameter(2, (int) form.siblingId);
        cs.registerOut(3, Types.INTEGER); //error code
        cs.registerOut(4, Types.BOOLEAN); //repaired depths
        cs.addModification(Taxon.QualifiedName, false, true, false);
        DB.getDefault().execute(cs);
        return (Integer) cs.getObject(3);
    }

    private int prepareAndExecuteMoveTaxonSql(Taxon taxonToMove, Taxon newParent) throws Exception {
        String sql = String.format("{call %s(?,?,?,?,?)}", MoveTaxonFunctionName);

        Taxon refNode = newParent;
        List<Taxon> children = newParent.getChildren();
        boolean moveAsFirstSibling = true;
        if (children.size() > 0) {
            refNode = children.get(children.size() - 1);
            moveAsFirstSibling = false;
        }

        CallableSql cs = DB.createCallableSql(sql);
        cs.setParameter(1, (int) taxonToMove.getId());
        cs.setParameter(2, (int) refNode.getId());
        cs.setParameter(3, (boolean) moveAsFirstSibling); //move as first sibling
        cs.registerOut(4, Types.INTEGER); //error code
        cs.registerOut(5, Types.BOOLEAN); //repaired depths
        cs.addModification(Taxon.QualifiedName, false, true, false);
        DB.getDefault().execute(cs);
        int errorCode = (Integer) cs.getObject(4);
        return errorCode;
    }

    private long prepareAndExecuteAddTaxonSql(AddTaxon form) {
        String sql = String.format("{call %s(?,?,?::varchar,?)}", AddTaxonFunctionName);
        CallableSql cs = DB.createCallableSql(sql);
        cs.setParameter(1, (int) form.parentId);
        cs.setParameter(2, (int) form.rank);
        cs.setParameter(3, form.name);
        cs.registerOut(4, Types.INTEGER);
        cs.addModification(Taxon.QualifiedName, true, true, false);
        DB.getDefault().execute(cs);
        long newTaxonId = (Integer) cs.getObject(4);
        return newTaxonId;
    }
}
