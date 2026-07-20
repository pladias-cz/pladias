package scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tasks.ITask;

import java.util.concurrent.ArrayBlockingQueue;

public class TaskQueue {

    private final ArrayBlockingQueue<ITask> queue;
    private final Logger _logger = LoggerFactory.getLogger(TaskQueue.class);


    TaskQueue(int maxQueueSize) {
        this.queue = new ArrayBlockingQueue<ITask>(maxQueueSize);
    }

    public void registerTask(ITask task) throws QueueFullException {
        boolean added = queue.offer(task);
        if (!added) {
            throw new QueueFullException();
        }
    }

    public void executeTask() throws Exception {
        try {
            ITask task = queue.take();
            _logger.info("Executing async task {} from queue", task.getName());
            task.execute();
            _logger.info("Async task {} executed.", task.getName());
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
