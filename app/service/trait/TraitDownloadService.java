package service.trait;

import models.User;
import models.UserActivity;
import models.traits.Feature;
import models.traits.InheritanceType;
import models.traits.Trait;
import models.traits.VisibilityStatus;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import play.i18n.Messages;
import play.mvc.Http.Session;
import service.trait.export.TraitExportResponse;
import service.trait.export.TraitExportService;
import service.trait.excel.TraitsExportService;
import service.user.ActivityDetails;
import service.user.UserActivityService;
import settings.user.UserOptions;
import utils.PladiasStringUtils;

import java.util.Locale;

/**
 * Data downloads of a single trait - its Excel workbook, its attachment and the CSV complex export.
 * Resolves what may be downloaded and how the downloaded file is named.
 */
public class TraitDownloadService {

    private static final int MaxSourceLen = 150;

    public Trait findTrait(int traitId) {
        return Trait.find().byId(traitId);
    }

    public Feature findFeature(int featureId) {
        return Feature.find().byId(featureId);
    }

    public boolean isInheritanceTypeSupported(Trait trait) {
        int inheritanceType = trait.getFeature().getInheritanceType().getId();

        return inheritanceType == InheritanceType.EnumAdditive ||
            inheritanceType == InheritanceType.EnumSingle ||
            inheritanceType == InheritanceType.EnumStandard ||
            inheritanceType == InheritanceType.Month ||
            inheritanceType == InheritanceType.Bool ||
            inheritanceType == InheritanceType.Basic ||
            inheritanceType == InheritanceType.Numeric ||
            inheritanceType == InheritanceType.IntervalShallow ||
            inheritanceType == InheritanceType.IntervalDeep ||
            inheritanceType == InheritanceType.EnumSyntaxon ||
            inheritanceType == InheritanceType.Distribution;
    }

    /**
     * @throws Exception when the export data cannot be built
     */
    public TraitExportResponse exportTrait(User currentUser, Messages messages, Trait trait) throws Exception {
        TraitExportService exportService = new TraitExportService(messages, currentUser, trait);
        return exportService.buildDetailedExport();
    }

    /**
     * @param user user to log the download for, null in case of an unauthenticated download
     * @throws Exception when the export data cannot be built
     */
    public TraitExportResponse downloadTraitData(Session session, Trait trait, User user, Messages messages, Locale locale) throws Exception {
        TraitsExportService exportService = new TraitsExportService(trait, new UserOptions(user), messages, locale);

        if (user != null) {
            Feature feature = trait.getFeature();
            ActivityDetails details = new ActivityDetails();
            details.description = String.format("trait #%d, '%s', feature #%d, '%s'",
                trait.getId(),
                StringUtils.isNotBlank(trait.getDescriptionEn())
                    ? StringUtils.abbreviate(trait.getDescriptionEn(), MaxSourceLen)
                    : "",
                feature.getId(),
                feature.getNameEn());

            UserActivityService.recordActivity(session, UserActivity.TraitDownload, details);
        }

        String filename = buildTraitExcelFilename(trait, locale, false);
        return new TraitExportResponse(exportService.doExport(), filename);
    }

    /**
     * @return attachment of the trait or null when the trait has no attachment
     */
    public TraitExportResponse downloadAttachment(Trait trait) {
        byte[] data = trait.getAttachment();
        if (data == null) {
            return null;
        }

        //use cs locale until a new requirement comes up
        Locale locale = Locale.forLanguageTag("cs");
        return new TraitExportResponse(data, buildTraitExcelFilename(trait, locale, true));
    }

    /**
     * Finds the trait to offer to the public - the default one, or at least a non-deleted public one.
     *
     * @return suitable trait or null when the feature has none
     */
    public Trait findPublicTraitForFeature(int featureId) {
        Feature feature = Feature.find().byId(featureId);
        if (feature == null) {
            return null;
        }

        Trait candidate = null;
        for (Trait t : feature.getSubordinateTraits()) {
            if (t.getVisibilityStatus().getId() != VisibilityStatus.PublicAccessId ||
                t.isDeleted()) {
                continue;
            }

            if (t.isDefault()) {
                candidate = t;
                break;
            } else if (candidate == null) {
                //we always prefer default trait to others
                candidate = t;
            }
        }
        return candidate;
    }

    private String buildTraitExcelFilename(Trait trait, Locale locale, boolean isAttachment) {
        boolean isEnglish = Locale.ENGLISH.equals(locale);
        Feature feature = trait.getFeature();
        String featureNameRaw = isEnglish
            ? feature.getNameEn()
            : feature.getNameCz();
        String featureName = escape(featureNameRaw);
        String source = escape(trait.getSource());
        if (StringUtils.isNotEmpty(source) && source.length() > MaxSourceLen) {
            source = source.substring(0, MaxSourceLen);
        }
        String filename;
        if (isAttachment) {
            String attachmentText = isEnglish ? "ATTACHMENT" : "PRILOHA";
            filename = String.format("%s_%s.%s", featureName, attachmentText, trait.getAttachmentType());
        } else {
            filename = String.format("%s.xlsx", featureName);
        }
        return PladiasStringUtils.normalize(filename);
    }

    private String escape(String s) {
        if (s == null) {
            return "";
        }

        return s.replace(" ", "_").replace(",", "_");
    }
}
