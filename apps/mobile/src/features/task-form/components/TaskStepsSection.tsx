import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { styles } from '../styles/task-form.styles';

export interface TaskStepItem {
  id: string;
  title: string;
}

interface TaskStepsSectionProps {
  steps: TaskStepItem[];
  onAddStep: () => void;
  onUpdateStep: (id: string, text: string) => void;
  onRemoveStep: (id: string) => void;
}

export function TaskStepsSection({
  steps,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
}: TaskStepsSectionProps) {
  return (
    <View style={styles.stepsContainer}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepRow}>
          <View style={styles.stepCircle} />
          <TextInput
            style={styles.stepInput}
            value={step.title}
            onChangeText={(txt) => onUpdateStep(step.id, txt)}
            placeholder="Escribe un paso..."
            placeholderTextColor="#6B6B6B"
            autoFocus={index === steps.length - 1}
          />
          <Pressable onPress={() => onRemoveStep(step.id)} hitSlop={10}>
            <X color="#555" size={20} />
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.addStepRow} onPress={onAddStep}>
        <Plus color="#D4B13A" size={24} />
        <Text style={styles.addStepText}>Añadir paso</Text>
      </Pressable>
    </View>
  );
}
