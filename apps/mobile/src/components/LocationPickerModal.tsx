import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MapPin, X, Trash2, Check } from 'lucide-react-native';
import { fontFamily } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { LocationAutocomplete, parseNominatimResults } from './LocationAutocomplete';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

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
  const { t: tr, i18n } = useTranslation();
  const [typedText, setTypedText] = useState(value);
  const [selectedLoc, setSelectedLoc] = useState<{ text: string; lat: number; lng: number } | null>(null);
  const [loadingGeocode, setLoadingGeocode] = useState(false);

  useEffect(() => {
    setTypedText(value);
    setSelectedLoc(null);
  }, [value, visible]);

  const handleConfirm = async () => {
    if (selectedLoc) {
      onChangeLocation(selectedLoc);
      onClose();
      return;
    }

    if (!typedText.trim()) {
      onChangeLocation(null);
      onClose();
      return;
    }

    setLoadingGeocode(true);
    try {
      const lang = i18n.language?.startsWith('en') ? 'en' : 'es';

      // 1. Si existe clave de Google, intentar geocodificar directamente con Google
      if (GOOGLE_PLACES_API_KEY) {
        try {
          const gRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(typedText.trim())}&key=${GOOGLE_PLACES_API_KEY}&language=${lang}`
          );
          const gData = await gRes.json();
          if (gData.status === 'OK' && Array.isArray(gData.results) && gData.results.length > 0) {
            const first = gData.results[0];
            if (first?.geometry?.location) {
              onChangeLocation({
                text: first.formatted_address || typedText.trim(),
                lat: first.geometry.location.lat,
                lng: first.geometry.location.lng,
              });
              onClose();
              return;
            }
          }
        } catch (e) {
          console.warn('Google geocoding fallback to Nominatim:', e);
        }
      }

      // 2. Fallback resiliente a OpenStreetMap (Nominatim)
      const langHeader = lang === 'en' ? 'en,es;q=0.8' : 'es,en;q=0.8';
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(typedText.trim())}&limit=6&addressdetails=1&accept-language=${encodeURIComponent(langHeader)}`,
        {
          headers: {
            'User-Agent': 'TheBucketListApp/1.0 (thebucketlist898@gmail.com)',
            'Accept-Language': langHeader,
          },
        }
      );
      const items: any[] = await res.json();
      const processed = parseNominatimResults(items, lang);
      if (processed && processed.length > 0) {
        const target = processed[0];
        if (target) {
          onChangeLocation({
            text: target.display_name,
            lat: parseFloat(target.lat),
            lng: parseFloat(target.lon),
          });
        } else {
          onChangeLocation({
            text: typedText.trim(),
            lat: 40.4168,
            lng: -3.7038,
          });
        }
      } else {
        onChangeLocation({
          text: typedText.trim(),
          lat: 40.4168,
          lng: -3.7038,
        });
      }
    } catch {
      onChangeLocation({
        text: typedText.trim(),
        lat: 40.4168,
        lng: -3.7038,
      });
    } finally {
      setLoadingGeocode(false);
      onClose();
    }
    };

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
                  <Text style={styles.title}>{tr('location_picker.title')}</Text>
                </View>
                <Pressable hitSlop={10} onPress={onClose} style={styles.closeButton}>
                  <X color="#999" size={20} />
                </Pressable>
              </View>

              {/* Autocomplete Input & Suggestions */}
              <LocationAutocomplete
                value={typedText}
                onTextChange={(t) => {
                  setTypedText(t);
                  setSelectedLoc(null);
                }}
                onChangeLocation={(loc) => {
                  if (loc) {
                    setSelectedLoc(loc);
                    onChangeLocation(loc);
                    onClose();
                  } else {
                    setSelectedLoc(null);
                  }
                }}
                label={tr('location_picker.search_label')}
                placeholder={tr('location_picker.search_placeholder')}
              />

              {/* Confirm Location Button */}
              {typedText.trim() ? (
                <Pressable
                  style={[styles.confirmButton, loadingGeocode && { opacity: 0.6 }]}
                  onPress={() => void handleConfirm()}
                  disabled={loadingGeocode}
                >
                  {loadingGeocode ? (
                    <ActivityIndicator size="small" color="#111" />
                  ) : (
                    <>
                      <Check size={16} color="#111" strokeWidth={2.5} />
                      <Text style={styles.confirmButtonText}>{tr('location_picker.save')}</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

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
                  <Text style={styles.removeButtonText}>{tr('location_picker.remove')}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  const styles = themedStyleSheet({
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
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#D4B13A',
    },
    confirmButtonText: {
      color: '#111',
      fontSize: 14,
      fontFamily: fontFamily.semibold,
    },
    removeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
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
