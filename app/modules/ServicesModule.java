package modules;

import com.google.inject.AbstractModule;
import com.google.inject.Singleton;
import com.google.inject.matcher.Matchers;

import db.DatabaseContextInterceptor;
import db.UseReplica;
import mail.MailService;
import scheduler.IScheduler;
import scheduler.Scheduler;
import service.accessrights.AccessRightsService;
import service.accessrights.IAccessRightsService;
import service.accessrights.ITokenAuthService;
import service.accessrights.TokenAuthService;
import service.comment.CommentService;
import service.comment.ICommentService;
import service.config.ConfigService;
import service.config.IConfigService;
import service.excel.IDocumentLoadServiceFactory;
import service.excel.IExcelTableImportService;
import service.excel.IExcelTableValidationServiceFactory;
import service.excel.impl.DocumentLoadServiceFactory;
import service.excel.impl.ExcelTableImportService;
import service.excel.impl.ExcelTableValidationServiceFactory;
import service.export.records.IRecordsExportService;
import service.export.records.RecordsExportService;
import service.password.IEncryptionService;
import service.password.IHashService;
import service.password.PladiasEncryptionService;
import service.password.PladiasHashService;
import service.phytochorion.PhytochorionService;
import service.revisors.IRevisorService;
import service.revisors.RevisorService;
import service.search.IPageSearchService;
import service.search.PageSearchService;
import service.taxon.ITaxonService;
import service.taxon.TaxonService;
import service.trait.ITraitService;
import service.trait.TraitService;

public class ServicesModule extends AbstractModule {

    @Override
    protected void configure() {
        
        // Registrace interceptoru pro @UseReplica anotace
        // Automaticky přepíná databázový kontext na replica pro read-only operace
        bindInterceptor(
            Matchers.any(),
            Matchers.annotatedWith(UseReplica.class),
            new DatabaseContextInterceptor()
        );

        bind(IAccessRightsService.class)
            .to(AccessRightsService.class)
            .in(Singleton.class);

        bind(ITokenAuthService.class)
            .to(TokenAuthService.class)
            .in(Singleton.class);

        bind(PhytochorionService.class)
            .asEagerSingleton();

        bind(IConfigService.class)
            .to(ConfigService.class)
            .in(Singleton.class);

        bind(IPageSearchService.class)
            .to(PageSearchService.class)
            .in(Singleton.class);

        bind(IExcelTableValidationServiceFactory.class)
            .to(ExcelTableValidationServiceFactory.class)
            .in(Singleton.class);

        bind(IDocumentLoadServiceFactory.class)
            .to(DocumentLoadServiceFactory.class)
            .in(Singleton.class);

        bind(ITraitService.class)
            .to(TraitService.class)
            .in(Singleton.class);

        //ExcelTableImportService is stateful
        bind(IExcelTableImportService.class)
            .to(ExcelTableImportService.class);

        bind(IRecordsExportService.class)
            .to(RecordsExportService.class)
            .in(Singleton.class);

        bind(ITaxonService.class)
            .to(TaxonService.class)
            .in(Singleton.class);

        bind(IRevisorService.class)
            .to(RevisorService.class)
            .in(Singleton.class);

        bind(ICommentService.class)
            .to(CommentService.class)
            .in(Singleton.class);

        bind(MailService.class);

        bind(IEncryptionService.class)
            .to(PladiasEncryptionService.class)
            .in(Singleton.class);

        bind(IScheduler.class)
            .to(Scheduler.class)
            .in(Singleton.class);

        bind(IHashService.class)
            .to(PladiasHashService.class)
            .in(Singleton.class);
    }
}
