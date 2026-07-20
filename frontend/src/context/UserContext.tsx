import React, {createContext, useContext} from "react";
import User, {type UserData} from "@/models/User";

const UserContext = createContext<User | null>(null);

interface Props {
    user: UserData;
    children: React.ReactNode;
}

export const UserProvider: React.FC<Props> = ({children, user}) => {
    const userData = new User(user);

    return (
        <UserContext.Provider value={userData}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): User => {
    const ctx = useContext(UserContext);
    if (!ctx) {
        throw new Error("useUser must be used inside UserProvider");
    }
    return ctx;
};
