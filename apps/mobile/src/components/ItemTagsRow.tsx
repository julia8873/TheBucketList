import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { hexToRgba } from '@/constants/tagPresets';
import { useItemTags, useSyncItemTags } from '../hooks/useTags';
import { TagAssignSheet, type TagItem } from './TagAssignSheet';

interface ItemTagsRowProps {
    bucketId: string;
    isOwner: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

/**
 * Etiquetas de una tarea (tablas tags / item_tags) en el detalle.
 * Mismo diseño que las etiquetas del detalle de álbum: chips con color.
 * Las etiquetas se gestionan pulsando sobre cualquiera de ellas o desde el menú
 * de opciones de la tarea ("Gestionar etiquetas").
 */
export function ItemTagsRow({ bucketId, isOwner, open: externalOpen, onOpenChange }: ItemTagsRowProps) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = (next: boolean) => {
        if (onOpenChange) onOpenChange(next);
        else setInternalOpen(next);
    };

    const { data: itemTags } = useItemTags(bucketId);
    const syncTags = useSyncItemTags();

    const tags: TagItem[] = (itemTags ?? [])
        .map((it: any) => it.tag)
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji ?? null }));

    const handleChange = (selected: TagItem[]) => {
        syncTags.mutate({ bucketId, selectedTagIds: selected.map((t) => t.id) });
    };

    return (
        <>
            {tags.length > 0 && (
                <View style={{ marginTop: 10, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        {tags.map((tItem) => (
                            <Pressable
                                key={tItem.id}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    paddingHorizontal: 11,
                                    paddingVertical: 5,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: tItem.color || '#D4B13A',
                                    backgroundColor: hexToRgba(tItem.color || '#D4B13A', 0.15),
                                }}
                                onPress={() => {
                                    if (isOwner) setIsOpen(true);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={t('album_detail.tag_a11y', {
                                    name: tItem.name,
                                    defaultValue: `Etiqueta ${tItem.name}`,
                                })}
                            >
                                {tItem.emoji ? <Text style={{ fontSize: 13 }}>{tItem.emoji}</Text> : null}
                                <Text
                                    style={{
                                        fontFamily: 'Inter_600SemiBold',
                                        fontSize: 13,
                                        color: tItem.color || '#D4B13A',
                                    }}
                                >
                                    {tItem.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            )}

            {isOwner && (
                <TagAssignSheet
                    visible={isOpen}
                    selectedTags={tags}
                    onChange={handleChange}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
