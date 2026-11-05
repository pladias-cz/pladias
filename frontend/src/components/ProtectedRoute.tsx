import {Navigate, useLocation} from 'react-router-dom';
import {useInstanceConfig} from '@/context/InstanceConfigContext';
import {useUser} from '@/context/UserContext';
import type {InstanceModule} from '@/models/InstanceConfig';
import type {UserRole} from '@/models/UserRole';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredModule?: InstanceModule;
    requiredRole?: UserRole;
    requiredRoles?: readonly UserRole[];
}

/**
 * ProtectedRoute - A component that restricts access to routes based on module availability and user roles.
 *
 * Roles are assigned by the backend (`/api/react/config` -> `roles: UserRole[]`, source: backend UserRole enum,
 * FE mirror in `models/UserRole.ts`). Props are compile-time kontrolované – překlep v názvu role
 * ani modulu neprojde `tsc -b`.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components to render if access is granted
 * @param {InstanceModule} props.requiredModule - The required module ("atlas", "biblio", or "measurements")
 * @param {UserRole} props.requiredRole - The required user role (e.g., "mapAdmin", "traitAdmin").
 *                                    Single role - user must have this role.
 * @param {readonly UserRole[]} props.requiredRoles - Array of roles where having ANY ONE grants access (OR logic).
 *                                      Cannot be used together with requiredRole.
 */
const ProtectedRoute = ({
                            children,
                            requiredModule,
                            requiredRole,
                            requiredRoles
                        }: ProtectedRouteProps) => {
    const instanceConfig = useInstanceConfig();
    const user = useUser();
    const location = useLocation();

    // Check module availability (declarative - see InstanceConfig.hasModule)
    if (requiredModule && !instanceConfig.hasModule(requiredModule)) {
        return <Navigate to="/unauthorized" replace state={{from: location}}/>;
    }

    // Single role check
    if (requiredRole && !user.hasRole(requiredRole)) {
        return <Navigate to="/unauthorized" replace state={{from: location}}/>;
    }

    // Multiple roles check (OR logic - any one grants access)
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.some(role => user.hasRole(role))) {
        return <Navigate to="/unauthorized" replace state={{from: location}}/>;
    }

    return children;
};

export default ProtectedRoute;
