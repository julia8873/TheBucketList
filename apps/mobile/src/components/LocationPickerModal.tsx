import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MapPin, X, Trash2 } from 'lucide-react-native';
import { fontFamily } from '@bucketlist/ui';
import { LocationAutocomplete } from './LocationAutocomplete';

interface LocationPickerModalProps {
  visible: boolean;
  value: string;
  onChangeLocation: (location: { text: string; lat: number; lng: number } | null) => void;
  onClose: () => void;
}

export function LocationPickerModal({
  visible,
  value,
  onChangeLocation,
  onClose,
}: LocationPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <MapPin color="#D4B13A" size={20} />
                <Text style={styles.title}>Ubicación</Text>
              </View>
              <Pressable hitSlop={10} onPress={onClose} style={styles.closeButton}>
                <X color="#999" size={20} />
              </Pressable>
            </View>

            {/* Autocomplete Input & Suggestions */}
            <LocationAutocomplete
              value={value}
              onChangeLocation={(loc) => {
                onChangeLocation(loc);
                onClose();
              }}
              label="Buscar ubicación"
              placeholder="Escribe una ciudad, país o lugar..."
            />

            {/* Remove Location Button */}
            {value ? (
              <Pressable
                style={styles.removeButton}
                onPress={() => {
                  onChangeLocation(null);
                  onClose();
                }}
              >
                <Trash2 color="#EF4444" size={16} />
                <Text style={styles.removeButtonText}>Quitar ubicación</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    minHeight: 330,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: fontFamily.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
});
