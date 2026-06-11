import { useEffect, useRef, useCallback } from 'react';

interface HelpModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="
        bg-zinc-900 text-zinc-100 rounded-2xl border border-zinc-700 shadow-2xl
        w-full max-w-md mx-auto p-0 backdrop:bg-black/70
        open:flex open:flex-col max-h-[85vh]
      "
      onClose={handleClose}
      aria-labelledby="help-title"
    >
      <div className="flex items-center justify-between p-5 border-b border-zinc-700 sticky top-0 bg-zinc-900 z-10 rounded-t-2xl">
        <h2 id="help-title" className="text-base font-black text-zinc-100 uppercase tracking-wider">
          {'Rules & FAQ Assistant'}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close help"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div className="p-5 overflow-y-auto flex flex-col gap-5 text-xs text-zinc-300 leading-relaxed scrollbar-thin">
        {/* Scoring */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-[10px]">
            {'1. Scoring Sequence'}
          </h3>
          <p>
            {'In pickleball, only the serving team can score points. A standard game is played to 11 points (must win by 2). In tournaments, games may be played to 15 or 21.'}
          </p>
        </section>

        {/* Server Numbers */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-[10px]">
            {'2. Serving Team Rotation (Server 1 vs 2)'}
          </h3>
          <p>
            {'Each team gets two serves (one for each player). When the first server commits a fault, the serve goes to their partner (Server 2). When Server 2 faults, it is a "side-out," and the serve goes to the opponents.'}
          </p>
          <p className="bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-800/80 italic text-zinc-400">
            <strong>{'First Serve Exception:'}</strong> {'At the very start of the match, the first serving team only gets one server (Server 2). This prevents the starting team from gaining an unfair early scoring advantage.'}
          </p>
        </section>

        {/* Double Bounce */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-[10px]">
            {'3. Double-Bounce Rule'}
          </h3>
          <p>
            {'The receiving team must let the serve bounce before hitting it. Following the return, the serving team must also let the ball bounce before hitting it. Once these two bounces have occurred, volleys (hitting the ball in the air without a bounce) are allowed.'}
          </p>
        </section>

        {/* The Kitchen */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-[10px]">
            {'4. The Kitchen (Non-Volley Zone)'}
          </h3>
          <p>
            {'The Kitchen is the 7-foot zone on both sides of the net. Players cannot volley the ball (hit it in the air) while standing inside or touching the Kitchen lines. However, they may stand inside the Kitchen to play a ball that has already bounced.'}
          </p>
        </section>

        {/* FAQs */}
        <div className="border-t border-zinc-800 pt-4 mt-1 flex flex-col gap-4">
          <h4 className="text-zinc-100 font-bold uppercase tracking-wide text-[10px]">
            {'Frequently Asked Questions'}
          </h4>

          <details className="group border-b border-zinc-800/60 pb-2">
            <summary className="font-bold text-zinc-200 cursor-pointer list-none flex justify-between items-center group-open:text-yellow-400">
              <span>{'Which side do I serve from?'}</span>
              <span className="transition-transform group-open:rotate-180">{'▼'}</span>
            </summary>
            <p className="text-zinc-400 mt-1.5 pl-1">
              {'You serve from the right (even) court side when your team\'s score is even (0, 2, 4, etc.), and from the left (odd) side when your score is odd (1, 3, 5, etc.).'}
            </p>
          </details>

          <details className="group border-b border-zinc-800/60 pb-2">
            <summary className="font-bold text-zinc-200 cursor-pointer list-none flex justify-between items-center group-open:text-yellow-400">
              <span>{'What happens if a serve hits the net?'}</span>
              <span className="transition-transform group-open:rotate-180">{'▼'}</span>
            </summary>
            <p className="text-zinc-400 mt-1.5 pl-1">
              {'Unlike tennis, there are no "let" serves in pickleball. If a served ball hits the net tape and lands inside the correct service court, the play continues. If it lands outside (including inside the Kitchen or on the Kitchen line), it is a fault.'}
            </p>
          </details>

          <details className="group border-b border-zinc-800/60 pb-2">
            <summary className="font-bold text-zinc-200 cursor-pointer list-none flex justify-between items-center group-open:text-yellow-400">
              <span>{'Can I step into the Kitchen after a volley?'}</span>
              <span className="transition-transform group-open:rotate-180">{'▼'}</span>
            </summary>
            <p className="text-zinc-400 mt-1.5 pl-1">
              {'No. A player\'s momentum cannot carry them into the Kitchen or onto the Kitchen line after executing a volley, even if the ball is declared dead before they land.'}
            </p>
          </details>
        </div>
      </div>

      <div className="p-5 border-t border-zinc-700 bg-zinc-900 sticky bottom-0 z-10 rounded-b-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 rounded-xl bg-yellow-400 text-zinc-900 font-black hover:bg-yellow-300 transition-colors cursor-pointer text-center text-sm"
        >
          {'Got it!'}
        </button>
      </div>
    </dialog>
  );
}
