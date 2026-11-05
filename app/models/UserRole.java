package models;

import utils.UserUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Centralizovaný výčet rolí uživatele. Role odvozuje backend ({@link #keysOf(User)}) a posílá je
 * frontendu v `/api/react/config` jako `roles: string[]` – frontend si role nedrží ručně,
 * pouze konzumuje pole (rozšiřitelné o nové role bez změny FE kontraktu).
 * Klíče odpovídají historickým boolean flagům (bez prefixu „is“).
 */
public enum UserRole {
    MAP_ADMIN("mapAdmin"),
    BULK_EDITOR("bulkEditor"),
    TRAIT_ADMIN("traitAdmin"),
    SYS_ADMIN("sysAdmin"),
    TAXON_ADMIN("taxonAdmin"),
    ASYNC_IMPORTER("asyncImporter"),
    BIBLIO_ADMIN("biblioAdmin");

    private final String key;

    UserRole(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }

    /**
     * Role daného uživatele. Pozn.: mapAdmin nese i všechny kompetence bulkEditora
     * (zrcadlí historický flag `isBulkEditor = isMapAdmin || UserUtils.isBulkEditor` v configu).
     */
    public static List<String> keysOf(User user) {
        List<String> roles = new ArrayList<>();
        if (user.isMapAdmin()) {
            roles.add(MAP_ADMIN.key);
        }
        if (user.isMapAdmin() || UserUtils.isBulkEditor(user)) {
            roles.add(BULK_EDITOR.key);
        }
        if (user.isTraitAdmin()) {
            roles.add(TRAIT_ADMIN.key);
        }
        if (user.isSysAdmin()) {
            roles.add(SYS_ADMIN.key);
        }
        if (user.isTaxonAdmin()) {
            roles.add(TAXON_ADMIN.key);
        }
        if (UserUtils.isAsyncImporter(user)) {
            roles.add(ASYNC_IMPORTER.key);
        }
        if (user.isBiblioAdmin()) {
            roles.add(BIBLIO_ADMIN.key);
        }
        return roles;
    }
}
