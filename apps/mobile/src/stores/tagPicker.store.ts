import { create } from 'zustand';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagPickerState {
  selectedTags: Tag[];
  setSelectedTags: (tags: Tag[]) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useTagPickerStore = create<TagPickerState>((set) => ({
  selectedTags: [],
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
