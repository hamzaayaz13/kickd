(() => {
  const themeStorageKey = "kickd-theme";
  const themeLogo = document.querySelector(".theme-logo");
  const themeToggle = document.querySelector(".theme-toggle");
  const themeToggleText = document.querySelector(".theme-toggle__text");
  const themeColorMeta = document.querySelector("#theme-color-meta");
  const section = document.querySelector(".personas-section");
  const personaScene = document.querySelector(".personas-scene");
  const personaTitle = document.querySelector(".personas-scene > h2");
  const personaItems = Array.from(document.querySelectorAll(".persona"));
  const personaList = document.querySelector(".persona-list");
  const personaPhoneStage = document.querySelector(".persona-phone-stage");
  const personaStageArt = document.querySelector(".persona-stage-art");
  const personaTicker = document.querySelector(".persona-ticker");
  const personaFinale = document.querySelector(".persona-finale");
  const runSection = document.querySelector(".run-section");
  const featureGrid = runSection?.querySelector(".feature-grid") ?? null;

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = [
    ...document.querySelectorAll(
      ".hero__copy h1, .hero__copy p, .download-row, .hero__visual, .score-section h2, .bento-card, .run-section h2, .feature-card, .footer-nav-shell, .footer-mobile-card",
    ),
  ];

  const opacityStates = [
    [1, 0.42, 0.18, 0.07],
    [0.26, 1, 0.42, 0.18],
    [0.12, 0.28, 1, 0.42],
    [0.06, 0.14, 0.3, 1],
  ];
  const personaStageSources = [
    "/assets/images/persona-step-1.svg",
    "/assets/images/persona-step-2.svg",
    "/assets/images/persona-step-3.svg",
    "/assets/images/persona-step-4.svg",
  ];

  const animationState = {
    activeIndex: -1,
    frameId: null,
    progress: 0,
  };
  const runScrollState = {
    frameId: null,
  };
  const personaMetrics = {
    shiftX: 0,
    shiftY: 0,
    finalScale: 1,
    finaleTop: 0,
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const applyTheme = (theme) => {
    const resolvedTheme = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = resolvedTheme;
    localStorage.setItem(themeStorageKey, resolvedTheme);

    const isDark = resolvedTheme === "dark";
    if (themeLogo) {
      themeLogo.setAttribute("aria-pressed", String(isDark));
      themeLogo.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    }

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    }

    if (themeToggleText) {
      themeToggleText.textContent = isDark ? "Dark mode" : "Light mode";
    }

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", isDark ? "#292C32" : "#ffffff");
    }
  };

  const toggleTheme = () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  };

  const initialTheme = localStorage.getItem(themeStorageKey) ?? "light";
  applyTheme(initialTheme);

  themeLogo?.addEventListener("click", toggleTheme);
  themeToggle?.addEventListener("click", toggleTheme);

  const applyStage = (activeIndex) => {
    const stageIndex = Math.max(0, Math.min(opacityStates.length - 1, activeIndex));
    const opacities = opacityStates[stageIndex];

    personaItems.forEach((item, index) => {
      const isActive = index === stageIndex;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
      item.setAttribute("aria-current", isActive ? "true" : "false");
      item.style.setProperty("--persona-opacity", String(opacities[index]));
    });

    if (personaStageArt) {
      const nextSource = personaStageSources[stageIndex] ?? personaStageSources[0];
      if (personaStageArt.getAttribute("src") !== nextSource) {
        personaStageArt.setAttribute("src", nextSource);
      }
    }

    animationState.activeIndex = stageIndex;
  };

  const calculatePersonaProgress = () => {
    if (!section) {
      return 0;
    }

    const sectionTop = section.getBoundingClientRect().top;
    const scrollableDistance = Math.max(1, section.offsetHeight - window.innerHeight);
    return clamp(-sectionTop / scrollableDistance, 0, 1);
  };

  const setPersonaVars = ({
    titleOpacity = 1,
    listOpacity = 1,
    panelOpacity = 1,
    shiftX = 0,
    shiftY = 0,
    scale = 1,
    tickerOpacity = 0,
    finaleOpacity = 0,
    finaleShift = 34,
    finaleTop = personaMetrics.finaleTop || 0,
  }) => {
    if (!section) {
      return;
    }

    section.style.setProperty("--persona-title-opacity", String(titleOpacity));
    section.style.setProperty("--persona-list-opacity", String(listOpacity));
    section.style.setProperty("--persona-panel-opacity", String(panelOpacity));
    section.style.setProperty("--persona-phone-shift-x", `${shiftX}px`);
    section.style.setProperty("--persona-phone-shift-y", `${shiftY}px`);
    section.style.setProperty("--persona-phone-scale", String(scale));
    section.style.setProperty("--persona-ticker-opacity", String(tickerOpacity));
    section.style.setProperty("--persona-finale-opacity", String(finaleOpacity));
    section.style.setProperty("--persona-finale-shift", `${finaleShift}px`);
    section.style.setProperty("--persona-finale-top", `${finaleTop}px`);

    if (personaPhoneStage) {
      personaPhoneStage.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0) scale(${scale})`;
    }

    if (personaTicker) {
      personaTicker.style.opacity = String(tickerOpacity);
    }

    if (personaFinale) {
      personaFinale.style.opacity = String(finaleOpacity);
      personaFinale.style.top = `${finaleTop}px`;
      personaFinale.style.transform = `translate3d(-50%, ${finaleShift}px, 0)`;
    }
  };

  const easeOutCubic = (value) => 1 - (1 - value) ** 3;
  const easeInOutCubic = (value) =>
    value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

  const measurePersonaTargets = () => {
    if (!section || !personaScene || !personaPhoneStage || !personaStageArt) {
      return;
    }

    const savedProgress = animationState.progress;
    setPersonaVars({});

    const sceneRect = personaScene.getBoundingClientRect();
    const artRect = personaStageArt.getBoundingClientRect();
    const artCenterX = artRect.left - sceneRect.left + artRect.width / 2;
    const artCenterY = artRect.top - sceneRect.top + artRect.height / 2;
    const targetCenterX = window.innerWidth / 2;
    const targetCenterY = mobileQuery.matches ? window.innerHeight * 0.31 : window.innerHeight * 0.3;
    const targetRelativeX = targetCenterX - sceneRect.left;

    personaMetrics.shiftX = targetRelativeX - artCenterX;
    personaMetrics.shiftY = targetCenterY - artCenterY;
    personaMetrics.finalScale = mobileQuery.matches ? 0.62 : window.innerWidth <= 1100 ? 0.52 : 0.47;
    personaMetrics.finaleTop = targetCenterY + (artRect.height * personaMetrics.finalScale) / 2 + 80;

    animationState.progress = savedProgress;
    setPersonaVars({});
  };

  const updatePersonaSequence = () => {
    const progress = calculatePersonaProgress();
    const storyProgress = clamp(progress / 0.62, 0, 0.9999);
    const stageIndex = Math.min(opacityStates.length - 1, Math.floor(storyProgress * opacityStates.length));

    if (stageIndex !== animationState.activeIndex || reducedMotionQuery.matches) {
      applyStage(stageIndex);
    }

    const exitProgress = easeInOutCubic(clamp((progress - 0.62) / 0.18, 0, 1));
    const finaleProgress = easeOutCubic(clamp((progress - 0.81) / 0.09, 0, 1));
    const tickerProgress = easeOutCubic(clamp((progress - 0.88) / 0.08, 0, 1));

    setPersonaVars({
      titleOpacity: 1 - clamp((progress - 0.62) / 0.1, 0, 1),
      listOpacity: 1 - exitProgress,
      panelOpacity: 1 - exitProgress,
      shiftX: personaMetrics.shiftX * exitProgress,
      shiftY: personaMetrics.shiftY * exitProgress,
      scale: 1 - (1 - personaMetrics.finalScale) * exitProgress,
      tickerOpacity: tickerProgress,
      finaleOpacity: finaleProgress,
      finaleShift: 44 - 44 * finaleProgress,
      finaleTop: personaMetrics.finaleTop,
    });

    if (personaTicker) {
      personaTicker.setAttribute("aria-hidden", tickerProgress < 0.05 ? "true" : "false");
    }

    if (personaFinale) {
      personaFinale.setAttribute("aria-hidden", finaleProgress < 0.1 ? "true" : "false");
    }

    if (personaTitle) {
      personaTitle.setAttribute("aria-hidden", progress > 0.72 ? "true" : "false");
    }

    if (personaList) {
      personaList.setAttribute("aria-hidden", progress > 0.72 ? "true" : "false");
    }

    animationState.progress = progress;
  };

  const updateStage = () => {
    updatePersonaSequence();
    animationState.frameId = null;
  };

  const syncRunSectionHeight = () => {
    if (!runSection || !featureGrid) {
      return;
    }

    if (!mobileQuery.matches) {
      runSection.style.removeProperty("--run-mobile-track-height");
      featureGrid.scrollLeft = 0;
      return;
    }

    const horizontalDistance = Math.max(0, featureGrid.scrollWidth - featureGrid.clientWidth);
    const sectionHeight = Math.max(window.innerHeight, window.innerHeight + horizontalDistance);
    runSection.style.setProperty("--run-mobile-track-height", `${sectionHeight}px`);
  };

  const updateRunSectionScroll = () => {
    if (!runSection || !featureGrid) {
      return;
    }

    if (!mobileQuery.matches) {
      runScrollState.frameId = null;
      featureGrid.scrollLeft = 0;
      return;
    }

    const maxScrollLeft = Math.max(0, featureGrid.scrollWidth - featureGrid.clientWidth);
    const scrollableDistance = Math.max(1, runSection.offsetHeight - window.innerHeight);
    const sectionTop = runSection.getBoundingClientRect().top;
    const progress = clamp(-sectionTop / scrollableDistance, 0, 1);

    featureGrid.scrollLeft = progress * maxScrollLeft;
    runScrollState.frameId = null;
  };

  const requestStageUpdate = () => {
    updateStage();
  };

  const requestRunSectionUpdate = () => {
    if (runScrollState.frameId !== null) {
      return;
    }

    runScrollState.frameId = window.requestAnimationFrame(updateRunSectionScroll);
  };

  const setupRevealAnimations = () => {
    if (!revealTargets.length) {
      return;
    }

    revealTargets.forEach((element, index) => {
      element.classList.add("reveal-on-scroll");
      element.style.setProperty("--reveal-delay", `${Math.min(index * 45, 220)}ms`);
    });

    if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
      revealTargets.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealTargets.forEach((element) => observer.observe(element));
  };

  if (section && personaItems.length === 4) {
    measurePersonaTargets();
    updatePersonaSequence();
    requestStageUpdate();
    window.addEventListener("scroll", requestStageUpdate, { passive: true });
    window.addEventListener("resize", () => {
      measurePersonaTargets();
      requestStageUpdate();
    });
    mobileQuery.addEventListener("change", () => {
      measurePersonaTargets();
      requestStageUpdate();
    });
    reducedMotionQuery.addEventListener("change", requestStageUpdate);
  }

  if (runSection && featureGrid) {
    syncRunSectionHeight();
    requestRunSectionUpdate();
    window.addEventListener("scroll", requestRunSectionUpdate, { passive: true });
    window.addEventListener("resize", syncRunSectionHeight);
    window.addEventListener("resize", requestRunSectionUpdate);
    mobileQuery.addEventListener("change", syncRunSectionHeight);
    mobileQuery.addEventListener("change", requestRunSectionUpdate);
  }

  setupRevealAnimations();
})();
