  // ─── 3-option generation modal helper ──────────────────────────

  const show3OptionModal = useCallback(
    (onEnhance: () => void, onFill: () => void, onRegenerate: () => void) => {
      setModalConfig({
        isOpen: true,
        title: t.modals.generationChoiceTitle,
        message: t.modals.generationChoiceMsg,

        confirmText: t.modals.enhanceExistingBtn,
        confirmDesc: t.modals.enhanceExistingDesc,
        onConfirm: onEnhance,

        secondaryText: t.modals.fillMissingBtn,
        secondaryDesc: t.modals.fillMissingDesc,
        onSecondary: onFill,

        tertiaryText: t.modals.regenerateAllBtn,
        tertiaryDesc: t.modals.regenerateAllDesc,
        onTertiary: onRegenerate,

        cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
        onCancel: closeModal,
      });
    },
    [t, language, setModalConfig, closeModal]
  );

  // ─── SMART Handle generate (4-level logic) ─────────────────────

    const handleGenerateSection = useCallback(
    async (sectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const otherLang = language === 'en' ? 'SI' : 'EN';

      const subMapping = SUB_SECTION_MAP[sectionKey];
      const contentCheckKey = subMapping ? subMapping.parent : sectionKey;

      // ★ v7.6 FIX: Read fresh data from current projectData to avoid stale closure
      var freshHasContent = false;
      if (subMapping) {
        var subData = projectData;
        for (var si = 0; si < subMapping.path.length; si++) {
          subData = subData ? subData[subMapping.path[si]] : undefined;
        }
        freshHasContent = hasDeepContent(subData);
      } else {
        freshHasContent = robustCheckSectionHasContent(sectionKey);
        if (!freshHasContent && projectData[sectionKey] && typeof projectData[sectionKey] === 'object' && !Array.isArray(projectData[sectionKey])) {
          var secObj = projectData[sectionKey];
          var secKeys = Object.keys(secObj);
          for (var ski = 0; ski < secKeys.length; ski++) {
            var secVal = secObj[secKeys[ski]];
            if (typeof secVal === 'string' && secVal.trim().length > 0) { freshHasContent = true; break; }
            if (secVal && typeof secVal === 'object' && !Array.isArray(secVal)) {
              var nestedVals = Object.values(secVal);
              for (var nvi = 0; nvi < nestedVals.length; nvi++) {
                if (typeof nestedVals[nvi] === 'string' && (nestedVals[nvi] as string).trim().length > 0) { freshHasContent = true; break; }
              }
              if (freshHasContent) break;
            }
            if (Array.isArray(secVal) && secVal.length > 0) {
              var hasArrContent = secVal.some(function(item) {
                if (!item || typeof item !== 'object') return false;
                return Object.values(item).some(function(v) { return typeof v === 'string' && (v as string).trim().length > 0; });
              });
              if (hasArrContent) { freshHasContent = true; break; }
            }
          }
          if (freshHasContent) {
            console.log('[handleGenerateSection] ★ v7.6: Deep check found content in "' + sectionKey + '" that robustCheck missed');
          }
        }
      }
      var currentHasContent = freshHasContent;


      const otherLangData = await checkOtherLanguageHasContent(contentCheckKey);

      if (otherLangData && !currentHasContent) {
        setModalConfig({
          isOpen: true,
          title:
            language === 'si'
              ? `Vsebina obstaja v ${otherLang}`
              : `Content exists in ${otherLang}`,
          message:
            language === 'si'
              ? `To poglavje že ima vsebino v ${otherLang} jeziku. Želite prevesti obstoječo vsebino ali generirati novo?`
              : `This section already has content in ${otherLang}. Would you like to translate existing content or generate new?`,
          confirmText:
            language === 'si'
              ? `Prevedi iz ${otherLang}`
              : `Translate from ${otherLang}`,
          secondaryText: language === 'si' ? 'Generiraj novo' : 'Generate new',
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
          onConfirm: () => performTranslationFromOther(otherLangData),
          onSecondary: () => executeGeneration(sectionKey, 'regenerate'),
          onCancel: closeModal,
        });
        return;
      }

      if (otherLangData && currentHasContent) {
        setModalConfig({
          isOpen: true,
          title:
            language === 'si'
              ? `Vsebina obstaja v obeh jezikih`
              : `Content exists in both languages`,
          message:
            language === 'si'
              ? `To poglavje ima vsebino v slovenščini in angleščini. Kaj želite storiti?`
              : `This section has content in both SI and EN. What would you like to do?`,
          confirmText:
            language === 'si'
              ? 'Generiraj / izboljšaj trenutno'
              : 'Generate / enhance current',
          secondaryText:
            language === 'si'
              ? `Prevedi iz ${otherLang}`
              : `Translate from ${otherLang}`,
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
          onConfirm: () => {
            closeModal();
            setTimeout(() => {
              show3OptionModal(
                () => executeGeneration(sectionKey, 'enhance'),
                () => executeGeneration(sectionKey, 'fill'),
                () => executeGeneration(sectionKey, 'regenerate')
              );
            }, 100);
          },
          onSecondary: () => performTranslationFromOther(otherLangData),
          onCancel: closeModal,
        });
        return;
      }

            if (currentHasContent) {
        show3OptionModal(
          () => executeGeneration(sectionKey, 'enhance'),
          () => executeGeneration(sectionKey, 'fill'),
          () => executeGeneration(sectionKey, 'regenerate')
        );
        return;
      }

      // ★ v7.6 FIX: For parent sections (problemAnalysis, projectIdea), check if ANY sub-field has content
      if (sectionKey === 'problemAnalysis' || sectionKey === 'projectIdea') {
        var parentData = projectData[sectionKey];
        if (parentData && typeof parentData === 'object' && Object.keys(parentData).length > 0) {
          var anyContent = false;
          for (var pKey in parentData) {
            if (parentData[pKey] && typeof parentData[pKey] === 'string' && parentData[pKey].trim().length > 0) { anyContent = true; break; }
            if (parentData[pKey] && typeof parentData[pKey] === 'object') {
              var pVals = Object.values(parentData[pKey]);
              if (pVals.some(function(v) { return typeof v === 'string' && (v as string).trim().length > 0; })) { anyContent = true; break; }
            }
          }
          if (anyContent) {
            console.log('[handleGenerateSection] ★ v7.6: Detected content in ' + sectionKey + ' sub-fields — offering fill option');
            show3OptionModal(
              () => executeGeneration(sectionKey, 'enhance'),
              () => executeGeneration(sectionKey, 'fill'),
              () => executeGeneration(sectionKey, 'regenerate')
            );
            return;
          }
        }
      }

      executeGeneration(sectionKey, 'regenerate');

    },
    [
      ensureApiKey,
      language,
      projectData,
      hasDeepContent,
      robustCheckSectionHasContent,
      checkOtherLanguageHasContent,
      executeGeneration,
      performTranslationFromOther,
      show3OptionModal,
      setModalConfig,
      closeModal,
      setIsSettingsOpen,
    ]
  );

    // ─── Composite generation (expectedResults OR activities) ───────

  const handleGenerateCompositeSection = useCallback(
    async (compositeSectionKey: string) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const COMPOSITE_MAP: Record<string, string[]> = {
        expectedResults: ['outputs', 'outcomes', 'impacts', 'kers'],
        activities: ['projectManagement', 'partners', 'activities', 'partnerAllocations', 'risks'],
      };

      const allSections = COMPOSITE_MAP[compositeSectionKey];
      if (!allSections) {
        console.error(`[handleGenerateCompositeSection] Unknown composite key: ${compositeSectionKey}`);
        return;
      }

      const isActivities = compositeSectionKey === 'activities';

            const checkableSections = isActivities
        ? ['projectManagement', 'partners', 'activities', 'risks']
        : allSections;

        const hasContentInSections = checkableSections.some((s) => {
        if (isActivities && s === 'projectManagement') {
          const hasWPs = Array.isArray(projectData.activities) && projectData.activities.some((wp: any) => wp.title?.trim() && wp.tasks?.length > 0 && wp.tasks.some((t: any) => t.title?.trim()));
          const hasPart = Array.isArray(projectData.partners) && projectData.partners.some((p: any) => p.name?.trim());
          if (!hasWPs && !hasPart) return false;
        }
        return robustCheckSectionHasContent(s);
      });

      const otherLang = language === 'en' ? 'SI' : 'EN';

      const hasRealContent = (data: any, sectionKey: string): boolean => {
        if (!data) return false;
        const section = data[sectionKey];
        if (!section) return false;
        if (Array.isArray(section)) {
          return section.length > 0 && section.some((item: any) => {
            if (!item || typeof item !== 'object') return false;
            return Object.entries(item).some(([key, val]) => {
              if (key === 'id' || key === 'startDate' || key === 'endDate' || key === 'startMonth' || key === 'endMonth' || key === 'dependencies' || key === 'leader' || key === 'participants') return false;
              if (typeof val === 'string') return val.trim().length > 0;
              if (Array.isArray(val)) return val.length > 0 && val.some((v: any) => {
                if (!v || typeof v !== 'object') return false;
                return Object.entries(v).some(([k2, v2]) => {
                  if (k2 === 'id' || k2 === 'dependencies') return false;
                  return typeof v2 === 'string' && v2.trim().length > 0;
                });
              });
              return false;
            });
          });
        }
        if (typeof section === 'object') {
          const desc = (section as any).description;
          if (typeof desc === 'string' && desc.trim().length > 0) return true;
          return false;
        }
        return false;
      };

      let otherLangData: any = null;
      for (const s of checkableSections) {
        const candidate = await checkOtherLanguageHasContent(s);
          if (candidate) {
          otherLangData = candidate;
          break;
        }
      }

      // ── Main composite runner ──
      const runComposite = async (mode: string) => {
        if (!preGenerationGuard(`composite-${compositeSectionKey}`)) return;

        isGeneratingRef.current = true;
        sessionCallCountRef.current++;

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        const signal = abortController.signal;

        closeModal();
        setIsLoading(true);
        setError(null);

        try {
                    if (isActivities) {
            // ═══════════════════════════════════════════════
            // ACTIVITIES COMPOSITE — sequential with dependencies
            // ═══════════════════════════════════════════════

            let newData = { ...projectData };
            const totalSteps = 5;
            let currentStep = 0;
            let successCount = 0;
            let firstFatalError: any = null;

            const stepLabel = (stepNum: number, siText: string, enText: string) => {
              return language === 'si'
                ? `${siText} (${stepNum}/${totalSteps})...`
                : `${enText} (${stepNum}/${totalSteps})...`;
            };

            const isRateLimitError = (e: any): boolean => {
              const msg = e?.message || e?.toString() || '';
              return msg.includes('RATE_LIMIT') || msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
            };

            // ── Step 1: Project Management ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
            setIsLoading(stepLabel(currentStep, 'Generiram implementacijo', 'Generating implementation'));

            try {
              const pmContent = await generateSectionContent(
                'projectManagement', newData, language, mode, null, signal
              );
              newData.projectManagement = {
                ...newData.projectManagement,
                ...pmContent,
                structure: {
                  ...(newData.projectManagement?.structure || {}),
                  ...(pmContent?.structure || {}),
                },
              };
              successCount++;
              console.log('[Composite/activities] PM content check — description length:', pmContent?.description?.length || 0, '| structure:', JSON.stringify(pmContent?.structure)?.substring(0, 200));
              console.log('[Composite/activities] Step 1/5: projectManagement ✅');
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] projectManagement failed:', e);
              if (!firstFatalError) firstFatalError = e;
              if (isRateLimitError(e)) {
                console.error('[Composite/activities] ★ RATE_LIMIT on step 1 — aborting composite');
                handleAIError(e, 'compositeActivities');
                setIsLoading(false);
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
                return;
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 2: Partners (Consortium) ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
            setIsLoading(stepLabel(currentStep, 'Generiram konzorcij', 'Generating consortium'));

            try {
              let partnersResult = await generateSectionContent(
                'partners', newData, language, mode, null, signal
              );
              if (Array.isArray(partnersResult)) {
                partnersResult = partnersResult.map((p: any, idx: number) => ({
                  ...p,
                  id: p.id || `partner-${idx + 1}`,
                  code: p.code || (idx === 0 ? (language === 'si' ? 'KO' : 'CO') : `P${idx + 1}`),
                  partnerType: (p.partnerType && isValidPartnerType(p.partnerType))
                    ? p.partnerType
                    : 'other',
                }));
                newData.partners = partnersResult;
                successCount++;
                console.log(`[Composite/activities] Step 2/5: partners ✅ (${partnersResult.length} partners)`);
              }
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] partners failed:', e);
              if (!firstFatalError) firstFatalError = e;
              if (isRateLimitError(e) && successCount === 0) {
                console.error('[Composite/activities] ★ RATE_LIMIT, 0 successes — aborting composite');
                handleAIError(e, 'compositeActivities');
                setIsLoading(false);
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
                return;
              }
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 3: Activities (WP per-WP generation) ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');

            try {
              const existingWPs = Array.isArray(newData.activities) ? newData.activities : [];

              let activitiesResult;
              if (mode === 'regenerate' || existingWPs.length === 0) {
                activitiesResult = await generateActivitiesPerWP(
                  newData, language, mode,
                  (wpIndex: number, wpTotal: number, wpTitle: string) => {
                    if (wpIndex === -1) {
                      setIsLoading(stepLabel(currentStep, 'Generiram strukturo DS', 'Generating WP structure'));
                    } else {
                      setIsLoading(
                        language === 'si'
                          ? `Generiram DS ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                          : `Generating WP ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                      );
                    }
                  },
                  undefined, undefined, signal
                );
              } else if (mode === 'enhance') {
                activitiesResult = await generateSectionContent(
                  'activities', newData, language, 'enhance', null, signal
                );
              } else {
                const emptyWPIndices: number[] = [];
                existingWPs.forEach((wp: any, idx: number) => {
                  const hasTasks = wp.tasks?.length > 0 && wp.tasks.some((t: any) => t.title?.trim());
                  const hasMilestones = wp.milestones?.length > 0;
                  const hasDeliverables = wp.deliverables?.length > 0 && wp.deliverables.some((d: any) => d.title?.trim());
                  if (!hasTasks || !hasMilestones || !hasDeliverables) emptyWPIndices.push(idx);
                });

                if (emptyWPIndices.length > 0) {
                  activitiesResult = await generateActivitiesPerWP(
                    newData, language, 'fill',
                    (wpIndex: number, wpTotal: number, wpTitle: string) => {
                      if (wpIndex === -1) {
                        setIsLoading(stepLabel(currentStep, `Dopolnjujem ${emptyWPIndices.length} DS`, `Filling ${emptyWPIndices.length} WPs`));
                      } else {
                        setIsLoading(
                          language === 'si'
                            ? `Dopolnjujem DS ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                            : `Filling WP ${wpIndex + 1}/${wpTotal}: ${wpTitle} (${currentStep}/${totalSteps})...`
                        );
                      }
                    },
                    existingWPs, emptyWPIndices, signal
                  );
                } else {
                  activitiesResult = existingWPs;
                }
              }

              if (Array.isArray(activitiesResult)) {
                newData.activities = activitiesResult;
              } else if (activitiesResult && Array.isArray(activitiesResult.activities)) {
                newData.activities = activitiesResult.activities;
              }

              const schedResult = recalculateProjectSchedule(newData);
              newData = schedResult.projectData;

              successCount++;
              console.log(`[Composite/activities] Step 3/5: activities ✅ (${(newData.activities || []).length} WPs)`);
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] activities failed:', e);
              if (!firstFatalError) firstFatalError = e;
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 4: Partner Allocations ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');

            const pa_partners = Array.isArray(newData.partners) ? newData.partners : [];
            const pa_activities = Array.isArray(newData.activities) ? newData.activities : [];

            if (pa_partners.length > 0 && pa_activities.length > 0) {
              setIsLoading(stepLabel(currentStep, 'Generiram alokacije partnerjev', 'Generating partner allocations'));

              try {
                const allocResult = await generatePartnerAllocations(
                  newData, language,
                  (msg: string) => setIsLoading(`${msg} (${currentStep}/${totalSteps})`),
                  signal
                );

                const updatedActivities = pa_activities.map((wp: any) => ({
                  ...wp,
                  tasks: (wp.tasks || []).map((task: any) => {
                    const taskAlloc = allocResult.find((a: any) => a.taskId === task.id);
                    if (taskAlloc?.allocations?.length > 0) {
                      return { ...task, partnerAllocations: taskAlloc.allocations };
                    }
                    return task;
                  }),
                }));
                newData.activities = updatedActivities;

                const totalAllocations = allocResult.reduce((s: number, t: any) => s + (t.allocations?.length || 0), 0);
                successCount++;
                console.log(`[Composite/activities] Step 4/5: partnerAllocations ✅ (${totalAllocations} allocations)`);
              } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                console.error('[Composite/activities] partnerAllocations failed:', e);
                if (!firstFatalError) firstFatalError = e;
              }
            } else {
              console.log(`[Composite/activities] Step 4/5: partnerAllocations ⏭ SKIPPED (partners: ${pa_partners.length}, activities: ${pa_activities.length})`);
            }

            await new Promise(r => setTimeout(r, 3000));

            // ── Step 5: Risks ──
            currentStep++;
            if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
            setIsLoading(stepLabel(currentStep, 'Generiram tveganja', 'Generating risks'));

            try {
              const risksContent = await generateSectionContent(
                'risks', newData, language, mode, null, signal
              );
              if (Array.isArray(risksContent)) {
                newData.risks = risksContent;
              } else if (risksContent && Array.isArray((risksContent as any).risks)) {
                newData.risks = (risksContent as any).risks;
              }
              if (Array.isArray(newData.risks)) {
                newData.risks = newData.risks.map((item: any, idx: number) => ({
                  ...item,
                  id: (item.id && item.id.trim()) ? item.id : `RISK${idx + 1}`,
                }));
              }
              successCount++;
              console.log(`[Composite/activities] Step 5/5: risks ✅`);
            } catch (e: any) {
              if (e.name === 'AbortError') throw e;
              console.error('[Composite/activities] risks failed:', e);
              if (!firstFatalError) firstFatalError = e;
            }

            console.log(`[Composite/activities] Result: ${successCount}/${totalSteps} steps succeeded`);

            if (successCount === 0 && firstFatalError) {
              console.error('[Composite/activities] ★ ALL STEPS FAILED — showing error modal');
              handleAIError(firstFatalError, 'compositeActivities');
              return;
            }

            setProjectData((prev: any) => {
              const savedData = { ...prev, ...newData };
              if (currentProjectId) {
                storageService.saveProject(savedData, language, currentProjectId)
                  .then(() => console.log(`[Composite/activities] ★ Explicit save — SUCCESS`))
                  .catch((e: any) => console.error(`[Composite/activities] ★ Explicit save failed:`, e));
              }
              return savedData;
            });
            setHasUnsavedTranslationChanges(true);
            console.log(`[Composite/activities] DONE — ${successCount}/${totalSteps} steps succeeded ✅`);

            if (successCount > 0 && successCount < totalSteps && firstFatalError) {
              const failedCount = totalSteps - successCount;
              const isRL = isRateLimitError(firstFatalError);
              setModalConfig({
                isOpen: true,
                title: language === 'si'
                  ? (isRL ? 'Omejitev API klicev' : 'Delna generacija aktivnosti')
                  : (isRL ? 'API Rate Limit Reached' : 'Partial Activities Generation'),
                message: language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalSteps} korakov.\n\n${failedCount} korakov ni uspelo${isRL ? ' zaradi omejitve API ponudnika.\n\nPočakajte 1–2 minuti in poskusite ponovno za manjkajoče dele, ali preklopite na drug model v Nastavitvah.' : '.\n\nPoskusite ponovno za manjkajoče dele.'}`
                  : `Successfully generated: ${successCount} of ${totalSteps} steps.\n\n${failedCount} steps failed${isRL ? ' due to API rate limits.\n\nWait 1–2 minutes and try again for missing parts, or switch models in Settings.' : '.\n\nTry again for missing parts.'}`,
                confirmText: language === 'si' ? 'V redu' : 'OK',
                secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
                cancelText: '',
                onConfirm: () => closeModal(),
                onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
                onCancel: () => closeModal(),
              });
            }

          } else {
            // ═══════════════════════════════════════════════
            // EXPECTED RESULTS COMPOSITE — with v7.7 smart merge
            // ═══════════════════════════════════════════════

            let successCount = 0;
            let skippedCount = 0;
            let lastError: any = null;

            let sectionsToProcess: { key: string; action: 'fill' | 'generate' | 'enhance' | 'regenerate'; emptyIndices: number[] }[] = [];

            if (mode === 'fill') {
              for (const s of allSections) {
                const status = sectionNeedsGeneration(s);
                if (status.needsFullGeneration) {
                  sectionsToProcess.push({ key: s, action: 'generate', emptyIndices: [] });
                } else if (status.needsFill) {
                  sectionsToProcess.push({ key: s, action: 'fill', emptyIndices: status.emptyIndices });
                }
              }

              if (sectionsToProcess.length === 0) {
                setModalConfig({
                  isOpen: true,
                  title: language === 'si' ? 'Vse je izpolnjeno' : 'Everything is filled',
                  message: language === 'si'
                    ? 'Vsi razdelki pričakovanih rezultatov so že izpolnjeni. Če želite izboljšati vsebino, uporabite možnost "Izboljšaj obstoječe".'
                    : 'All expected results sections are already filled. To improve content, use the "Enhance existing" option.',
                  confirmText: language === 'si' ? 'V redu' : 'OK',
                  secondaryText: '',
                  cancelText: '',
                  onConfirm: () => closeModal(),
                  onSecondary: null,
                  onCancel: () => closeModal(),
                });
                setIsLoading(false);
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
                return;
              }
            } else if (mode === 'enhance') {
              for (const s of allSections) {
                const status = sectionNeedsGeneration(s);
                if (!status.needsFullGeneration) {
                  sectionsToProcess.push({ key: s, action: 'enhance', emptyIndices: [] });
                }
              }
              if (sectionsToProcess.length === 0) {
                setModalConfig({
                  isOpen: true,
                  title: language === 'si' ? 'Ni vsebine za izboljšanje' : 'No content to enhance',
                  message: language === 'si'
                    ? 'Nobeden razdelek nima vsebine za izboljšanje. Uporabite možnost "Generiraj vse na novo".'
                    : 'No sections have content to enhance. Use the "Regenerate all" option.',
                  confirmText: language === 'si' ? 'V redu' : 'OK',
                  secondaryText: '',
                  cancelText: '',
                  onConfirm: () => closeModal(),
                  onSecondary: null,
                  onCancel: () => closeModal(),
                                  });
                setIsLoading(false);
                isGeneratingRef.current = false;
                abortControllerRef.current = null;
                return;
              }
            } else {
              sectionsToProcess = allSections.map(s => ({ key: s, action: 'regenerate' as const, emptyIndices: [] }));
            }

            const totalToProcess = sectionsToProcess.length;
            skippedCount = allSections.length - totalToProcess;

            const modeLabels: Record<string, { si: string; en: string }> = {
              fill: { si: 'Dopolnjujem', en: 'Filling' },
              generate: { si: 'Generiram', en: 'Generating' },
              enhance: { si: 'Izboljšujem', en: 'Enhancing' },
              regenerate: { si: 'Generiram na novo', en: 'Regenerating' },
            };

            const waitLabel = language === 'si' ? 'Čakam na API kvoto' : 'Waiting for API quota';

            for (let idx = 0; idx < sectionsToProcess.length; idx++) {
              if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');

              const { key: s, action, emptyIndices } = sectionsToProcess[idx];
              const label = modeLabels[action]?.[language] || modeLabels['generate'][language];
              const sectionLabel = s.charAt(0).toUpperCase() + s.slice(1);

              setIsLoading(`${label} ${sectionLabel} (${idx + 1}/${totalToProcess})...`);

              let success = false;
              let retries = 0;
              const maxRetries = 3;

              while (!success && retries <= maxRetries) {
                try {
                  let generatedData: any;

                  if (action === 'fill' && emptyIndices.length > 0) {
                    generatedData = await generateTargetedFill(
                      s, projectData, projectData[s], language, signal
                    );
                  } else {
                    const genMode = action === 'generate' ? 'regenerate' : action;
                    generatedData = await generateSectionContent(
                      s, projectData, language, genMode, null, signal
                    );
                  }

                  setProjectData((prev: any) => {
                    const next = { ...prev };
                    // ★ FIX: Auto-assign IDs for kers if missing
                    if (s === 'kers' && Array.isArray(generatedData)) {
                      generatedData = generatedData.map((item: any, idx: number) => ({
                        ...item,
                        id: item.id && item.id.trim() ? item.id : `KER${idx + 1}`,
                      }));
                    }
                    // ★ FIX: Auto-assign IDs for risks if missing
                    if (s === 'risks' && Array.isArray(generatedData)) {
                      generatedData = generatedData.map((item: any, idx: number) => ({
                        ...item,
                        id: (item.id && item.id.trim()) ? item.id : `RISK${idx + 1}`,
                      }));
                    }

                    // ★ v7.7 FIX: Unwrap + Smart merge for composite sections
                    var _compositeData = generatedData;

                    // Step 1: Unwrap if AI returned { outputs: [...] } instead of [...]
                    if (_compositeData && typeof _compositeData === 'object' && !Array.isArray(_compositeData)) {
                      var _wrappedArr = _compositeData[s];
                      if (Array.isArray(_wrappedArr)) {
                        console.log('[runComposite] ★ UNWRAP: extracted array from "' + s + '" wrapper (' + _wrappedArr.length + ' items)');
                        _compositeData = _wrappedArr;
                      } else {
                        // Try to find any nested array
                        var _anyArr = Object.values(_compositeData).find(function(v: any) { return Array.isArray(v) && v.length > 0; });
                        if (_anyArr) {
                          console.log('[runComposite] ★ UNWRAP: extracted nested array (' + (_anyArr as any[]).length + ' items) from "' + s + '"');
                          _compositeData = _anyArr;
                        }
                      }
                    }

                    // Step 2: Smart merge — don't overwrite existing content with empty AI items
                    if (Array.isArray(_compositeData) && Array.isArray(next[s]) && next[s].length > 0) {
                      next[s] = _smartMergeArray(next[s], _compositeData, s);
                    } else if (Array.isArray(_compositeData)) {
                      next[s] = _compositeData;
                    } else {
                      next[s] = _compositeData;
                    }

                    return next;
                  });
                  successCount++;
                  success = true;
                } catch (e: any) {
                  if (e.name === 'AbortError') throw e;

                  const emsg = e.message || '';
                  const isRateLimit = emsg.includes('429') || emsg.includes('Quota') || emsg.includes('rate limit') || emsg.includes('RESOURCE_EXHAUSTED');

                  if (isRateLimit && retries < maxRetries) {
                    retries++;
                    const waitSeconds = retries * 20;
                    console.warn(`[runComposite] Rate limit on ${s}, retry ${retries}/${maxRetries} in ${waitSeconds}s...`);
                    for (let countdown = waitSeconds; countdown > 0; countdown--) {
                      if (signal.aborted) throw new DOMException('Generation cancelled', 'AbortError');
                      setIsLoading(`${waitLabel}... ${countdown}s → ${sectionLabel}`);
                      await new Promise((r) => setTimeout(r, 1000));
                    }
                  } else {
                    console.error(`[runComposite] Failed to generate ${s}:`, e);
                    lastError = e;
                    break;
                  }
                }
              }

              if (success) {
                await new Promise((r) => setTimeout(r, 3000));
              }
            }

            if (successCount > 0) {
              setHasUnsavedTranslationChanges(true);
            }

            if (!lastError && successCount === totalToProcess) {
              if (skippedCount > 0) {
                const skippedNames = allSections
                  .filter(s => !sectionsToProcess.find(sp => sp.key === s))
                  .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                  .join(', ');

                setModalConfig({
                  isOpen: true,
                  title: language === 'si' ? 'Dopolnjevanje končano' : 'Fill complete',
                  message: language === 'si'
                    ? `Uspešno dopolnjeno: ${successCount} razdelkov.\n\nPreskočeni razdelki (že izpolnjeni): ${skippedNames}.`
                    : `Successfully filled: ${successCount} sections.\n\nSkipped sections (already complete): ${skippedNames}.`,
                  confirmText: language === 'si' ? 'V redu' : 'OK',
                  secondaryText: '',
                  cancelText: '',
                  onConfirm: () => closeModal(),
                  onSecondary: null,
                  onCancel: () => closeModal(),
                });
              }
            } else if (lastError && successCount < totalToProcess) {
              const failedCount = totalToProcess - successCount;
              const emsg = lastError.message || '';
              const isRateLimit = emsg.includes('429') || emsg.includes('Quota') || emsg.includes('rate limit') || emsg.includes('RESOURCE_EXHAUSTED');
              const isCredits = emsg.includes('afford') || emsg.includes('credits') || emsg.includes('402');
              const isJSON = emsg.includes('JSON') || emsg.includes('Unexpected token') || emsg.includes('parse');
              const isNetwork = emsg.includes('fetch') || emsg.includes('network') || emsg.includes('Failed to fetch') || emsg.includes('ERR_');

              let modalTitle: string;
              let modalMessage: string;

              if (isRateLimit) {
                modalTitle = language === 'si' ? 'Omejitev API klicev' : 'API Rate Limit Reached';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker je bil dosežen limit AI ponudnika.\n\nPočakajte 1–2 minuti in poskusite ponovno, ali preklopite na drug model v Nastavitvah.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to AI provider rate limits.\n\nWait 1–2 minutes and try again, or switch models in Settings.`;
              } else if (isCredits) {
                modalTitle = language === 'si' ? 'Nezadostna sredstva AI' : 'Insufficient AI Credits';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker vaš AI ponudnik nima dovolj sredstev.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to insufficient AI credits.`;
              } else if (isJSON) {
                modalTitle = language === 'si' ? 'Napaka formata' : 'Format Error';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati, ker je AI vrnil nepravilen format.\n\nPoskusite ponovno.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated because the AI returned an invalid format.\n\nPlease try again.`;
              } else if (isNetwork) {
                modalTitle = language === 'si' ? 'Omrežna napaka' : 'Network Error';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati zaradi omrežne napake.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated due to a network error.`;
              } else {
                modalTitle = language === 'si' ? 'Delna generacija' : 'Partial Generation';
                modalMessage = language === 'si'
                  ? `Uspešno generirano: ${successCount} od ${totalToProcess} razdelkov.\n\n${failedCount} razdelkov ni bilo mogoče generirati.`
                  : `Successfully generated: ${successCount} of ${totalToProcess} sections.\n\n${failedCount} sections could not be generated.`;
              }

              setModalConfig({
                isOpen: true,
                title: modalTitle,
                message: modalMessage,
                confirmText: language === 'si' ? 'V redu' : 'OK',
                secondaryText: language === 'si' ? 'Odpri nastavitve' : 'Open Settings',
                cancelText: '',
                onConfirm: () => closeModal(),
                onSecondary: () => { closeModal(); setIsSettingsOpen(true); },
                onCancel: () => closeModal(),
              });
            }
          }

        } catch (e: any) {
          if (e.name !== 'AbortError') {
            handleAIError(e, `compositeGeneration(${compositeSectionKey})`);
          }
        } finally {
          setIsLoading(false);
          isGeneratingRef.current = false;
          abortControllerRef.current = null;
        }
      };

  // ── Translation vs Generation decision ──
      const sectionLabel = isActivities
        ? (language === 'si' ? 'Aktivnosti' : 'Activities')
        : (language === 'si' ? 'Rezultati' : 'Results');

      if (isActivities) {
        if (hasContentInSections) {
          show3OptionModal(
            () => runComposite('enhance'),
            () => runComposite('fill'),
            () => runComposite('regenerate')
          );
        } else {
          runComposite('regenerate');
        }
        return;
      }

      // ── expectedResults: keep translation logic ──
      if (otherLangData && !hasContentInSections) {
        setModalConfig({
          isOpen: true,
          title: language === 'si'
            ? `${sectionLabel} obstajajo v ${otherLang}`
            : `${sectionLabel} exist in ${otherLang}`,
          message: language === 'si'
            ? `${sectionLabel} že obstajajo v ${otherLang} jeziku. Želite prevesti ali generirati na novo?`
            : `${sectionLabel} already exist in ${otherLang}. Would you like to translate or generate new?`,
          confirmText: language === 'si'
            ? `Prevedi iz ${otherLang}`
            : `Translate from ${otherLang}`,
          secondaryText: language === 'si' ? 'Generiraj novo' : 'Generate new',
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
          onConfirm: () => performTranslationFromOther(otherLangData),
          onSecondary: () => runComposite('regenerate'),
          onCancel: closeModal,
        });
      } else if (otherLangData && hasContentInSections) {
        setModalConfig({
          isOpen: true,
          title: language === 'si'
            ? `${sectionLabel} obstajajo v obeh jezikih`
            : `${sectionLabel} exist in both languages`,
          message: language === 'si'
            ? `${sectionLabel} obstajajo v slovenščini in angleščini. Kaj želite storiti?`
            : `${sectionLabel} exist in both SI and EN. What would you like to do?`,
          confirmText: language === 'si'
            ? 'Generiraj / izboljšaj trenutno'
            : 'Generate / enhance current',
          secondaryText: language === 'si'
            ? `Prevedi iz ${otherLang}`
            : `Translate from ${otherLang}`,
          cancelText: language === 'si' ? 'Prekliči' : 'Cancel',
          onConfirm: () => {
            closeModal();
            setTimeout(() => {
              show3OptionModal(
                () => runComposite('enhance'),
                () => runComposite('fill'),
                () => runComposite('regenerate')
              );
            }, 100);
          },
          onSecondary: () => performTranslationFromOther(otherLangData),
          onCancel: closeModal,
        });
      } else if (hasContentInSections) {
        show3OptionModal(
          () => runComposite('enhance'),
          () => runComposite('fill'),
          () => runComposite('regenerate')
        );
      } else {
        runComposite('regenerate');
      }
      },
    [
      ensureApiKey,
      robustCheckSectionHasContent,
      sectionNeedsGeneration,
      checkOtherLanguageHasContent,
      projectData,
      language,
      t,
      closeModal,
      setProjectData,
      setHasUnsavedTranslationChanges,
      setIsSettingsOpen,
      setModalConfig,
      handleAIError,
      performTranslationFromOther,
      show3OptionModal,
      preGenerationGuard,
      currentProjectId,
    ]
  );
  // ─── Single field generation ───────────────────────────────────

  const handleGenerateField = useCallback(
    async (path: (string | number)[]) => {
      if (!ensureApiKey()) {
        setIsSettingsOpen(true);
        return;
      }

      const fieldName = path[path.length - 1];
      setIsLoading(`${t.generating} ${String(fieldName)}...`);
      setError(null);

      const fieldAbort = new AbortController();
      abortControllerRef.current = fieldAbort;

      try {
        const fieldPathStr = path.map(String).join('.');
        console.log('[handleGenerateField] ▶ fieldPathStr:', fieldPathStr);
        const content = await generateFieldContent(fieldPathStr, projectData, language, fieldAbort.signal);
        console.log('[handleGenerateField] ◀ content:', JSON.stringify(content).substring(0, 300), '| type:', typeof content, '| length:', content?.length);
        handleUpdateData(path, content);
        console.log('[handleGenerateField] ✅ handleUpdateData DONE');

        try {
          if (currentProjectId) {
            const updatedData = set(projectData, path, content);
            await storageService.saveProject(updatedData, language, currentProjectId);
            console.log('[handleGenerateField] ★ Explicit save — SUCCESS');
          }
        } catch (saveErr) {
          console.error('[handleGenerateField] ★ Explicit save failed:', saveErr);
        }

      } catch (e: any) {
        if (e.name !== 'AbortError') {
          handleAIError(e, `generateField(${String(fieldName)})`);
        }

      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [ensureApiKey, projectData, language, t, handleUpdateData, setIsSettingsOpen, handleAIError, currentProjectId]
  );

  // ─── Summary generation ────────────────────────────────────────

  const runSummaryGeneration = useCallback(async () => {
    setIsGeneratingSummary(true);
    setSummaryText('');

    const summaryAbort = new AbortController();
    abortControllerRef.current = summaryAbort;

    try {
      const text = await generateProjectSummary(projectData, language, summaryAbort.signal);
      setSummaryText(text);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setSummaryText(
          language === 'si' ? 'Generiranje preklicano.' : 'Generation cancelled.'
        );
      } else {
        const msg = e.message || '';
        if (msg.includes('credits') || msg.includes('Quota') || msg.includes('afford')) {
          setSummaryText(
            language === 'si'
              ? 'Nezadostna sredstva AI. Dopolnite kredit ali zamenjajte model v Nastavitvah.'
              : 'Insufficient AI credits. Top up credits or switch model in Settings.'
          );
        } else {
          setSummaryText(
            language === 'si'
              ? 'Napaka pri generiranju povzetka. Poskusite ponovno.'
              : 'Error generating summary. Please try again.'
          );
        }
        console.error('[Summary Error]:', e);
      }
    } finally {
      setIsGeneratingSummary(false);
      abortControllerRef.current = null;
    }
  }, [projectData, language]);

  const handleExportSummary = useCallback(() => {
    setSummaryModalOpen(true);
    if (!summaryText) {
      runSummaryGeneration();
    }
  }, [summaryText, runSummaryGeneration]);

  const handleDownloadSummaryDocx = useCallback(async () => {
    try {
      const blob = await generateSummaryDocx(
        summaryText,
        projectData.projectIdea?.projectTitle,
        language
      );
      downloadBlob(
        blob,
        `Summary - ${projectData.projectIdea?.projectTitle || 'Project'}.docx`
      );
    } catch (e: any) {
      console.error(e);
      alert(
        language === 'si'
          ? 'Napaka pri generiranju DOCX datoteke.'
          : 'Failed to generate DOCX file.'
      );
    }
  }, [summaryText, projectData, language]);

  return {
    isLoading,
    setIsLoading,
    error,
    setError,
    summaryModalOpen,
    setSummaryModalOpen,
    summaryText,
    isGeneratingSummary,
    handleGenerateSection,
    handleGenerateCompositeSection,
    handleGenerateField,
    handleExportSummary,
    runSummaryGeneration,
    handleDownloadSummaryDocx,
    cancelGeneration,
  };
};
