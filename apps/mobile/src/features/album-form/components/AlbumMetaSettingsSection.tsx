import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flag, Eye, Users, Lock, Check } from 'lucide-react-native';
import { styles } from '../styles/album-form.styles';
import { SectionTitle } from './SectionTitle';
import type { AlbumPriority, AlbumVisibility } from '../types';

interface AlbumMetaSettingsSectionProps {
  priority: AlbumPriority;
  onChangePriority: (priority: AlbumPriority) => void;
  visibility: AlbumVisibility;
  onChangeVisibility: (visibility: AlbumVisibility) => void;
}

const PRIORITIES = [
  { id: 'low' as const, label: 'Baja', color: '#10B981', bgActive: 'rgba(16, 185, 129, 0.14)', borderActive: '#10B981' },
  { id: 'medium' as const, label: 'Media', color: '#D4B13A', bgActive: 'rgba(212, 177, 58, 0.14)', borderActive: '#D4B13A' },
  { id: 'high' as const, label: 'Alta', color: '#EF4444', bgActive: 'rgba(239, 68, 68, 0.14)', borderActive: '#EF4444' },
];

export function AlbumMetaSettingsSection({
  priority,
  onChangePriority,
  visibility,
  onChangeVisibility,
}: AlbumMetaSettingsSectionProps) {
  return (
    <>
      {/* Sección Prioridad */}
      <View style={styles.section}>
        <SectionTitle highlight="PRIORIDAD" rest=" DEL ÁLBUM" />
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const active = priority === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => onChangePriority(p.id)}
                style={[
                  styles.priorityPill,
                  active && { backgroundColor: p.bgActive, borderColor: p.borderActive },
                ]}
              >
                <Flag size={15} color={active ? p.color : '#8A8A8A'} strokeWidth={active ? 2.2 : 1.8} />
                <Text style={[styles.priorityText, active && { color: p.color, fontWeight: '700' }]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sección Visibilidad */}
      <View style={styles.section}>
        <SectionTitle highlight="VISIBILIDAD" rest=" DEL ÁLBUM" />
        <View style={styles.visibilityContainer}>
          <Pressable
            style={[
              styles.visibilityOption,
              visibility === 'public' && styles.visibilityOptionActive,
            ]}
            onPress={() => onChangeVisibility('public')}
          >
            <View style={[styles.visibilityIconBox, visibility === 'public' && styles.visibilityIconBoxActive]}>
              <Eye color={visibility === 'public' ? '#D4B13A' : '#8F8F8F'} size={20} strokeWidth={2} />
            </View>
            <View style={styles.visibilityTexts}>
              <Text style={[styles.visibilityTitle, visibility === 'public' && styles.visibilityTitleActive]}>
                Público
              </Text>
              <Text style={styles.visibilitySubtitle}>Visible para toda la comunidad</Text>
            </View>
            {visibility === 'public' && <Check color="#D4B13A" size={18} strokeWidth={2.5} />}
          </Pressable>

          <Pressable
            style={[
              styles.visibilityOption,
              visibility === 'followers' && styles.visibilityOptionActive,
            ]}
            onPress={() => onChangeVisibility('followers')}
          >
            <View style={[styles.visibilityIconBox, visibility === 'followers' && styles.visibilityIconBoxActive]}>
              <Users color={visibility === 'followers' ? '#D4B13A' : '#8F8F8F'} size={20} strokeWidth={2} />
            </View>
            <View style={styles.visibilityTexts}>
              <Text style={[styles.visibilityTitle, visibility === 'followers' && styles.visibilityTitleActive]}>
                Seguidores
              </Text>
              <Text style={styles.visibilitySubtitle}>Visible solo para tus seguidores</Text>
            </View>
            {visibility === 'followers' && <Check color="#D4B13A" size={18} strokeWidth={2.5} />}
          </Pressable>

          <Pressable
            style={[
              styles.visibilityOption,
              visibility === 'private' && styles.visibilityOptionActive,
            ]}
            onPress={() => onChangeVisibility('private')}
          >
            <View style={[styles.visibilityIconBox, visibility === 'private' && styles.visibilityIconBoxActive]}>
              <Lock color={visibility === 'private' ? '#D4B13A' : '#8F8F8F'} size={20} strokeWidth={2} />
            </View>
            <View style={styles.visibilityTexts}>
              <Text style={[styles.visibilityTitle, visibility === 'private' && styles.visibilityTitleActive]}>
                Privado
              </Text>
              <Text style={styles.visibilitySubtitle}>Solo tú y los colaboradores que invites</Text>
            </View>
            {visibility === 'private' && <Check color="#D4B13A" size={18} strokeWidth={2.5} />}
          </Pressable>
        </View>
      </View>
    </>
  );
}
