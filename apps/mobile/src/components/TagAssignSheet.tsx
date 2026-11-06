import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@bucketlist/shared';
import { TagFilterSheet } from './TagFilterSheet';
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
    /** Permite sobrescribir la acción de gestionar etiquetas si es necesario. */
    onManage?: () => void;
}

/**
 * Menú para asignar / editar las etiquetas de una tarea o álbum.
 * Es el mismo menú que el filtro de «Mi lista» (TagFilterSheet), en modo `assign`:
 * se trabaja sobre un borrador y se confirma al cerrar la hoja.
 * Incluye acceso directo a «Gestionar etiquetas» (/tags) para crear, editar o eliminar etiquetas.
 */
export function TagAssignSheet({ visible, selectedTags, onChange, onClose, onManage }: TagAssignSheetProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const { data: tags = [] } = useTags();
    const [draftIds, setDraftIds] = useState<string[]>([]);

    useEffect(() => {
        if (visible) {
            setDraftIds(selectedTags.map((t) => t.id));
        }
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

    const handleManage = () => {
        commit();
        if (onManage) {
            onManage();
        } else {
            router.push('/tags' as any);
        }
    };

    const n = draftIds.length;

    return (
        <TagFilterSheet
            mode="assign"
            visible={visible}
            selectedIds={draftIds}
            onChange={setDraftIds}
            onClose={commit}
            onManage={handleManage}
            ctaLabel={n === 0 ? t('tags.save_without_tags') : n === 1 ? t('tags.save_count_single') : t('tags.save_count_plural', { count: n })}
        />
    );
}