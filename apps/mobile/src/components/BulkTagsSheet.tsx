import React, { useEffect, useState } from 'react';
import { useTranslation } from '@bucketlist/shared';
import { TagFilterSheet } from './TagFilterSheet';
import { TagEditSheet } from './TagEditSheet';

interface BulkTagsSheetProps {
  visible: boolean;
  itemType: 'task' | 'album';
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  /** Se pulsa el botón principal (hay que pedir confirmación y aplicar). */
  onApply: () => void;
  onClose: () => void;
}

/**
 * Selector de etiquetas para la selección múltiple de tareas / álbumes.
 * Es el mismo panel que se usa para asignar etiquetas a una sola tarea
 * (TagFilterSheet en modo `assign`), pero el botón aplica a toda la selección.
 */
export function BulkTagsSheet({ visible, itemType, selectedTagIds, onChange, onApply, onClose }: BulkTagsSheetProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) setCreating(false);
  }, [visible]);

  return (
    <TagFilterSheet
      mode="assign"
      itemType={itemType}
      visible={visible}
      selectedIds={selectedTagIds}
      onChange={onChange}
      onClose={onClose}
      onConfirm={onApply}
      ctaDisabled={selectedTagIds.length === 0}
      ctaLabel={t('bulk_actions.assign_tags_btn', { count: selectedTagIds.length })}
      onCreate={() => setCreating(true)}
      overlay={
        <TagEditSheet
          visible={creating}
          tag={null}
          onClose={() => setCreating(false)}
          onSaved={(created) => onChange(selectedTagIds.includes(created.id) ? selectedTagIds : [...selectedTagIds, created.id])}
        />
      }
    />
  );
}
