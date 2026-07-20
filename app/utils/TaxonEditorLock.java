package utils;

import models.User;

public class TaxonEditorLock {

    public static TaxonEditorLock Instance = new TaxonEditorLock();

    private User lockedBy;
    private boolean isDirty;

    private TaxonEditorLock() {
    }

    public synchronized String getLockedByUserName() {
        if (lockedBy == null)
            return "";

        return lockedBy.getSurname() + ", " + lockedBy.getName();
    }

    public synchronized boolean Lock(User user) {
        if (lockedBy == null) {
            lockedBy = user;
            return true;
        }
        return lockedBy != null && lockedBy.equals(user);
    }

    public synchronized boolean HoldsLock(User currentUser) {
        if (lockedBy == null) {
            return false;
        }

        return lockedBy.equals(currentUser);
    }

    public void SetDirty(boolean value) {
        isDirty = value;
    }

    public boolean IsDirty() {
        return isDirty;
    }

    public synchronized boolean Unlock(User currentUser) {
        if (lockedBy == null) {
            return true;
        }
        if (lockedBy != null && lockedBy.equals(currentUser)) {
            lockedBy = null;
            return true;
        }

        return false;
    }
}
