import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlayerNames } from '../types/game';

interface SettingsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly currentNames: PlayerNames;
  readonly winScore: number;
  readonly onSave: (names: PlayerNames, winScore: number) => void;
}

/** Safely sanitize player name input — strip control chars, limit length */
function sanitizeName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // strip control chars
    .slice(0, 24)
    .trim();
}

export function SettingsModal({
  open,
  onClose,
  currentNames,
  winScore,
  onSave,
}: SettingsModalProps) {
  const [names, setNames] = useState<PlayerNames>(currentNames);
  const [score, setScore] = useState(winScore);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync when modal opens
  useEffect(() => {
    if (open) {
      setNames(currentNames);
      setScore(winScore);
    }
  }, [open, currentNames, winScore]);

  // Focus trap using native <dialog>
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    onSave(names, score);
    onClose();
  }, [names, score, onSave, onClose]);

  const setName = useCallback(
    (field: keyof PlayerNames, raw: string) => {
      const safe = sanitizeName(raw);
      setNames((prev) => Object.freeze({ ...prev, [field]: safe }));
    },
    []
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="
        bg-zinc-900 text-zinc-100 rounded-2xl border border-zinc-700 shadow-2xl
        w-full max-w-sm mx-auto p-0 backdrop:bg-black/70
        open:flex open:flex-col
      "
      onClose={handleClose}
      aria-labelledby="settings-title"
    >
      <div className="flex items-center justify-between p-5 border-b border-zinc-700">
        <h2 id="settings-title" className="text-lg font-bold text-zinc-100">
          {'Game Settings'}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Close settings"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Team A */}
        <fieldset className="border border-green-800 rounded-xl p-4">
          <legend className="text-green-400 text-xs font-bold uppercase tracking-widest px-2">
            {'Team A'}
          </legend>
          <div className="flex flex-col gap-3 mt-2">
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400 text-xs">{'Player 1 (starts right)'}</span>
              <input
                type="text"
                value={names.teamAPlayer1}
                onChange={(e) => setName('teamAPlayer1', e.currentTarget.value)}
                maxLength={24}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Team A Player 1 name"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400 text-xs">{'Player 2 (starts left)'}</span>
              <input
                type="text"
                value={names.teamAPlayer2}
                onChange={(e) => setName('teamAPlayer2', e.currentTarget.value)}
                maxLength={24}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Team A Player 2 name"
              />
            </label>
          </div>
        </fieldset>

        {/* Team B */}
        <fieldset className="border border-blue-800 rounded-xl p-4">
          <legend className="text-blue-400 text-xs font-bold uppercase tracking-widest px-2">
            {'Team B'}
          </legend>
          <div className="flex flex-col gap-3 mt-2">
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400 text-xs">{'Player 1 (starts right)'}</span>
              <input
                type="text"
                value={names.teamBPlayer1}
                onChange={(e) => setName('teamBPlayer1', e.currentTarget.value)}
                maxLength={24}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Team B Player 1 name"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-zinc-400 text-xs">{'Player 2 (starts left)'}</span>
              <input
                type="text"
                value={names.teamBPlayer2}
                onChange={(e) => setName('teamBPlayer2', e.currentTarget.value)}
                maxLength={24}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Team B Player 2 name"
              />
            </label>
          </div>
        </fieldset>

        {/* Win score */}
        <fieldset className="border border-zinc-700 rounded-xl p-4">
          <legend className="text-zinc-400 text-xs font-bold uppercase tracking-widest px-2">
            {'Win Score'}
          </legend>
          <div className="flex gap-2 mt-2">
            {([11, 15, 21] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(s)}
                className={`
                  flex-1 py-2 rounded-lg font-bold text-sm transition-colors
                  ${score === s
                    ? 'bg-yellow-400 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}
                `}
                aria-pressed={score === s}
              >
                {String(s)}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex gap-3 p-5 pt-0">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 py-3 rounded-xl border border-zinc-600 text-zinc-300 font-semibold hover:bg-zinc-800 transition-colors"
        >
          {'Cancel'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3 rounded-xl bg-yellow-400 text-zinc-900 font-black hover:bg-yellow-300 transition-colors active:scale-95"
        >
          {'Save & Restart'}
        </button>
      </div>
    </dialog>
  );
}
