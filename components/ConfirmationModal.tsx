import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onSecondary?: (() => void) | null;
  onTertiary?: (() => void) | null;
  onCancel: () => void;
  confirmText: string;
  secondaryText?: string;
  tertiaryText?: string;
  cancelText: string;
  confirmDesc?: string;
  secondaryDesc?: string;
  tertiaryDesc?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, title, message,
  onConfirm, onSecondary, onTertiary, onCancel,
  confirmText, secondaryText, tertiaryText, cancelText,
  confirmDesc, secondaryDesc, tertiaryDesc
}) => {
  if (!isOpen) return null;

  // v3.3: Detect 3-option card layout (generation choice)
  const isThreeOptionLayout = !!(onSecondary && onTertiary);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white rounded-lg shadow-xl ${isThreeOptionLayout ? 'max-w-lg' : 'max-w-md'} w-full overflow-hidden border border-slate-200 transform scale-100 transition-all`}>

        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 leading-relaxed mb-4">{message}</p>

          {isThreeOptionLayout ? (
            /* ── 3-option card layout for generation choice ── */
            <div className="space-y-3">

              {/* Option 1: Enhance (green) */}
              <button
                onClick={onConfirm}
                className="w-full text-left p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">✦</div>
                  <div>
                    <div className="font-semibold text-emerald-800 group-hover:text-emerald-900">{confirmText}</div>
                    {confirmDesc && <div className="text-xs text-emerald-600 mt-0.5">{confirmDesc}</div>}
                  </div>
                </div>
              </button>

              {/* Option 2: Fill Missing (blue) */}
              <button
                onClick={onSecondary!}
                className="w-full text-left p-4 rounded-lg border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center text-sm font-bold">+</div>
                  <div>
                    <div className="font-semibold text-sky-800 group-hover:text-sky-900">{secondaryText}</div>
                    {secondaryDesc && <div className="text-xs text-sky-600 mt-0.5">{secondaryDesc}</div>}
                  </div>
                </div>
              </button>

              {/* Option 3: Regenerate All (amber) */}
              <button
                onClick={onTertiary!}
                className="w-full text-left p-4 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">↻</div>
                  <div>
                    <div className="font-semibold text-amber-800 group-hover:text-amber-900">{tertiaryText}</div>
                    {tertiaryDesc && <div className="text-xs text-amber-600 mt-0.5">{tertiaryDesc}</div>}
                  </div>
                </div>
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
          >
            {cancelText}
          </button>

          {/* Legacy 2-button layout (for non-generation modals) */}
          {!isThreeOptionLayout && (
            <>
              {onSecondary && (
                <button
                  onClick={onSecondary}
                  className="px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors"
                >
                  {secondaryText}
                </button>
              )}
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm transition-colors"
              >
                {confirmText}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal;
