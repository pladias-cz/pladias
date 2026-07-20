package scheduler;

import org.junit.Test;

import tasks.ITask;

public class TaskQueueShould {

    @Test(expected = IllegalArgumentException.class)
    public void requirePositiveMaxQueueSize()
    {
        new TaskQueue(0);
    }
    
    private ITask createTask(int num) {
        return new ITask() {
            
            @Override
            public String getName() {
                return ""+num;
            }
            
            @Override
            public void execute() {
                throw new RuntimeException();
            }
        };
    }
    
    @Test
    public void notQueueMoreElementsThanMaxSize()
    {
        TaskQueue executor = new TaskQueue(1);

        
        try {
            executor.registerTask(createTask(1));
        }
        catch (QueueFullException e)
        {
            //first registration should succeed
            assert false;
        }
        
        try {
            executor.registerTask(createTask(2));
        }
        catch (QueueFullException e)
        {
            //second should throw
            return;
        }
        assert false;
    }
    
    @Test(expected = RuntimeException.class)
    public void executeRegisteredTask() throws Exception 
    {
        TaskQueue executor = new TaskQueue(1);
        
        try {
            executor.registerTask(createTask(1));
        }
        catch (QueueFullException e)
        {
            //we expect success
            assert false;
        }
        
        executor.executeTask();
    }
}
