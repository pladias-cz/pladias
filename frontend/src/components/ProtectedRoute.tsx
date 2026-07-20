import { Navigate, useLocation } from "react-router-dom";
import { useInstanceConfig } from "@/context/InstanceConfigContext";
import { useUser } from "@/context/UserContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredModule?: string;
    requiredPermission?: string;
    requiredPermissions?: string[];
}

const permissionKeys = [
    'isMapAdmin',
    'isBulkEditor', 
    'isTraitAdmin',
    'isSysAdmin',
    'isTaxonAdmin',
    'isAsyncImporter'
] as const;

type PermissionKey = typeof permissionKeys[number];

/**
 * ProtectedRoute - A component that restricts access to routes based on module availability and user permissions.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components to render if access is granted
 * @param {string} props.requiredModule - The required module ("atlas", "biblio", or "measurements")
 * @param {string} props.requiredPermission - The required user permission (e.g., "isMapAdmin", "isBulkEditor").
 *                                            Single permission - user must have this permission.
 * @param {string[]} props.requiredPermissions - Array of permissions where having ANY ONE grants access (OR logic).
 *                                              Cannot be used together with requiredPermission.
 */
const ProtectedRoute = ({ 
    children, 
    requiredModule,
    requiredPermission,
    requiredPermissions
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

    // Check user permission(s)
    const permissions: Record<PermissionKey, boolean> = {
        isMapAdmin: user.isMapAdmin,
        isBulkEditor: user.isBulkEditor,
        isTraitAdmin: user.isTraitAdmin,
        isSysAdmin: user.isSysAdmin,
        isTaxonAdmin: user.isTaxonAdmin,
        isAsyncImporter: user.isAsyncImporter
    };

    // Single permission check
    if (requiredPermission) {
        const key = requiredPermission as PermissionKey;
        if (!permissions[key]) {
            return <Navigate to="/unauthorized" replace state={{ from: location }} />;
        }
    }

    // Multiple permissions check (OR logic - any one grants access)
    if (requiredPermissions && requiredPermissions.length > 0) {
        const hasAnyPermission = requiredPermissions.some(perm => permissions[perm as PermissionKey]);
        if (!hasAnyPermission) {
            return <Navigate to="/unauthorized" replace state={{ from: location }} />;
        }
    }

    return children;
};

export default ProtectedRoute;
