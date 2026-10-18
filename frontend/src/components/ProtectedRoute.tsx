import { Navigate, useLocation } from "react-router-dom";
import { useInstanceConfig } from "@/context/InstanceConfigContext";
import { useUser } from "@/context/UserContext";
import type { UserRole } from "@/models/User";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredModule?: string;
    requiredRole?: string;
    requiredRoles?: string[];
}

/**
 * ProtectedRoute - A component that restricts access to routes based on module availability and user roles.
 *
 * Roles are assigned by the backend (`/api/react/config` -> `roles: string[]`, source: backend UserRole enum).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components to render if access is granted
 * @param {string} props.requiredModule - The required module ("atlas", "biblio", or "measurements")
 * @param {string} props.requiredRole - The required user role (e.g., "mapAdmin", "bulkEditor").
 *                                    Single role - user must have this role.
 * @param {string[]} props.requiredRoles - Array of roles where having ANY ONE grants access (OR logic).
 *                                      Cannot be used together with requiredRole.
 */
const ProtectedRoute = ({
    children,
    requiredModule,
    requiredRole,
    requiredRoles
}: ProtectedRouteProps) => {
    const { hasAtlasModule, hasBiblioModule, hasMeasurementsModule } = useInstanceConfig();
    const user = useUser();
    const location = useLocation();

    // Check module availability
    if (requiredModule === "atlas" && !hasAtlasModule) {
        return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
    if (requiredModule === "biblio" && !hasBiblioModule) {
        return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
    if (requiredModule === "measurements" && !hasMeasurementsModule) {
        return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }

    // Single role check
    if (requiredRole) {
        if (!user.hasRole(requiredRole as UserRole)) {
            return <Navigate to="/unauthorized" replace state={{ from: location }} />;
        }
    }

    // Multiple roles check (OR logic - any one grants access)
    if (requiredRoles && requiredRoles.length > 0) {
        const hasAnyRole = requiredRoles.some(role => user.hasRole(role as UserRole));
        if (!hasAnyRole) {
            return <Navigate to="/unauthorized" replace state={{ from: location }} />;
        }
    }

    return children;
};

export default ProtectedRoute;
