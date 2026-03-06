// components/FieldAIAssistant.tsx
// ═══════════════════════════════════════════════════════════════
// v1.1 — 2026-03-06 — EO-043: z-index fix — popup always on top
// v1.0 — 2026-03-06 — EO-039: AI Assistant per-field popup
// Popup component for contextual AI generation/improvement of any field.
// User enters instructions → AI generates/improves content using:
//   - User instructions (from popup textarea)
//   - Current field value (if any — improve/supplement; if empty — generate)
//   - Full project context (all filled sections)
//   - Global + org instructions (rules)
//   - Knowledge base documents
// Preview → Accept / Regenerate / Cancel
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface FieldAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (newValue: string) => void;
  onGenerate: (userInstructions: string) => Promise<string>;
  currentValue: string;
  fieldLabel: string;
  language: 'en' | 'si';
}

var FieldAIAssistant = function(props: FieldAIAssistantProps) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var onAccept = props.onAccept;
  var onGenerate = props.onGenerate;
  var currentValue = props.currentValue;
  var fieldLabel = props.fieldLabel;
  var language = props.language;

  var textareaRef = useRef<HTMLTextAreaElement>(null);
  var popupRef = useRef<HTMLDivElement>(null);

  var instructionsState = useState('');
  var instructions = instructionsState[0];
  var setInstructions = instructionsState[1];

  var previewState = useState('');
  var preview = previewState[0];
  var setPreview = previewState[1];

  var isGeneratingState = useState(false);
  var isGenerating = isGeneratingState[0];
  var setIsGenerating = isGeneratingState[1];

  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];

  var hasPreviewState = useState(false);
  var hasPreview = hasPreviewState[0];
  var setHasPreview = hasPreviewState[1];

  // Focus textarea on open
  useEffect(function() {
    if (isOpen && textareaRef.current) {
      setTimeout(function() {
        if (textareaRef.current) textareaRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(function() {
    if (!isOpen) return;
    var handler = function(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return function() { window.removeEventListener('keydown', handler); };
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(function() {
    if (!isOpen) return;
    var handler = function(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to prevent immediate close on the click that opened it
    var timer = setTimeout(function() {
      document.addEventListener('mousedown', handler);
    }, 200);
    return function() {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen, onClose]);

  var handleGenerate = useCallback(async function() {
    setIsGenerating(true);
    setError('');
    try {
      var result = await onGenerate(instructions);
      setPreview(result);
      setHasPreview(true);
    } catch (e: any) {
      setError(e.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [instructions, onGenerate]);

  var handleAccept = useCallback(function() {
    onAccept(preview);
    // Reset state
    setInstructions('');
    setPreview('');
    setHasPreview(false);
    setError('');
    onClose();
  }, [preview, onAccept, onClose]);

  var handleCancel = useCallback(function() {
    setInstructions('');
    setPreview('');
    setHasPreview(false);
    setError('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  var t = {
    title: language === 'si' ? 'AI Asistent' : 'AI Assistant',
    instructionsLabel: language === 'si' ? 'Vaša navodila (neobvezno):' : 'Your instructions (optional):',
    instructionsPlaceholder: language === 'si'
      ? 'Npr.: uporabi ISO standarde, dodaj reference na študije, napiši bolj formalno, razširi z konkretnimi primeri...'
      : 'E.g.: use ISO standards, add references to studies, write more formally, expand with concrete examples...',
    currentValueLabel: language === 'si' ? 'Trenutna vsebina:' : 'Current content:',
    emptyField: language === 'si' ? '(prazno polje — AI bo generiral novo vsebino)' : '(empty field — AI will generate new content)',
    generate: language === 'si' ? 'Generiraj' : 'Generate',
    regenerate: language === 'si' ? 'Regeneriraj' : 'Regenerate',
    accept: language === 'si' ? 'Sprejmi' : 'Accept',
    cancel: language === 'si' ? 'Prekliči' : 'Cancel',
    generating: language === 'si' ? 'Generiram...' : 'Generating...',
    previewLabel: language === 'si' ? 'Predogled rezultata:' : 'Result preview:',
    fieldLabel: language === 'si' ? 'Polje:' : 'Field:',
  };

  return (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        zIndex: 9999,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        marginTop: '4px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        fontFamily: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg style={{ width: 18, height: 18, color: '#ffffff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>{t.title}</span>
        </div>
        <button
          onClick={handleCancel}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            transition: 'background 0.15s',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
        >
          <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
        {/* Field name */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.fieldLabel}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginLeft: '6px' }}>
            {fieldLabel}
          </span>
        </div>

        {/* Current value indicator */}
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
            {t.currentValueLabel}
          </span>
          {currentValue && currentValue.trim() ? (
            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5, maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentValue.length > 200 ? currentValue.substring(0, 200) + '...' : currentValue}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>{t.emptyField}</p>
          )}
        </div>

        {/* Instructions textarea */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
            {t.instructionsLabel}
          </label>
          <textarea
            ref={textareaRef}
            value={instructions}
            onChange={function(e) { setInstructions(e.target.value); }}
            onKeyDown={function(e) {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder={t.instructionsPlaceholder}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical',
              minHeight: '70px',
              maxHeight: '150px',
              fontFamily: 'inherit',
              color: '#334155',
              outline: 'none',
              transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
            onFocus={function(e) { e.target.style.borderColor = '#6366f1'; }}
            onBlur={function(e) { e.target.style.borderColor = '#e2e8f0'; }}
          />
          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
            Ctrl+Enter = {t.generate}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Preview */}
        {hasPreview && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#059669', display: 'block', marginBottom: '6px' }}>
              {t.previewLabel}
            </label>
            <div style={{
              padding: '10px 12px',
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '10px',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#166534',
              maxHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {preview}
            </div>
          </div>
        )}
      </div>

      {/* Footer — action buttons */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
      }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = '#ffffff'; }}
        >
          {t.cancel}
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {hasPreview && (
            <button
              onClick={handleAccept}
              style={{
                padding: '7px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#ffffff',
                background: '#059669',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={function(e) { e.currentTarget.style.background = '#047857'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = '#059669'; }}
            >
              {t.accept}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
              background: isGenerating ? '#a5b4fc' : '#6366f1',
              border: 'none',
              borderRadius: '8px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={function(e) { if (!isGenerating) e.currentTarget.style.background = '#4f46e5'; }}
            onMouseLeave={function(e) { if (!isGenerating) e.currentTarget.style.background = '#6366f1'; }}
          >
            {isGenerating && (
              <div style={{
                width: 12, height: 12,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            )}
            {isGenerating ? t.generating : (hasPreview ? t.regenerate : t.generate)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldAIAssistant;
