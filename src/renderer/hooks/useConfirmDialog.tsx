// Custom hook for managing confirmation dialogs locally (no Redux)

import { useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<ConfirmOptions | null>(null);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setDialogState(options);
  }, []);

  const hideConfirm = useCallback(() => {
    setDialogState(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (dialogState?.onConfirm) {
      await dialogState.onConfirm();
    }
    hideConfirm();
  }, [dialogState, hideConfirm]);

  const handleCancel = useCallback(() => {
    if (dialogState?.onCancel) {
      dialogState.onCancel();
    }
    hideConfirm();
  }, [dialogState, hideConfirm]);

  const ConfirmDialogComponent = useCallback(() => {
    if (!dialogState) return null;

    return (
      <ConfirmDialog
        isOpen={true}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }, [dialogState, handleConfirm, handleCancel]);

  return {
    showConfirm,
    hideConfirm,
    ConfirmDialog: ConfirmDialogComponent,
  };
}
