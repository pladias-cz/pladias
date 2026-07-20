package models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class UserSettingPK {

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "key")
    private String key;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }


    public boolean equals(Object o) {
        if (!(o instanceof UserSettingPK other)) {
            return false;
        }

        return userId.equals(other.userId) &&
            (key.equals(other.key));
    }

    public int hashCode() {
        return (int) (userId * 17 + key.hashCode());
    }
}
