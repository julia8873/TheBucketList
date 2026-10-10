import React, { useState } from 'react';
import { View } from 'react-native';
import { TagChip } from '@bucketlist/ui';
import { useItemTags, useSyncItemTags } from '../hooks/useTags';
import { TagAssignSheet, type TagItem } from './TagAssignSheet';

interface ItemTagsRowProps {
    bucketId: string;
    isOwner: boolean;
}

/**
 * Etiquetas de una tarea (tablas tags / item_tags) en el detalle.
 * El dueño puede tocar cualquier chip para abrir el menú flotante y editarlas.
 */
export function ItemTagsRow({ bucketId, isOwner }: ItemTagsRowProps) {
    const [open, setOpen] = useState(false);
    const { data: itemTags } = useItemTags(bucketId);
    const syncTags = useSyncItemTags();

    const tags: TagItem[] = (itemTags ?? [])
        .map((it: any) => it.tag)
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji ?? null }));

    if (tags.length === 0 && !isOwner) return null;

    const handleChange = (selected: TagItem[]) => {
        syncTags.mutate({ bucketId, selectedTagIds: selected.map((t) => t.id) });
    };

    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 8 }}>
            {tags.map((t) => (
                <TagChip
                    key={t.id}
                    label={t.name}
                    variant="colored"
                    color={t.color}
                    emoji={t.emoji}
                    onPress={isOwner ? () => setOpen(true) : undefined}
                />
            ))}

            {isOwner && (
                <TagChip
                    label={tags.length === 0 ? '+ Añadir etiquetas' : '+ Editar'}
                    variant="create"
                    onPress={() => setOpen(true)}
                />
            )}

            {isOwner && (
                <TagAssignSheet
                    visible={open}
                    selectedTags={tags}
                    onChange={handleChange}
                    onClose={() => setOpen(false)}
                />
            )}
        </View>
    );
}