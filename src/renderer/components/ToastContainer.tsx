// ToastContainer - manages and displays all active toast notifications

import { useAppSelector, useAppDispatch } from '../state/hooks';
import { removeToast } from '../state/slices/uiSlice';
import Toast from './Toast';

export default function ToastContainer() {
  const toasts = useAppSelector((state) => state.ui.toasts);
  const dispatch = useAppDispatch();

  const handleDismiss = (id: string) => {
    dispatch(removeToast(id));
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto animate-slide-in-right">
          <Toast toast={toast} onDismiss={handleDismiss} />
        </div>
      ))}
    </div>
  );
}
