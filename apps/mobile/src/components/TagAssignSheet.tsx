import React, { useEffect, useState } from 'react';
import { TagFilterSheet } from './TagFilterSheet';
import { TagEditSheet } from './TagEditSheet';
import { useTags } from '../hooks/useTags';

export interface TagItem {
    id: string;
    name: string;
    color: string;
    emoji?: string | null;
}

interface TagAssignSheetProps {
    visible: boolean;
    /** Etiquetas que tiene la tarea ahora mismo. */
    selectedTags: TagItem[];
    /** Se llama al cerrar, solo si la selección ha cambiado. */
    onChange: (tags: TagItem[]) => void;
    onClose: () => void;
}

/**
 * Menú para asignar / editar las etiquetas de una tarea.
 * Es el mismo menú que el filtro de «Mi lista» (TagFilterSheet), en modo `assign`:
 * se trabaja sobre un borrador y se confirma al cerrar la hoja.
 */
export function TagAssignSheet({ visible, selectedTags, onChange, onClose }: TagAssignSheetProps) {
    const { data: tags = [] } = useTags();
    const [draftIds, setDraftIds] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (visible) {
            setDraftIds(selectedTags.map((t) => t.id));
            setCreating(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const commit = () => {
        const initial = selectedTags.map((t) => t.id);
        const unchanged =
            initial.length === draftIds.length && initial.every((id) => draftIds.includes(id));

        if (!unchanged) {
            // Los datos más recientes de useTags tienen prioridad (emoji/color actualizados).
            const byId = new Map<string, TagItem>();
            selectedTags.forEach((t) => byId.set(t.id, t));
            tags.forEach((t) => byId.set(t.id, { id: t.id, name: t.name, color: t.color, emoji: t.emoji ?? null }));
            onChange(draftIds.map((id) => byId.get(id)).filter(Boolean) as TagItem[]);
        }
        onClose();
    };

    const n = draftIds.length;

    return (
        <TagFilterSheet
            mode="assign"
            visible={visible}
            selectedIds={draftIds}
            onChange={setDraftIds}
            onClose={commit}
            ctaLabel={n === 0 ? 'Guardar sin etiquetas' : `Guardar ${n} ${n === 1 ? 'etiqueta' : 'etiquetas'}`}
            onCreate={() => setCreating(true)}
            overlay={
                <TagEditSheet
                    visible={creating}
                    tag={null}
                    onClose={() => setCreating(false)}
                    onSaved={(created) => setDraftIds((ids) => (ids.includes(created.id) ? ids : [...ids, created.id]))}
                />
            }
        />
    );
}