import { useVouroStore } from '../store';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, dismissToast } = useVouroStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        let borderColor = 'border-vouro-ground';
        let Icon = Info;
        let iconColor = 'text-vouro-cyan';

        if (toast.type === 'success') {
          borderColor = 'border-vouro-lime/50';
          Icon = CheckCircle;
          iconColor = 'text-vouro-lime';
        } else if (toast.type === 'error') {
          borderColor = 'border-vouro-red/50';
          Icon = AlertCircle;
          iconColor = 'text-vouro-red';
        } else if (toast.type === 'warning') {
          borderColor = 'border-vouro-orange/50';
          Icon = AlertTriangle;
          iconColor = 'text-vouro-orange';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 border bg-vouro-surface/95 backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 animate-slide-in-right ${borderColor}`}
          >
            <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs font-mono font-medium leading-relaxed text-vouro-text">
              {toast.message}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-vouro-muted hover:text-vouro-text transition"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
