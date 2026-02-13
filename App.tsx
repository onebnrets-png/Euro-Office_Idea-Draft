import React, { useState, useEffect, useCallback } from 'react';

// ─── Components ───────────────────────────────────────────────
import WelcomeScreen from './components/WelcomeScreen';
import ProjectDisplay from './components/ProjectDisplay';
import PrintLayout from './components/PrintLayout';
import GanttChart from './components/GanttChart';
import PERTChart from './components/PERTChart';
import Organigram from './components/Organigram';
import ConfirmationModal from './components/ConfirmationModal';
import SettingsModal from './components/SettingsModal';
import ProjectListModal from './components/ProjectListModal';

// ─── Constants & Utilities ────────────────────────────────────
import { ICONS, getSteps, BRAND_ASSETS } from './constants';
import { TEXT } from './locales';
import { downloadBlob, isStepCompleted as checkStepCompleted } from './utils';

// ─── Hooks ────────────────────────────────────────────────────
import { useAuth } from './hooks/useAuth';
import { useProjectManager } from './hooks/useProjectManager';
import { useGeneration } from './hooks/useGeneration';
import { useTranslation } from './hooks/useTranslation';

// ─── Main App Component ───────────────────────────────────────

const App: React.FC = () => {
  // ─── UI State ──────────────────────────────────────────────
  const [language, setLanguage] = useState<'en' | 'si'>('si');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onSecondary: undefined as (() => void) | undefined | null,
    onCancel: () => {},
    confirmText: '',
    secondaryText: undefined as string | undefined,
    cancelText: ''
  });

  // ─── Localization ──────────────────────────────────────────
  const t = TEXT[language] || TEXT['en'];
  const STEPS = getSteps(language);

  // ─── Modal helper ──────────────────────────────────────────
  const closeModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  // ─── Auth Hook ─────────────────────────────────────────────
  const auth = useAuth();

  // ─── Project Manager Hook ─────────────────────────────────
  const pm = useProjectManager({
    language,
    setLanguage,
    currentUser: auth.currentUser,
  });

  // ─── Show project list on login ───────────────────────────
  useEffect(() => {
    if (pm.showProjectListOnLogin) {
      setIsProjectListOpen(true);
      pm.setShowProjectListOnLogin(false);
    }
  }, [pm.showProjectListOnLogin]);

  // ─── Generation Hook ──────────────────────────────────────
  const gen = useGeneration({
    projectData: pm.projectData,
    setProjectData: pm.setProjectData,
    language,
    ensureApiKey: auth.ensureApiKey,
    setIsSettingsOpen,
    setHasUnsavedTranslationChanges: pm.setHasUnsavedTranslationChanges,
    handleUpdateData: pm.handleUpdateData,
    checkSectionHasContent: pm.checkSectionHasContent,
    setModalConfig,
    closeModal,
  });

  // ─── Translation Hook ─────────────────────────────────────
  const translation = useTranslation({
    language,
    setLanguage,
    projectData: pm.projectData,
    setProjectData: pm.setProjectData,
    projectVersions: pm.projectVersions,
    setProjectVersions: pm.setProjectVersions,
    currentProjectId: pm.currentProjectId,
    currentUser: auth.currentUser,
    hasUnsavedTranslationChanges: pm.hasUnsavedTranslationChanges,
    setHasUnsavedTranslationChanges: pm.setHasUnsavedTranslationChanges,
    hasContent: pm.hasContent,
    ensureApiKey: auth.ensureApiKey,
    setIsLoading: gen.setIsLoading,
    setError: gen.setError,
    setIsSettingsOpen,
    setModalConfig,
    closeModal,
  });

  // ─── Handlers ─────────────────────────────────────────────
  const handleLanguageSwitch = (newLang: 'en' | 'si') => {
    translation.handleLanguageSwitchRequest(newLang);
  };

  const handleLogout = async () => {
    await auth.handleLogout();
    pm.resetOnLogout();
  };

  // ─── Computed ─────────────────────────────────────────────
  const completedSteps = STEPS.map((_step: any, index: number) => {
    try {
      return checkStepCompleted(pm.projectData, index);
    } catch {
      return false;
    }
  });

  const missingApiKey = !auth.ensureApiKey();

  // ─── Shared props for ProjectDisplay ──────────────────────
  const displayProps = {
    projectData: pm.projectData,
    onUpdateData: pm.handleUpdateData,
    onGenerateField: gen.handleGenerateField,
    onGenerateSection: gen.handleGenerateSection,
    onAddItem: pm.handleAddItem,
    onRemoveItem: pm.handleRemoveItem,
    isLoading: gen.isLoading,
    language,
    missingApiKey,
  };

  // ─── Login Screen ─────────────────────────────────────────
  if (!auth.currentUser) {
    return (
      <div className="min-h-screen">
        <WelcomeScreen
          onStartEditing={() => {}}
          completedSteps={STEPS.map(() => false)}
          projectIdea={{ projectTitle: '', projectAcronym: '' }}
          language={language}
          setLanguage={(lang: 'en' | 'si') => handleLanguageSwitch(lang)}
          logo={auth.appLogo || BRAND_ASSETS.logoText}
        />
        {/* Login is handled by WelcomeScreen internally or a separate login flow */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          language={language}
        />
      </div>
    );
  }

  // ─── Editing a specific step ──────────────────────────────
  if (pm.currentStepId !== null) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 shadow-sm">
          <button
            onClick={pm.handleBackToWelcome}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            ← {t.backToOverview || 'Nazaj'}
          </button>

          <div className="flex-1 text-center">
            <span className="text-sm font-bold text-slate-700">
              {pm.projectData?.projectIdea?.projectTitle || t.appTitle}
            </span>
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleLanguageSwitch('si')}
              className={`text-xs px-2 py-1 rounded ${language === 'si' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >SI</button>
            <button
              onClick={() => handleLanguageSwitch('en')}
              className={`text-xs px-2 py-1 rounded ${language === 'en' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >EN</button>
          </div>

          {/* Save */}
          <button onClick={pm.handleSaveToStorage} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors">
            {t.save || 'Shrani'}
          </button>

          {/* Import */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
            {t.import || 'Uvoz'}
            <input type="file" accept=".json" onChange={pm.handleImportProject} className="hidden" />
          </label>

          {/* Export DOCX */}
          <button onClick={() => pm.handleExportDocx(gen.setIsLoading)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors">
            DOCX
          </button>

          {/* Print */}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
            {t.print || 'Tisk'}
          </button>

          {/* Summary */}
          <button onClick={gen.handleExportSummary} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors">
            {t.summary || 'Povzetek'}
          </button>

          {/* Settings */}
          <button onClick={() => setIsSettingsOpen(true)} className="px-2 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
            ⚙️
          </button>

          {/* Projects */}
          <button onClick={() => setIsProjectListOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
            {t.myProjects || 'Projekti'}
          </button>

          {/* Logout */}
          <button onClick={handleLogout} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            {t.logout || 'Odjava'}
          </button>
        </header>

        {/* Error bar */}
        {gen.error && (
          <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between items-center">
            <span>{gen.error}</span>
            <button onClick={() => gen.setError(null)} className="text-red-400 hover:text-red-600 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Main content */}
        <div id="main-scroll-container" className="max-w-5xl mx-auto px-6 py-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
          <ProjectDisplay
            {...displayProps}
            stepId={pm.currentStepId}
            onSubStepClick={pm.handleSubStepClick}
          />
        </div>

        {/* Loading Overlay */}
        {gen.isLoading && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-700 font-medium">{typeof gen.isLoading === 'string' ? gen.isLoading : (t.generating || 'Generating...')}</p>
            </div>
          </div>
        )}

        {/* Modals */}
        <ConfirmationModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          onSecondary={modalConfig.onSecondary}
          onCancel={modalConfig.onCancel || closeModal}
          confirmText={modalConfig.confirmText}
          secondaryText={modalConfig.secondaryText}
          cancelText={modalConfig.cancelText}
        />

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />

        <ProjectListModal
          isOpen={isProjectListOpen}
          onClose={() => setIsProjectListOpen(false)}
          projects={pm.userProjects}
          onSelectProject={pm.handleSwitchProject}
          onCreateProject={pm.handleCreateProject}
          onDeleteProject={pm.handleDeleteProject}
          currentProjectId={pm.currentProjectId}
          language={language}
        />

        {/* Summary Modal */}
        {gen.summaryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">{t.summary || 'Povzetek projekta'}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={gen.handleDownloadSummaryDocx} className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">DOCX</button>
                  <button onClick={() => gen.setSummaryModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {gen.isGeneratingSummary ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: gen.summaryText }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Print Layout (hidden) */}
        <div className="hidden print:block">
          {pm.projectData && (
            <PrintLayout projectData={pm.projectData} language={language} logo={auth.appLogo || BRAND_ASSETS.logoText} />
          )}
        </div>

        {/* Hidden chart containers for DOCX export */}
        {pm.projectData && (
          <>
            <div id="gantt-export-container" className="fixed -left-[9999px] w-[1200px]">
              <GanttChart projectData={pm.projectData} language={language} />
            </div>
            <div id="pert-export-container" className="fixed -left-[9999px] w-[1200px]">
              <PERTChart projectData={pm.projectData} language={language} />
            </div>
            <div id="organigram-export-container" className="fixed -left-[9999px] w-[1200px]">
              <Organigram projectData={pm.projectData} language={language} />
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Welcome / Dashboard Screen ───────────────────────────
  return (
    <div className="min-h-screen">
      <WelcomeScreen
        onStartEditing={pm.handleStartEditing}
        completedSteps={completedSteps}
        projectIdea={pm.projectData?.projectIdea || { projectTitle: '', projectAcronym: '' }}
        language={language}
        setLanguage={(lang: 'en' | 'si') => handleLanguageSwitch(lang)}
        logo={auth.appLogo || BRAND_ASSETS.logoText}
      />

      {/* Floating action buttons on dashboard */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-20">
        <button onClick={() => setIsProjectListOpen(true)} className="px-4 py-2 bg-sky-500 text-white rounded-full shadow-lg hover:bg-sky-600 transition-colors text-sm font-medium">
          {t.myProjects || 'Projekti'}
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className="px-4 py-2 bg-slate-500 text-white rounded-full shadow-lg hover:bg-slate-600 transition-colors text-sm font-medium">
          ⚙️ {t.settings || 'Nastavitve'}
        </button>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors text-sm font-medium">
          {t.logout || 'Odjava'}
        </button>
      </div>

      {/* API Warning Banner */}
      {auth.shouldShowBanner && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg shadow-lg max-w-2xl mx-auto">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm text-amber-700 font-medium">{t.apiWarningTitle}</p>
                <p className="text-sm text-amber-600 mt-1">{t.apiWarningMessage}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setIsSettingsOpen(true)} className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-md transition-colors">{t.openSettings}</button>
                  <button onClick={auth.dismissWarning} className="text-sm text-amber-600 hover:text-amber-800 px-3 py-1 transition-colors">{t.dismiss}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onSecondary={modalConfig.onSecondary}
        onCancel={modalConfig.onCancel || closeModal}
        confirmText={modalConfig.confirmText}
        secondaryText={modalConfig.secondaryText}
        cancelText={modalConfig.cancelText}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />

      <ProjectListModal
        isOpen={isProjectListOpen}
        onClose={() => setIsProjectListOpen(false)}
        projects={pm.userProjects}
        onSelectProject={pm.handleSwitchProject}
        onCreateProject={pm.handleCreateProject}
        onDeleteProject={pm.handleDeleteProject}
        currentProjectId={pm.currentProjectId}
        language={language}
      />
    </div>
  );
};

export default App;
