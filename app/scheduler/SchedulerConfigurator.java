package scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import repositories.ITraitRepository;
import service.config.IConfigService;
import service.export.records.IRecordsExportService;
import tasks.ExportRecordsToFileTask;
import tasks.TraitDistributionComputerTask;

import javax.inject.Inject;
import java.util.concurrent.TimeUnit;

public class SchedulerConfigurator {

    final Logger _logger = LoggerFactory.getLogger(SchedulerConfigurator.class);
    private final IScheduler _scheduler;
    private final IConfigService _configService;
    private final ITraitRepository _traitRepository;
    private final IRecordsExportService _recordsExportService;
    private final int DaysInWeek = 7;
    private final int MinutesInDay = 24 * 60;
    private final int ScheduleTime = 3 * 60; //3:00 am

    @Inject
    public SchedulerConfigurator(IConfigService configService, ITraitRepository traitRepository,
                                 IRecordsExportService recordsExportService, IScheduler scheduler) {
        _logger.info("Instantiating SchedulerConfigurator");
        _configService = configService;
        _traitRepository = traitRepository;
        _recordsExportService = recordsExportService;
        _scheduler = scheduler;
        registerPeriodicTasks();
    }

    private void registerPeriodicTasks() {
        if (_configService.isVascular()) {
            registerVascularTasks();
        } else if (_configService.isNonVascular()) {
            registerNonVascularTasks();
        }
    }

    private void registerNonVascularTasks() {
        registerRecordsExporterTask();
    }

    private void registerVascularTasks() {
        registerTraitDistributionComputerTask();
    }

    private void registerRecordsExporterTask() {
        ExportRecordsToFileTask task = new ExportRecordsToFileTask(_recordsExportService);

        int initialDelay = computeInitialDelay();
        _scheduler.registerPeriodic(task, initialDelay, MinutesInDay * DaysInWeek, TimeUnit.MINUTES);
        _logger.info(String.format("Task %s will be scheduled in %d minutes.", task.getName(), initialDelay));
    }

    private void registerTraitDistributionComputerTask() {
        TraitDistributionComputerTask task = new TraitDistributionComputerTask(_configService, _traitRepository);

        int initialDelay = computeInitialDelay();
        _scheduler.registerPeriodic(task, initialDelay, MinutesInDay, TimeUnit.MINUTES);
        _logger.info(String.format("Task %s will be scheduled in %d minutes.", task.getName(), initialDelay));
    }

    private int computeInitialDelay() {
        return 0;
        //DateTime dt = DateTime.now();
        //int initialDelay = MinutesInDay - dt.getMinuteOfDay() + ScheduleTime;
        //return initialDelay;
    }
}
