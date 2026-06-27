(() => {
  const themeStorageKey = "kickd-theme";
  const themeLogo = document.querySelector(".theme-logo");
  const themeToggle = document.querySelector(".theme-toggle");
  const themeToggleText = document.querySelector(".theme-toggle__text");
  const themeColorMeta = document.querySelector("#theme-color-meta");
  const section = document.querySelector(".personas-section");
  const personaItems = Array.from(document.querySelectorAll(".persona"));
  const personaStageArt = document.querySelector(".persona-stage-art");
  const runSection = document.querySelector(".run-section");
  const featureGrid = runSection?.querySelector(".feature-grid") ?? null;

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = [
    ...document.querySelectorAll(
      ".hero__copy h1, .hero__copy p, .download-row, .hero__visual, .score-section h2, .bento-card, .run-section h2, .feature-card, .personas-scene > h2, .persona-list, .persona-phone-stage, .footer-nav-shell, .footer-mobile-card",
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
    activeIndex: 0,
    frameId: null,
  };
  const runScrollState = {
    frameId: null,
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

  const calculateStage = () => {
    if (!section) {
      return 0;
    }

    const sectionTop = section.getBoundingClientRect().top;
    const scrollableDistance = Math.max(1, section.offsetHeight - window.innerHeight);
    const progress = clamp(-sectionTop / scrollableDistance, 0, 0.9999);
    return Math.min(opacityStates.length - 1, Math.floor(progress * opacityStates.length));
  };

  const updateStage = () => {
    const nextIndex = calculateStage();

    if (nextIndex !== animationState.activeIndex || reducedMotionQuery.matches) {
      applyStage(nextIndex);
    }

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
    applyStage(calculateStage());
    requestStageUpdate();
    window.addEventListener("scroll", requestStageUpdate, { passive: true });
    window.addEventListener("resize", requestStageUpdate);
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
