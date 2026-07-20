import { useEffect, useState } from "react";
import { Card, Spinner } from "react-bootstrap";
import { type Taxon } from "@/models/Taxon";
import { useTranslation } from "react-i18next";
import {Link} from "react-router-dom";

interface Props {
    taxon: Taxon;
}

export default function ChildrenOrderingCard({ taxon }: Props) {
    const {t} = useTranslation();
    const [children, setChildren] = useState<Taxon[]>([]);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/react/taxon/${taxon.id}/firstChildren`)
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    setChildren(json.data);
                }
            });
    }, [taxon.id]);

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
        setError(null);

        try {
            const res = await fetch("/api/react/taxon/moveBeforeSibling", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taxonId: draggedId, siblingId: targetId }),
            });

            if (!res.ok) throw new Error(t("taxon.ordering.reorderFailed"));

            const json = await res.json();
            if (!json.success) throw new Error(json.message ?? t("taxon.ordering.reorderFailed"));

        } catch (e) {
            setChildren(original); // rollback
            setError((e as Error).message);
        } finally {
            setIsUpdating(false);
            setDraggedId(null);
        }
    }

    return (
        <Card>
            <Card.Header>
                {t("taxon.ordering.title")}
                {isUpdating && <Spinner size="sm" className="ms-2" animation="border" />}
            </Card.Header>

            <Card.Body>
                {children.map((c) => (
                    <div key={c.id} style={{ position: "relative" }}>
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
                            style={{ cursor: isUpdating ? "not-allowed" : "move" }}
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

                {error && <div className="text-danger mt-2">{error}</div>}
            </Card.Body>
        </Card>
    );
}
