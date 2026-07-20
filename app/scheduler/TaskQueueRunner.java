package scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class TaskQueueRunner implements Runnable {

    private final TaskQueue queue;
    private final Logger logger = LoggerFactory.getLogger(TaskQueue.class);

    TaskQueueRunner(TaskQueue queue) {
        this.queue = queue;
    }

    @Override
    public void run() {
        while (true) {
            processTask();
        }
    }

    private void processTask() {
        try {
            queue.executeTask();
        } catch (Exception e) {
            logger.error("Task execution failed", e);
        }
    }
}
