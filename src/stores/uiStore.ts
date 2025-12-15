import { create } from 'zustand';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface UIState {
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    buttons: AlertButton[];
  };
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
}

// Note: It must be 'export const', NOT 'export default'
export const useUIStore = create<UIState>((set) => ({
  alertConfig: { 
    visible: false, 
    title: '', 
    message: '', 
    buttons: [] 
  },
  showAlert: (title, message, buttons = [{ text: 'OK' }]) =>
    set({ alertConfig: { visible: true, title, message, buttons } }),
  hideAlert: () =>
    set((state) => ({ alertConfig: { ...state.alertConfig, visible: false } })),
}));