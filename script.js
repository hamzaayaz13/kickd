(() => {
  const section = document.querySelector(".personas-section");
  const personaItems = Array.from(document.querySelectorAll(".persona"));
  const runSection = document.querySelector(".run-section");
  const featureGrid = runSection?.querySelector(".feature-grid") ?? null;

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const opacityStates = [
    [1, 0.42, 0.18, 0.07],
    [0.26, 1, 0.42, 0.18],
    [0.12, 0.28, 1, 0.42],
    [0.06, 0.14, 0.3, 1],
  ];

  const animationState = {
    activeIndex: 0,
    frameId: null,
  };
  const runScrollState = {
    frameId: null,
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
    if (animationState.frameId !== null) {
      return;
    }

    animationState.frameId = window.requestAnimationFrame(updateStage);
  };

  const requestRunSectionUpdate = () => {
    if (runScrollState.frameId !== null) {
      return;
    }

    runScrollState.frameId = window.requestAnimationFrame(updateRunSectionScroll);
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
})();
