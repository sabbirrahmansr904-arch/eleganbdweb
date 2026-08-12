import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { onQuotaStateChange } from '../lib/firestoreUtils';

export const FirestoreQuotaBanner: React.FC = () => {
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = onQuotaStateChange((exceeded) => {
      setQuotaExceeded(exceeded);
    });
    return () => unsub();
  }, []);

  if (!quotaExceeded || dismissed) return null;

  const consoleUrl = "https://console.firebase.google.com/project/gen-lang-client-0389432141/firestore/databases/ai-studio-40974cd6-81b0-49ba-934b-04a01e56b0b2/data?openUpgradeDialog=true";

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
        <p className="truncate">
          <span className="font-semibold">Firestore Quota Exceeded:</span> Free daily read units limit reached. App is operating smoothly using cached local data.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded font-medium text-xs transition-colors shadow-sm"
        >
          <span>Upgrade Quota</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-500/20 rounded text-amber-700 dark:text-amber-300 transition-colors"
          title="Dismiss warning"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
