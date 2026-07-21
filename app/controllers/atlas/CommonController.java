package controllers.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import models.*;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;

import java.util.ArrayList;
import java.util.List;

@Security.Authenticated(Authorized.class)
public class CommonController extends ControllerBase {

    public Result getPhytochorions() {
        List<PhytochorionDto> phytochorions = Phytochorion.getPhytochorionsSortedById()
            .stream()
            .map(phytochorion -> new PhytochorionDto(
                phytochorion.getRowid(),
                phytochorion.getPhytoId() + ". " + phytochorion.getName()
            ))
            .toList();

        return ok(JsonResult.buildSuccess(phytochorions));
    }

    public Result getHerbariums() {
        List<HerbariumOptionDto> herbariums = new ArrayList<>();
        herbariums.add(new HerbariumOptionDto(
            Herbarium.NonHerbariumId,
            null,
            "atlas.search.form.options.herbariumNone"
        ));
        herbariums.add(new HerbariumOptionDto(
            Herbarium.AnyHerbariumId,
            null,
            "atlas.search.form.options.herbariumAny"
        ));
        herbariums.addAll(
            Herbarium.find().query().orderBy("nameSort").findList()
                .stream()
                .map(herbarium -> {
                    String label = herbarium.getNameSort() == null
                        ? "(" + herbarium.getAbbrevExplanation() + ")"
                        : herbarium.getNameSort() + " (" + herbarium.getAbbrevExplanation() + ")";
                    return new HerbariumOptionDto(herbarium.getId(), label, null);
                })
                .toList()
        );

        return ok(JsonResult.buildSuccess(herbariums));
    }

    public Result getInstitutions() {
        List<InstitutionOptionDto> institutions = Institution.find().query().orderBy("name").findList()
            .stream()
            .map(institution -> new InstitutionOptionDto(
                institution.getId(),
                institution.getName()
            ))
            .toList();

        return ok(JsonResult.buildSuccess(institutions));
    }

    public Result getCommitters() {
        List<UserOptionDto> users = User.find().query()
            .where().eq("deleted", false)
            .orderBy("surname")
            .findList()
            .stream()
            .map(user -> new UserOptionDto(
                user.getId(),
                user.getSurname() + ", " + user.getName()
            ))
            .toList();

        return ok(JsonResult.buildSuccess(users));
    }

    public Result getLicenses() {
        List<LicenseOptionDto> licenses = License.find().query().orderBy("key").findList()
            .stream()
            .map(license -> new LicenseOptionDto(
                license.getId(),
                license.getKey()
            ))
            .toList();

        return ok(JsonResult.buildSuccess(licenses));
    }

    public Result getHistoryFlags() {
        List<HistoryFlagOptionDto> flags = RecordHistory.getDistinctFieldDescriptors()
            .stream()
            .map(HistoryFlagOptionDto::new)
            .toList();

        return ok(JsonResult.buildSuccess(flags));
    }

    public static class PhytochorionDto {
        public final int rowid;
        public final String name;

        public PhytochorionDto(int rowid, String name) {
            this.rowid = rowid;
            this.name = name;
        }
    }

    public static class HerbariumOptionDto {
        public final int id;
        public final String name;
        public final String translationKey;

        public HerbariumOptionDto(int id, String name, String translationKey) {
            this.id = id;
            this.name = name;
            this.translationKey = translationKey;
        }
    }

    public static class InstitutionOptionDto {
        public final String id;
        public final String name;

        public InstitutionOptionDto(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    public static class UserOptionDto {
        public final long id;
        public final String name;

        public UserOptionDto(long id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    public static class LicenseOptionDto {
        public final int id;
        public final String key;

        public LicenseOptionDto(int id, String key) {
            this.id = id;
            this.key = key;
        }
    }

    public static class HistoryFlagOptionDto {
        public final String value;

        public HistoryFlagOptionDto(String value) {
            this.value = value;
        }
    }
}
