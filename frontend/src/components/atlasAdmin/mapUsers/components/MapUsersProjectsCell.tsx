/**
 * Projects cell renderer for MapUsers table
 */

import {Badge, Button} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {MapUserTableRow} from '../types';

interface MapUsersProjectsCellProps {
    row: MapUserTableRow;
    onAddProject: (userId: number) => void;
    onRemoveProject: (userId: number, projectId: number) => void;
}

export function MapUsersProjectsCell({row, onAddProject, onRemoveProject}: MapUsersProjectsCellProps) {
    const {t} = useTranslation();

    return (
        <div className="d-flex flex-wrap align-items-center gap-1">
            {row.contributionProjects?.map((project) => (
                <Badge 
                    key={project.id} 
                    bg="primary" 
                    className="d-inline-flex align-items-center gap-1"
                >
                    <span>{project.abbrev || project.name}</span>
                    <span 
                        style={{cursor: 'pointer'}}
                        onClick={() => onRemoveProject(row.id, project.id)}
                        title={t("user.usersAdministration.removeProject")}
                    >
                        &times;
                    </span>
                </Badge>
            ))}
            <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => onAddProject(row.id)}
                className="py-0 px-1 d-inline-flex align-items-center justify-content-center"
                style={{lineHeight: 1, minHeight: '1.5em'}}
                aria-label={t("user.usersAdministration.addProject")}
            >
                +
            </Button>
        </div>
    );
}
