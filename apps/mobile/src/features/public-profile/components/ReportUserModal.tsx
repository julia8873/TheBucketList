import React from 'react';
import { ReportModal } from '../../../components/ReportModal';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  onSubmit: (reason: string, details?: string) => Promise<void>;
  isLoading?: boolean;
}

/** Reporte de usuario: usa el modal genérico de reportes (mismo diseño para tareas, álbumes y comentarios). */
export function ReportUserModal({ visible, onClose, username, onSubmit, isLoading }: ReportUserModalProps) {
  return (
    <ReportModal
      visible={visible}
      onClose={onClose}
      kind="user"
      subject={`@${username}`}
      onSubmit={onSubmit}
      isLoading={isLoading}
    />
  );
}
