import React, {createContext, useContext, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {isAbortError} from "@/services/apiClient";
import {loadProjectName} from "@/services/instanceApi";

interface ProjectNameContextValue {
    projectName: string;
    loading: boolean;
    error: Error | null;
}

interface Props {
    children: React.ReactNode;
}

const ProjectNameContext = createContext<ProjectNameContextValue | null>(null);

/**
 * ProjectNameProvider - A context provider that fetches and provides the project name.
 * The project name is fetched from the PlayMessage API using the "project_name" key
 * (via `services/instanceApi` – stejný vzor jako heartbeat, docs/refactoring.md sekce A.4).
 * Změna jazyka ruší rozjetý request (AbortController) a načítá znovu.
 */
export const ProjectNameProvider: React.FC<Props> = ({children}) => {
    const {i18n} = useTranslation();
    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const lang = i18n.language || "cs";

        setLoading(true);
        loadProjectName(lang, {signal: controller.signal})
            .then((name) => {
                setProjectName(name);
                setError(null);
            })
            .catch((err) => {
                // přepnutí jazyka přeruší request v letu – to není chyba
                if (isAbortError(err)) {
                    return;
                }
                console.error("Failed to load project name:", err);
                setError(err instanceof Error ? err : new Error(String(err)));
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [i18n.language]);

    return (
        <ProjectNameContext.Provider value={{projectName, loading, error}}>
            {children}
        </ProjectNameContext.Provider>
    );
};

/**
 * useProjectName - A hook to access the project name from context.
 */
export const useProjectName = (): ProjectNameContextValue => {
    const ctx = useContext(ProjectNameContext);
    if (!ctx) {
        throw new Error("useProjectName must be used within a ProjectNameProvider");
    }
    return ctx;
};
