package scheduler;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SingleThreadedExecutor {

    private final ExecutorService singleThreadExecutor;

    public SingleThreadedExecutor() {
        singleThreadExecutor = Executors.newSingleThreadExecutor();
    }

    public void register(Runnable task) {
        singleThreadExecutor.submit(task);
    }
}
