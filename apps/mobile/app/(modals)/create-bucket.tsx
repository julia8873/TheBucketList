import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Typography, Button, Input, spacing, useTheme, Icon } from '@bucketlist/ui';
import { createBucketSchema, type CreateBucketForm } from '@bucketlist/shared';
import { useCreateBucket } from '../../src/hooks/useBuckets';
import { supabase } from '../../src/services/supabase';
import { LocationAutocomplete } from '../../src/components/LocationAutocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';

// A simple Category Picker (in a real app, you'd fetch from DB and use a BottomSheet)
const CATEGORIES = [
  { id: 'uuid-1', label: 'Travel', icon: 'Plane' },
  { id: 'uuid-2', label: 'Food', icon: 'Coffee' },
  { id: 'uuid-3', label: 'Sport', icon: 'Activity' },
  { id: 'uuid-4', label: 'Creative', icon: 'Edit3' },
  { id: 'uuid-5', label: 'Social', icon: 'Users' },
  { id: 'uuid-6', label: 'Other', icon: 'Star' },
];

export default function CreateBucketModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const createBucket = useCreateBucket();
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch real categories from DB
  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<CreateBucketForm>({
    resolver: zodResolver(createBucketSchema),
    defaultValues: {
      title: '',
      description: '',
      visibility: 'public',
      subtasks: [],
    }
  });

  const onSubmit = (data: CreateBucketForm) => {
    createBucket.mutate(data, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        console.error('Failed to create bucket:', error);
      }
    });
  };

  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Button variant="ghost" onPress={() => router.back()}>Cancel</Button>
        <Typography variant="h3">New Goal</Typography>
        <Button 
          variant="primary" 
          onPress={() => void handleSubmit(onSubmit)()}
          loading={createBucket.isPending} 
        >
          Create
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Input
                label="What do you want to achieve?"
                placeholder="e.g., Run a marathon"
                value={value}
                onChangeText={onChange}
                error={errors.title?.message}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Input
                label="Description (Optional)"
                placeholder="Add more details..."
                value={value || ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                error={errors.description?.message}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="category_id"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Typography variant="body" style={styles.label}>Category</Typography>
              <View style={styles.categories}>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={value === cat.id ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => onChange(cat.id)}
                    style={{ marginBottom: spacing[2], marginRight: spacing[2] }}
                  >
                    {cat.name_en}
                  </Button>
                ))}
              </View>
              {errors.category_id && <Typography variant="caption" color="error">{errors.category_id.message}</Typography>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="visibility"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Typography variant="body" style={styles.label}>Visibility</Typography>
              <View style={styles.row}>
                {['public', 'followers', 'private'].map((vis) => (
                  <Button
                    key={vis}
                    variant={value === vis ? 'secondary' : 'ghost'}
                    size="sm"
                    onPress={() => onChange(vis)}
                  >
                    {vis.charAt(0).toUpperCase() + vis.slice(1)}
                  </Button>
                ))}
              </View>
            </View>
          )}
        />

        <Controller
          control={control}
          name="location_text"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.field, { zIndex: 10 }]}>
              <LocationAutocomplete
                value={value || ''}
                onChangeLocation={(loc) => {
                  onChange(loc?.text);
                  if (loc) {
                    setValue('location_lat', loc.lat);
                    setValue('location_lng', loc.lng);
                  } else {
                    setValue('location_lat', null);
                    setValue('location_lng', null);
                  }
                }}
              />
            </View>
          )}
        />
        
        <Controller
          control={control}
          name="deadline"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Typography variant="body" style={styles.label}>Deadline</Typography>
              <Button variant="secondary" onPress={() => setShowDatePicker(true)}>
                {value ? new Date(value).toLocaleDateString() : 'Set a deadline'}
              </Button>
              {showDatePicker && (
                <DateTimePicker
                  value={value ? new Date(value) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(_event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) onChange(date);
                  }}
                />
              )}
            </View>
          )}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  content: {
    padding: spacing[4],
    gap: spacing[6],
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[2],
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});
