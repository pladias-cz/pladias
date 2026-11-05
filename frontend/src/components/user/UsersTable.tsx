import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {DataTable} from '@/core/dataTable';
import {
    createActionColumn,
    createTextColumn,
    createCheckboxColumn,
} from '@/core/dataTable';
import {useConfirm} from '@/hooks/useConfirm';
import {requestUserPasswordReset, updateUserFlag, type UserFlagField} from '@/services/userApi';
import {notifyApiError, useNotifications} from '@/stores/notificationStore';

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
    const {confirm, dialog} = useConfirm();
    const {push} = useNotifications();
    const [busyUserId, setBusyUserId] = useState<number | null>(null);

    // Handle field changes for checkbox toggles
    const handleFieldChange = async (user: UserTableRow, field: UserFlagField, value: boolean) => {
        await updateUserFlag(user.id, field, value);
    };

    // Pošle uživateli e-mail s jednorázovým odkazem pro reset hesla (nové heslo si zvolí sám)
    const handleResetPassword = useCallback(async (user: UserTableRow) => {
        if (!(await confirm({
            message: t('user.usersAdministration.resetPasswordConfirm', {email: user.email}),
            confirmLabel: t('user.usersAdministration.resetPassword'),
            confirmVariant: 'primary',
        }))) {
            return;
        }

        setBusyUserId(user.id);
        try {
            const message = await requestUserPasswordReset(user.id);
            push({type: 'success', message: message || t('user.usersAdministration.resetPasswordSent')});
        } catch (e) {
            notifyApiError(e, t('user.usersAdministration.resetPasswordFailed'));
        } finally {
            setBusyUserId(null);
        }
    }, [confirm, push, t]);

    // Column definitions with filtering and sorting enabled
    const columns = useMemo(() => [
        createTextColumn<UserTableRow>('name', t('user.usersAdministration.firstName'), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<UserTableRow>('surname', t('user.usersAdministration.lastName'), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<UserTableRow>('email', t('user.usersAdministration.email'), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createCheckboxColumn<UserTableRow>('mapAdmin', t('user.usersAdministration.mapAdmin'),
            (row, checked) => handleFieldChange(row, 'mapAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('traitAdmin', t('user.usersAdministration.traitAdmin'),
            (row, checked) => handleFieldChange(row, 'traitAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('sysAdmin', t('user.usersAdministration.sysAdmin'),
            (row, checked) => handleFieldChange(row, 'sysAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('biblioAdmin', t('user.usersAdministration.biblioAdmin'),
            (row, checked) => handleFieldChange(row, 'biblioAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('taxonAdmin', t('user.usersAdministration.taxonAdmin'),
            (row, checked) => handleFieldChange(row, 'taxonAdmin', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createCheckboxColumn<UserTableRow>('deleted', t('user.usersAdministration.deleted'),
            (row, checked) => handleFieldChange(row, 'deleted', checked),
            {
                enableSorting: true,
                enableFiltering: true,
            }
        ),
        createActionColumn<UserTableRow>('resetPassword', t('user.usersAdministration.actions'), (row) => (
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={busyUserId === row.id}
                onClick={() => void handleResetPassword(row)}
            >
                {busyUserId === row.id
                    ? t('user.usersAdministration.waitToClose')
                    : t('user.usersAdministration.resetPassword')}
            </button>
        ), {
            minWidth: '120px',
        }),
    ], [t, busyUserId, handleResetPassword]);

    return (
        <>
            {dialog}
            <div className="container-fluid">
                <DataTable<UserTableRow>
                    endpoint="/api/react/users"
                    columns={columns}
                    onRowUpdate={async () => {
                        // This callback is called after a successful toggle
                        // The DataTable will automatically refresh the data
                    }}
                />
            </div>
        </>
    );
}
