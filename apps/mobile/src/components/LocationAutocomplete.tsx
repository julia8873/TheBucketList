import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Input, Typography, Icon, useTheme, spacing, radii, shadows, gold } from '@bucketlist/ui';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';

export interface LocationResult {
  place_id: number;
  title: string;
  subtitle: string;
  display_name: string;
  lat: string;
  lon: string;
  isExactSite?: boolean;
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

/**
 * Parsea y formatea los resultados de Nominatim OSM al estilo Google Maps:
 * - Sitios exactos (castillos, museos, playas, restaurantes, parques, etc.) con sus coordenadas exactas
 * - Deduplicación inteligente para evitar duplicados o homónimos idénticos (ej: 2 veces Alicante)
 * - Diferenciación explícita de provincias frente a ciudades homónimas
 */
export function parseNominatimResults(rawData: any[], lang: string = 'es'): LocationResult[] {
  const isEn = lang.startsWith('en');
  const processed: LocationResult[] = [];
  const seenKeys = new Set<string>();

  for (const item of rawData) {
    if (!item || !item.lat || !item.lon) continue;

    const addr = item.address || {};
    const addresstype = (item.addresstype || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const itemClass = (item.class || '').toLowerCase();
    const rawName = (item.name || '').trim();

    const isCountry = addresstype === 'country' || type === 'country';
    const isProvinceOrRegion =
      addresstype === 'province' ||
      addresstype === 'state' ||
      addresstype === 'state_district' ||
      addresstype === 'county' ||
      (itemClass === 'boundary' && type === 'administrative' && !addr.city && !addr.town && !addr.village);

    const isCity =
      addresstype === 'city' ||
      addresstype === 'town' ||
      addresstype === 'village' ||
      addresstype === 'municipality' ||
      type === 'city' ||
      type === 'town' ||
      type === 'village' ||
      type === 'municipality';

    // Localidad / Ciudad base
    const cityName =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      (isCity ? rawName : undefined);

    let title = '';
    let subtitle = '';
    let displayName = '';
    let isExact = false;

    if (isCountry) {
      title = rawName || addr.country || '';
      subtitle = isEn ? 'Country' : 'País';
      displayName = title;
    } else if (isProvinceOrRegion) {
      const provinceName = rawName || addr.province || addr.state || '';
      // Diferenciar claramente la provincia para evitar homónimos idénticos a la ciudad
      title = isEn ? `${provinceName} Province` : `Provincia de ${provinceName}`;
      const subParts: string[] = [];
      if (addr.state && addr.state !== provinceName) subParts.push(addr.state);
      if (addr.country) subParts.push(addr.country);
      subtitle = subParts.join(', ');
      displayName = `${title}${subtitle ? ', ' + subtitle : ''}`;
    } else if (isCity) {
      title = cityName || rawName;
      const subParts: string[] = [];
      if (addr.province && addr.province !== title) subParts.push(addr.province);
      else if (addr.state && addr.state !== title) subParts.push(addr.state);
      if (addr.country) subParts.push(addr.country);
      subtitle = subParts.join(', ');
      displayName = `${title}${subtitle ? ', ' + subtitle : ''}`;
    } else {
      // Sitio exacto (monumento, castillo, playa, parque, restaurante, calle, museo...)
      isExact = true;
      title =
        rawName ||
        addr.tourism ||
        addr.historic ||
        addr.amenity ||
        addr.leisure ||
        (item.display_name ? item.display_name.split(',')[0].trim() : '');
      const subParts: string[] = [];
      if (cityName && cityName !== title) subParts.push(cityName);
      if (addr.state && addr.state !== title && addr.state !== cityName) subParts.push(addr.state);
      if (addr.country && addr.country !== title) subParts.push(addr.country);
      subtitle = subParts.join(', ');

      const saveParts: string[] = [title];
      if (cityName && cityName !== title) saveParts.push(cityName);
      if (addr.country) saveParts.push(addr.country);
      displayName = saveParts.join(', ');
    }

    if (!title) continue;

    // Deduplicación inteligente: evitar dos resultados con mismo título y subtítulo
    const dedupeKey = `${title}::${subtitle}`.toLowerCase().trim();
    if (seenKeys.has(dedupeKey)) continue;

    // Si ya existe la ciudad, no añadir una provincia idéntica que cause confusión
    const simpleTitleKey = title.toLowerCase().trim();
    if (seenKeys.has(simpleTitleKey)) continue;

    seenKeys.add(dedupeKey);
    if (!isProvinceOrRegion) {
      seenKeys.add(simpleTitleKey);
    }

    processed.push({
      place_id: item.place_id,
      title,
      subtitle,
      display_name: displayName,
      lat: item.lat,
      lon: item.lon,
      isExactSite: isExact,
    });

    if (processed.length >= 6) break;
  }

  return processed;
}

export function LocationAutocomplete({
  value,
  onChangeLocation,
  onTextChange,
  error,
  label,
  placeholder,
}: LocationAutocompleteProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
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

    const lang = i18n.language?.startsWith('en') ? 'en,es;q=0.8' : 'es,en;q=0.8';
    const cacheKey = `${lang}:${text.trim().toLowerCase()}`;

    if (searchCache[cacheKey]) {
      setResults(searchCache[cacheKey] ?? []);
      setShowDropdown(true);
      return;
    }

    setLoading(true);
    setShowDropdown(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=8&addressdetails=1&accept-language=${encodeURIComponent(lang)}`,
        {
          headers: {
            'User-Agent': 'TheBucketListApp/1.0 (thebucketlist898@gmail.com)',
            'Accept-Language': lang,
          },
        }
      );

      const rawData: any[] = await response.json();
      const processed = parseNominatimResults(rawData, lang);

      searchCache[cacheKey] = processed;
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
                <View style={[styles.iconWrap, { backgroundColor: theme.dark ? '#252932' : '#F4F0E4' }]}>
                  <Icon icon={MapPin} size={16} color={gold[400] || theme.colors.primary} />
                </View>
                <View style={styles.textWrap}>
                  <Typography variant="body" style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Typography>
                  {item.subtitle ? (
                    <Typography
                      variant="caption"
                      style={styles.resultSubtitle}
                      color={theme.colors.foregroundMuted}
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Typography>
                  ) : null}
                </View>
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
    maxHeight: 220,
    borderWidth: 1,
    borderRadius: radii.md,
    ...shadows.md,
    overflow: 'hidden',
    zIndex: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[2.5],
  },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
      justifyContent: 'center',
    },
    resultTitle: {
      fontWeight: '600',
      fontSize: 14,
      lineHeight: 18,
    },
    resultSubtitle: {
      fontSize: 12,
      lineHeight: 15,
      marginTop: 2,
    },
  });
