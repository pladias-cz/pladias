package scheduler;

import tasks.ITask;

import java.util.concurrent.TimeUnit;

public interface IScheduler {

    void registerPeriodic(ITask task, long initialDelay, long period, TimeUnit unit);

    void registerAsync(ITask task) throws QueueFullException;
}
