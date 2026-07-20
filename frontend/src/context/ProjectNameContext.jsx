import React, {createContext, useContext, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";

const ProjectNameContext = createContext(null);

/**
 * ProjectNameProvider - A context provider that fetches and provides the project name.
 * The project name is fetched from the PlayMessage API using the "project_name" key.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const ProjectNameProvider = ({children}) => {
    const {i18n} = useTranslation();
    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProjectName = async () => {
            const lang = i18n.language || "cs";
            try {
                const res = await fetch(`/api/react/playmessage/project_name?lang=${lang}`);
                const data = await res.json();
                if (data.success && data.data) {
                    // Strip HTML tags from the project name
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = data.data.value;
                    const plainText = tempDiv.textContent || tempDiv.innerText || "";
                    setProjectName(plainText);
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to load project name:", err);
                setError(err);
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
 * @returns {{projectName: string, loading: boolean, error: Error|null}}
 */
export const useProjectName = () => {
    const ctx = useContext(ProjectNameContext);
    if (!ctx) {
        throw new Error("useProjectName must be used within a ProjectNameProvider");
    }
    return ctx;
};

export default ProjectNameContext;