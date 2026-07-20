import React, {createContext, useContext} from "react";
import InstanceConfig from "../models/InstanceConfig";

const InstanceConfigContext = createContext(null);

export const InstanceConfigProvider = ({children, config}) => {
    const instanceConfig = new InstanceConfig(config);
    return (
        <InstanceConfigContext.Provider value={instanceConfig}>
            {children}
        </InstanceConfigContext.Provider>
    );
};

export const useInstanceConfig = () => {
    const ctx = useContext(InstanceConfigContext);
    if (!ctx) {
        throw new Error("useInstanceConfig must be used inside InstanceConfigProvider");
    }
    return ctx;
};