import React from 'react';
import { View, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { MapPin, X, Trash2 } from 'lucide-react-native';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';

interface BucketLocationModalProps {
  visible: boolean;
  locationText?: string | null;
  theme: any;
  onClose: () => void;
  onSaveLocation: (loc: any) => Promise<void> | void;
  onRemoveLocation: () => Promise<void> | void;
}

export function BucketLocationModal({
  visible,
  locationText,
  theme,
  onClose,
  onSaveLocation,
  onRemoveLocation,
}: BucketLocationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={onClose}
        >
          <Pressable
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: '#161616',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: dark[400],
              padding: 20,
              minHeight: 320,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin color={gold[400]} size={20} />
                <Typography variant="h3" color={theme.colors.foreground}>Ubicación</Typography>
              </View>
              <Pressable hitSlop={10} onPress={onClose}>
                <X color={theme.colors.foregroundMuted} size={20} />
              </Pressable>
            </View>

            <LocationAutocomplete
              value={locationText || ''}
              onChangeLocation={async (loc) => {
                await onSaveLocation(loc);
                onClose();
              }}
            />

            {locationText ? (
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                }}
                onPress={async () => {
                  await onRemoveLocation();
                  onClose();
                }}
              >
                <Trash2 color={theme.colors.error} size={16} />
                <Typography variant="bodySemibold" color={theme.colors.error}>
                  Quitar ubicación
                </Typography>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
