import { create } from 'zustand';

interface ToastState {
  toast: { message: string } | null;
  showToast(message: string): void;
  clearToast(): void;
}

export const useToastStore = create<ToastState>(set => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearToast = () => { clearTimeout(timer); set({ toast: null }); };
  return {
    toast: null,
    showToast: message => {
      clearTimeout(timer);
      set({ toast: { message } });
      timer = setTimeout(clearToast, 5000);
    },
    clearToast,
  };
});
