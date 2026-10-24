import {useEffect, useState} from "react";
import {Card, Spinner} from "react-bootstrap";
import {type Taxon} from "@/models/Taxon";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {getTaxonFirstChildren, moveTaxonBeforeSibling} from "@/services/taxonApi";
import {notifyApiError} from "@/stores/notificationStore";

interface Props {
    taxon: Taxon;
}

export default function ChildrenOrderingCard({taxon}: Props) {
    const {t} = useTranslation();
    const [children, setChildren] = useState<Taxon[]>([]);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        getTaxonFirstChildren(taxon.id)
            .then(setChildren)
            .catch(e => {
                notifyApiError(e, t("taxon.ordering.loadFailed"));
            });
    }, [taxon.id, t]);

    function handleDragStart(id: number) {
        if (isUpdating) return;
        setDraggedId(id);
    }

    async function handleDrop(targetId: number) {
        if (draggedId == null || draggedId === targetId || isUpdating) return;

        const original = [...children];

        // optimistický reorder v UI
        const dragged = children.find(c => c.id === draggedId)!;
        const filtered = children.filter(c => c.id !== draggedId);
        const targetIndex = filtered.findIndex(c => c.id === targetId);
        filtered.splice(targetIndex, 0, dragged);

        setChildren(filtered);
        setHoveredId(null);
        setIsUpdating(true);

        try {
            await moveTaxonBeforeSibling(draggedId, targetId);
        } catch (e) {
            setChildren(original); // rollback
            notifyApiError(e, t("taxon.ordering.reorderFailed"));
        } finally {
            setIsUpdating(false);
            setDraggedId(null);
        }
    }

    return (
        <Card>
            <Card.Header>
                {t("taxon.ordering.title")}
                {isUpdating && <Spinner size="sm" className="ms-2" animation="border"/>}
            </Card.Header>

            <Card.Body>
                {children.map((c) => (
                    <div key={c.id} style={{position: "relative"}}>
                        {/* indikátor kam padne */}
                        {hoveredId === c.id && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    backgroundColor: "blue",
                                    zIndex: 10,
                                }}
                            />
                        )}

                        <div
                            draggable={!isUpdating}
                            onDragStart={() => handleDragStart(c.id)}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (!isUpdating && draggedId !== c.id) setHoveredId(c.id);
                            }}
                            onDragLeave={() => setHoveredId(null)}
                            onDrop={() => handleDrop(c.id)}
                            className={`p-2 mb-1 border rounded d-flex align-items-center gap-2 ${
                                draggedId === c.id ? "bg-light" : ""
                            }`}
                            style={{cursor: isUpdating ? "not-allowed" : "move"}}
                        >
                            {/* odkaz na detail */}
                            <Link
                                to={`/user/taxaAdministration/${c.id}`}
                                onMouseDown={(e) => e.stopPropagation()} // 🔑 zabrání drag startu
                                onDragStart={(e) => e.preventDefault()} // 🔑 zabrání přetažení linku
                                className="text-decoration-none"
                            >
                                {c.nameLat}
                            </Link>
                        </div>

                    </div>
                ))}
            </Card.Body>
        </Card>
    );
}
