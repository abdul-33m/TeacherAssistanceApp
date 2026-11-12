import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white shadow-xl border border-amber-400/30 animate-pulse">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Full local access active</span>
    </div>
  );
};
