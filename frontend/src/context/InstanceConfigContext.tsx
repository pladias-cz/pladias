import React, {createContext, useContext} from 'react';
import InstanceConfig, {type InstanceConfigData} from '../models/InstanceConfig';

interface Props {
    config: InstanceConfigData;
    children: React.ReactNode;
}

const InstanceConfigContext = createContext<InstanceConfig | null>(null);

export const InstanceConfigProvider: React.FC<Props> = ({children, config}) => {
    const instanceConfig = new InstanceConfig(config);
    return (
        <InstanceConfigContext.Provider value={instanceConfig}>
            {children}
        </InstanceConfigContext.Provider>
    );
};

export const useInstanceConfig = (): InstanceConfig => {
    const ctx = useContext(InstanceConfigContext);
    if (!ctx) {
        throw new Error('useInstanceConfig must be used inside InstanceConfigProvider');
    }
    return ctx;
};
