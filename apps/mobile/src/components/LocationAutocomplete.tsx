import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Input, Typography, Icon, useTheme, spacing, radii, shadows } from '@bucketlist/ui';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChangeLocation: (location: { text: string; lat: number; lng: number } | null) => void;
  onTextChange?: (text: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
}

// Simple in-memory cache
const searchCache: Record<string, LocationResult[]> = {};

export function LocationAutocomplete({
  value,
  onChangeLocation,
  onTextChange,
  error,
  label,
  placeholder,
}: LocationAutocompleteProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('location_picker.search_label');
  const resolvedPlaceholder = placeholder ?? t('location_picker.search_placeholder');
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync prop value when it changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchLocation = async (text: string) => {
    if (text.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchCache[text]) {
      setResults(searchCache[text] ?? []);
      setShowDropdown(true);
      return;
    }

    setLoading(true);
    setShowDropdown(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=8&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TheBucketListApp/1.0 (thebucketlist898@gmail.com)',
          },
        }
      );

      const rawData: any[] = await response.json();

      // Filtrar provincias duplicadas que comparten nombre con su ciudad capital
      // y limpiar los nombres para que sean legibles y únicos (ej: "Granada, Andalucía, España")
      const processed: LocationResult[] = [];
      const seenNames = new Set<string>();

      for (const item of rawData) {
        const addr = item.address || {};
        const cityName = addr.city || addr.town || addr.village || addr.municipality || item.name;
        const isProvinceOrCounty =
          item.addresstype === 'state_district' ||
          item.addresstype === 'county' ||
          item.addresstype === 'state';

        // Si es una provincia y existe la ciudad homónima, omitir el centroide provincial (que dista 50km)
        if (isProvinceOrCounty) {
          const norm = (item.name || '').toLowerCase().trim();
          const hasCityHomonym = rawData.some((d) => {
            const dAddr = d.address || {};
            const dCity = (dAddr.city || dAddr.town || dAddr.village || dAddr.municipality || d.name || '').toLowerCase().trim();
            const isCityType = d.addresstype === 'city' || d.addresstype === 'town' || d.addresstype === 'municipality' || d.type === 'city';
            return isCityType && dCity === norm;
          });
          if (hasCityHomonym) continue;
        }

        // Construir nombre limpio: "Ciudad, Comunidad/Región, País"
        const parts: string[] = [];
        if (cityName) parts.push(cityName);
        if (addr.state && addr.state !== cityName) parts.push(addr.state);
        if (addr.country && addr.country !== addr.state) parts.push(addr.country);
        const cleanName = parts.length > 0 ? parts.join(', ') : item.display_name;

        const dedupeKey = cleanName.toLowerCase();
        if (seenNames.has(dedupeKey)) continue;
        seenNames.add(dedupeKey);

        processed.push({
          place_id: item.place_id,
          display_name: cleanName,
          lat: item.lat,
          lon: item.lon,
        });

        if (processed.length >= 5) break;
      }

      searchCache[text] = processed;
      setResults(processed);
    } catch (err) {
      console.error('Failed to fetch location', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    onTextChange?.(text);
    if (!text) {
      onChangeLocation(null);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void searchLocation(text);
    }, 500); // 500ms debounce
  };

  const handleSelect = (item: LocationResult) => {
    setQuery(item.display_name);
    setShowDropdown(false);
    onChangeLocation({
      text: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    });
  };

  return (
    <View style={styles.container}>
      <Input
        label={resolvedLabel}
        placeholder={resolvedPlaceholder}
        value={query}
        onChangeText={handleChangeText}
        onSubmitEditing={() => {
          if (results[0]) {
            handleSelect(results[0]);
          }
        }}
        error={error}
        leftIcon={<Icon icon={MapPin} color={theme.colors.foregroundMuted} size={18} />}
        rightIcon={loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : undefined}
      />

      {showDropdown && results.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => handleSelect(item)}
              >
                <Icon icon={MapPin} size={16} color={theme.colors.foregroundMuted} />
                <Typography variant="body" style={styles.resultText} numberOfLines={2}>
                  {item.display_name}
                </Typography>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    top: 70, // Below the input
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: radii.md,
    ...shadows.md,
    overflow: 'hidden',
    zIndex: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[2],
  },
  resultText: {
    flex: 1,
  },
});
