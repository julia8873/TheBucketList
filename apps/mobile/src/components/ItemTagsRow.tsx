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
}

/**
 * Etiquetas de una tarea (tablas tags / item_tags) en el detalle.
 * Mismo diseño que las etiquetas del detalle de álbum: chips con color y
 * botón discontinuo "Añadir etiqueta" / "Etiquetas" para editarlas.
 */
export function ItemTagsRow({ bucketId, isOwner }: ItemTagsRowProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
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
                            if (isOwner) setOpen(true);
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

                {isOwner && (
                    <Pressable
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.surfaceSunken,
                        }}
                        onPress={() => setOpen(true)}
                        accessibilityRole="button"
                        accessibilityLabel={t('tags.tags_label', { defaultValue: 'Etiquetas' })}
                    >
                        <Plus size={14} color="#8F8F8F" strokeWidth={2} />
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#8F8F8F' }}>
                            {tags.length === 0
                                ? t('tags.add_tag', { defaultValue: 'Añadir etiqueta' })
                                : t('tags.tags_label', { defaultValue: 'Etiquetas' })}
                        </Text>
                    </Pressable>
                )}
            </View>

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
