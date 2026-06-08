/**
 * VoiceFeedback — floating badge that shows current voice status and last command.
 */

import type { VoiceStatus, VoiceCommand } from '../hooks/useVoiceControl';

interface VoiceFeedbackProps {
  status: VoiceStatus;
  lastCommand: VoiceCommand | null;
}

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle:        'Voice off',
  listening:   'Listening…',
  processing:  'Got it!',
  error:       'Mic error',
  unsupported: 'Voice N/A',
};

const ACTION_LABEL: Record<VoiceCommand['action'], string> = {
  SCORE_A: '✅ +1 Team A',
  SCORE_B: '✅ +1 Team B',
  UNDO:    '↩ Undone',
  RESET:   '🔄 Reset',
  UNKNOWN: '❓ Not recognised',
};

export function VoiceFeedback({ status, lastCommand }: VoiceFeedbackProps) {
  if (status === 'idle' || status === 'unsupported') return null;

  const dot =
    status === 'listening'  ? 'bg-green-400 animate-pulse' :
    status === 'processing' ? 'bg-yellow-400' :
    'bg-red-400';

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="flex flex-col items-center gap-1.5">
        {/* Status pill */}
        <div className="flex items-center gap-2 bg-zinc-800/95 backdrop-blur border border-zinc-700 rounded-full px-4 py-2 shadow-xl">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-zinc-200 text-sm font-semibold">{STATUS_LABEL[status]}</span>
        </div>

        {/* Last command */}
        {lastCommand && (status === 'processing' || status === 'listening') && (
          <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-xl px-4 py-2 shadow-lg text-center">
            <p className="text-zinc-400 text-xs italic truncate max-w-[220px]">
              "{lastCommand.transcript}"
            </p>
            <p className={`text-sm font-bold mt-0.5 ${lastCommand.action === 'UNKNOWN' ? 'text-zinc-500' : 'text-green-400'}`}>
              {ACTION_LABEL[lastCommand.action]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
