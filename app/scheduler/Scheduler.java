package scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tasks.ITask;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class Scheduler implements IScheduler {
    private static final int MAX_QUEUE_SIZE = 1;
    final Logger logger = LoggerFactory.getLogger(Scheduler.class);
    final Thread queueRunner;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private final TaskQueue taskQueue = new TaskQueue(MAX_QUEUE_SIZE);

    public Scheduler() {
        queueRunner = new Thread(new TaskQueueRunner(taskQueue));
    }

    @Override
    public void registerPeriodic(ITask task, long initialDelay, long period, TimeUnit unit) {
        scheduler.scheduleAtFixedRate(
            createRunnable(task), initialDelay, period, TimeUnit.MINUTES);
    }

    private Runnable createRunnable(ITask task) {
        return new Runnable() {
            @Override
            public void run() {
                try {
                    task.execute();
                } catch (Exception ex) {
                    logger.error("Failed to run periodic task '" + task.getName() + "'.", ex);
                }
            }
        };
    }

    @Override
    public void registerAsync(ITask task) throws QueueFullException {
        taskQueue.registerTask(task);

        if (!queueRunner.isAlive()) {
            queueRunner.start();
        }
    }
}
