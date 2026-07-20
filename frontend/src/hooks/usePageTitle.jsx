import {useEffect} from "react";
import {useProjectName} from "@/context/ProjectNameContext";

/**
 * usePageTitle - A hook that sets the document title with the project name.
 * 
 * Uses the ProjectNameContext to access the project name, avoiding duplicate fetch calls.
 * 
 * @param {string} title - The page title to display before the project name
 */
export function usePageTitle(title) {
    const {projectName} = useProjectName();

    useEffect(() => {
        if (projectName) {
            document.title = `${title} – ${projectName}`;
        } else {
            document.title = title;
        }
    }, [title, projectName]);
}
