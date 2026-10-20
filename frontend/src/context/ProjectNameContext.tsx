import React, {createContext, useContext, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";

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
 * The project name is fetched from the PlayMessage API using the "project_name" key.
 */
export const ProjectNameProvider: React.FC<Props> = ({children}) => {
    const {i18n} = useTranslation();
    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchProjectName = async () => {
            const lang = i18n.language || "cs";
            try {
                const res = await fetch(`/api/react/playmessage/project_name?lang=${lang}`);
                const data = await res.json() as {success?: boolean; data?: {value?: string}};
                if (data.success && data.data) {
                    // Strip HTML tags from the project name
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = data.data.value ?? "";
                    const plainText = tempDiv.textContent || tempDiv.innerText || "";
                    setProjectName(plainText);
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to load project name:", err);
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
            }
        };

        fetchProjectName();
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
