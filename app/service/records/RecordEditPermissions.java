package service.records;

import io.ebean.DB;
import io.ebean.SqlRow;
import models.Batch;
import models.Project;
import models.Record;
import models.RecordValidationStatus;
import models.Taxon;
import models.User;
import utils.UserUtils;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Jediné místo s pravidly editačních práv záznamů (source of truth).
 * Koncept práv má tři dimenze:
 * <ul>
 *   <li>{@link #canEditCommonFields} – běžná pole záznamu (lokalita, souřadnice, zdroj, ...); platí i pro
 *       revizory nadřazených taxonů a správce projektů (zrcadlí historické {@code Record.isUserElligibleToEditCommonFields}),</li>
 *   <li>{@link #canEditValidationFields} – validační (semaforová) pole; pouze mapAdmin, bulkEditor a přímý revizor taxonu
 *       (zrcadlí historické {@code RecordsService.isElligibleForRecordValidation}),</li>
 *   <li>{@link #canResolveComments} – řešení komentářů (zrcadlí historické {@code Record.isUserElligibleToEditEverything}).</li>
 * </ul>
 * Instance se vytváří jednou pro daného uživatele ({@link #forUser}, 1–2 dotazy: revidované taxony a spravované projekty)
 * a pak se per záznam vyhodnocuje bez dalších dotazů – test „revizor nadřazeného taxonu" je intervalová operace
 * nad nested set (`left`/`right`). DTO, služby i kontrolery tak mají vždy stejnou odpověď jako endpointy.
 */
public final class RecordEditPermissions {

    /**
     * Minimální projekce záznamu potřebná k vyhodnocení práv.
     * Umožňuje počítat práva bez entity Record (batch prefetch ve výpisových cestách).
     */
    public interface RecordView {
        Long taxonId();

        int taxonLeft();

        int taxonRight();

        Long batchAuthorId();

        Long batchCommitterId();

        int validationStatusId();

        boolean locked();

        /** Záznam není zamčen a taxon není uzamčen kvůli generování náhledu mapy. */
        boolean editationAllowed();

        Long projectId();
    }

    private final Long userId;
    private final boolean mapAdmin;
    private final boolean bulkEditor;
    private final Set<Long> supervisedTaxonIds;
    private final long[][] supervisedIntervals;
    private final Set<Long> managedProjectIds;

    private RecordEditPermissions(Long userId, boolean mapAdmin, boolean bulkEditor,
                                  Set<Long> supervisedTaxonIds, long[][] supervisedIntervals,
                                  Set<Long> managedProjectIds) {
        this.userId = userId;
        this.mapAdmin = mapAdmin;
        this.bulkEditor = bulkEditor;
        this.supervisedTaxonIds = supervisedTaxonIds;
        this.supervisedIntervals = supervisedIntervals;
        this.managedProjectIds = managedProjectIds;
    }

    /**
     * Vytvoří kontext práv pro daného uživatele (2 dotazy: revidované taxony, spravované projekty).
     * Pro neautentizovaného uživatele vrací kontext, který vše zamítá.
     */
    public static RecordEditPermissions forUser(User user) {
        if (user == null) {
            return new RecordEditPermissions(null, false, false, Set.of(), new long[0][], Set.of());
        }

        Set<Long> supervisedTaxonIds = new HashSet<>();
        List<long[]> supervisedIntervals = new ArrayList<>();
        for (Taxon taxon : user.getSupervisedTaxons()) {
            if (taxon == null) {
                continue;
            }
            supervisedTaxonIds.add(taxon.getId());
            supervisedIntervals.add(new long[]{taxon.getLeft(), taxon.getRight()});
        }

        Set<Long> managedProjectIds = new HashSet<>();
        for (SqlRow row : DB.sqlQuery(
                "SELECT project_id FROM atlas.projects_users WHERE user_id = :userId AND projectadmin = TRUE")
                .setParameter("userId", user.getId())
                .findList()) {
            managedProjectIds.add(row.getLong("project_id"));
        }

        return new RecordEditPermissions(user.getId(), user.isMapAdmin(), UserUtils.isBulkEditor(user),
                supervisedTaxonIds, supervisedIntervals.toArray(new long[0][]), managedProjectIds);
    }

    /**
     * Adaptér nad entitou Record pro single-record cesty (kontrolery, detail záznamu).
     */
    public static RecordView of(Record record) {
        return new RecordView() {
            @Override
            public Long taxonId() {
                return record.getTaxon() != null ? record.getTaxon().getId() : null;
            }

            @Override
            public int taxonLeft() {
                return record.getTaxon().getLeft();
            }

            @Override
            public int taxonRight() {
                return record.getTaxon().getRight();
            }

            @Override
            public Long batchAuthorId() {
                Batch batch = record.getBatch();
                if (batch == null) {
                    return null;
                }
                if (batch.getAuthor() == null) {
                    //we have seen that Batch was not always properly populated
                    batch.refresh();
                }
                return batch.getAuthor() != null ? batch.getAuthor().getId() : null;
            }

            @Override
            public Long batchCommitterId() {
                Batch batch = record.getBatch();
                return batch != null && batch.getCommitter() != null ? batch.getCommitter().getId() : null;
            }

            @Override
            public int validationStatusId() {
                return record.getValidationStatusId();
            }

            @Override
            public boolean locked() {
                return record.isLocked();
            }

            @Override
            public boolean editationAllowed() {
                return record.isEditationAllowed();
            }

            @Override
            public Long projectId() {
                Project project = record.getProject();
                return project != null ? project.getId() : null;
            }
        };
    }

    // ==================== Combined predicates (flags for FE) ====================

    /** Smí editovat běžná pole záznamu (včetně zámků záznamu i taxonu). */
    public boolean canEditCommonFields(RecordView record) {
        return record.editationAllowed() && isUserElligibleToEditCommonFields(record);
    }

    /** Smí editovat validační (semaforová) pole (včetně zámků záznamu i taxonu). */
    public boolean canEditValidationFields(RecordView record) {
        return record.editationAllowed() && isElligibleForRecordValidation(record);
    }

    /** Smí řešit (resolvovat) komentáře záznamu. */
    public boolean canResolveComments(RecordView record) {
        return isUserElligibleToEditEverything(record);
    }

    // ==================== Raw eligibility rules (mirror of historical semantics) ====================

    /**
     * Uživatel smí se záznamem dělat vše (historické Record.isUserElligibleToEditEverything):
     * mapAdmin, přímý i nadřazený revizor taxonu, správce projektu.
     */
    public boolean isUserElligibleToEditEverything(RecordView record) {
        if (mapAdmin) {
            return true;
        }

        if (isSupervisorOf(record.taxonId())) {
            return true;
        }

        if (isSupervisorOfAncestorTaxon(record)) {
            return true;
        }

        return managedProjectIds.contains(record.projectId());
    }

    /**
     * Uživatel smí záznam upravovat – běžná pole, nikoli semafor (historické Record.isUserElligibleToEditCommonFields):
     * bulkEditor, autor/committer dávky u nezpracovaného záznamu, nebo „vše“ (viz výše).
     */
    public boolean isUserElligibleToEditCommonFields(RecordView record) {
        if (userId == null) {
            return false;
        }

        if (bulkEditor) {
            return true;
        }

        if (record.validationStatusId() == RecordValidationStatus.Unprocessed
                && (userId.equals(record.batchAuthorId()) || userId.equals(record.batchCommitterId()))) {
            return true;
        }

        return isUserElligibleToEditEverything(record);
    }

    /**
     * Uživatel smí editovat validační (semaforová) pole – validace, originalita, herbář, include-in-map
     * (historické RecordsService.isElligibleForRecordValidation): mapAdmin, bulkEditor, přímý revizor taxonu.
     */
    public boolean isElligibleForRecordValidation(RecordView record) {
        return mapAdmin || bulkEditor || isSupervisorOf(record.taxonId());
    }

    // ==================== Internals ====================

    private boolean isSupervisorOf(Long taxonId) {
        return taxonId != null && supervisedTaxonIds.contains(taxonId);
    }

    /**
     * Uživatel je revizorem nadřazeného taxonu (taxon leží v intervalu [left, right] některého revidovaného taxonu).
     * Pokrývá i přímého revizora (interval taxonu obsahuje sám sebe), sémantika Taxon.isDescendant.
     */
    private boolean isSupervisorOfAncestorTaxon(RecordView record) {
        for (long[] interval : supervisedIntervals) {
            if (interval[0] <= record.taxonLeft() && interval[1] >= record.taxonRight()) {
                return true;
            }
        }
        return false;
    }
}

