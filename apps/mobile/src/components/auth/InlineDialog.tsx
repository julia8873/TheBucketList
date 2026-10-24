import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { ConfirmDialog, type ConfirmAction } from '@bucketlist/ui';

export interface InlineDialogState {
  title: string;
  message?: string;
  actions: ConfirmAction[];
}

/**
 * Diálogo dibujado DENTRO de la pantalla (no en una ventana nativa aparte).
 *
 * Tras volver del navegador de Google, Android puede medir a 0 px una ventana `Modal` recién
 * creada y el diálogo aparece arriba a la izquierda, sin caja ni fondo. Aquí el diálogo vive en
 * la misma jerarquía que la pantalla (que ya está maquetada), así que ese fallo no puede ocurrir.
 *
 * Se coloca como hermano de <AuthScreen /> en la pantalla: `<> <AuthScreen/> <InlineDialog/> </>`.
 */
export function InlineDialog({
  dialog,
  onClose,
}: {
  dialog: InlineDialogState | null;
  onClose: () => void;
}) {
  const handleCancel = useCallback(() => {
    dialog?.actions.find((a) => a.style === 'cancel')?.onPress?.();
    onClose();
  }, [dialog, onClose]);

  const handleAction = useCallback(
    (action: ConfirmAction) => {
      onClose();
      action.onPress?.();
    },
    [onClose],
  );

  if (!dialog) return null;

  return (
    <View style={styles.host} collapsable={false} pointerEvents="auto">
      <ConfirmDialog
        visible
        inline
        title={dialog.title}
        message={dialog.message}
        actions={dialog.actions}
        tone="default"
        onConfirm={handleCancel}
        onCancel={handleCancel}
        onAction={handleAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
  },
});
