import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Input, Typography, Icon, useTheme, spacing, radii, shadows } from '@bucketlist/ui';
import { MapPin } from 'lucide-react-native';

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChangeLocation: (location: { text: string; lat: number; lng: number } | null) => void;
  error?: string;
}

// Simple in-memory cache
const searchCache: Record<string, LocationResult[]> = {};

export function LocationAutocomplete({ value, onChangeLocation, error }: LocationAutocompleteProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`,
        {
          headers: {
            'User-Agent': 'TheBucketListApp/1.0 (contact@thebucketlist.com)',
          },
        }
      );
      
      const data: LocationResult[] = await response.json();
      searchCache[text] = data;
      setResults(data);
    } catch (err) {
      console.error('Failed to fetch location', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
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
        label="Location"
        placeholder="Search for a city or place..."
        value={query}
        onChangeText={handleChangeText}
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
