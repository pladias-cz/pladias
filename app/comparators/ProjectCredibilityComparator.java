package comparators;

import models.Project;

import java.util.Comparator;

public class ProjectCredibilityComparator implements Comparator<Project> {
    @Override
    public int compare(Project p1, Project p2) {
        return p2.getCredibility() - p1.getCredibility();
    }
}
