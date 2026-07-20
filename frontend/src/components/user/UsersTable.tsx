import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {DataTable} from "@/core/dataTable";
import {
    createTextColumn,
    createCheckboxColumn,
} from "@/core/dataTable";

/**
 * User interface for the UsersTable component
 * Matches the API response structure from /api/react/users
 */
export interface UserTableRow {
    id: number;
    name: string;
    surname: string;
    email: string;
    mapAdmin: boolean;
    traitAdmin: boolean;
    sysAdmin: boolean;
    biblioAdmin: boolean;
    taxonAdmin: boolean;
    deleted: boolean;
    projectsCount?: number;
}

export default function UsersTable() {
    const {t} = useTranslation();

    // Handle field changes for checkbox toggles
    const handleFieldChange = async (user: UserTableRow, field: keyof UserTableRow, value: boolean) => {
        try {
            const response = await fetch(`/api/react/users/${user.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({[field]: value}),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to update user:", errorText);
                throw new Error(errorText || "Failed to update user");
            }
        } catch (err) {
            console.error("Error updating user:", err);
            throw err; // Re-throw to let DataTable handle the error
        }
    };

    // Column definitions with filtering and sorting enabled
    const columns = useMemo(() => [
        createTextColumn<UserTableRow>('name', t("user.usersAdministration.firstName"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<UserTableRow>('surname', t("user.usersAdministration.lastName"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<UserTableRow>('email', t("user.usersAdministration.email"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createCheckboxColumn<UserTableRow>('mapAdmin', t("user.usersAdministration.mapAdmin"), 
            (row, checked) => handleFieldChange(row, 'mapAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('traitAdmin', t("user.usersAdministration.traitAdmin"), 
            (row, checked) => handleFieldChange(row, 'traitAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('sysAdmin', t("user.usersAdministration.sysAdmin"), 
            (row, checked) => handleFieldChange(row, 'sysAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('biblioAdmin', t("user.usersAdministration.biblioAdmin"), 
            (row, checked) => handleFieldChange(row, 'biblioAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('taxonAdmin', t("user.usersAdministration.taxonAdmin"), 
            (row, checked) => handleFieldChange(row, 'taxonAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('deleted', t("user.usersAdministration.deleted"), 
            (row, checked) => handleFieldChange(row, 'deleted', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
    ], [t]);

    return (
        <div className="container-fluid">
            <DataTable<UserTableRow>
                endpoint="/api/react/users"
                columns={columns}
                onRowUpdate={async (_row, _field, _value) => {
                    // This callback is called after a successful toggle
                    // The DataTable will automatically refresh the data
                }}
            />
        </div>
    );
}