import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_FAST } from '../lib/animations';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setState({ isOpen: true, title, message, onConfirm });
  };

  const close = () => setState(prev => ({ ...prev, isOpen: false }));

  return { confirmState: state, confirmAction, closeConfirm: close };
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 14 }}
            transition={SPRING_FAST}
            className="glass-panel-elevated rounded-[2rem] w-full max-w-sm overflow-hidden p-6 sm:p-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-500 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">{title}</h3>
            <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-2.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onCancel}
                className="glass-button-secondary flex-1 rounded-2xl text-slate-700 text-xs font-bold py-3 cursor-pointer"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { onConfirm(); onCancel(); }}
                className="flex-1 rounded-2xl bg-rose-500 text-white text-xs font-bold py-3 hover:bg-rose-600 shadow-[0_4px_14px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
              >
                Eliminar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
