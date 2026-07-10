(() => {
  const themeColorMeta = document.querySelector("#theme-color-meta");
  const introSection = document.querySelector(".section-reveal");
  const impactLine = document.querySelector(".impact-line");
  const revealIntro = introSection?.querySelector(".section-reveal__intro") ?? null;
  const revealPanelTop = introSection?.querySelector(".section-reveal__panel--top") ?? null;
  const revealPanelBottom = introSection?.querySelector(".section-reveal__panel--bottom") ?? null;
  const scoreRunGroup = document.querySelector(".score-run-group");
  const section = document.querySelector(".personas-section");
  const personaItems = Array.from(document.querySelectorAll(".persona"));
  const personaList = section?.querySelector(".persona-list") ?? null;
  const personaStageArt = document.querySelector(".persona-stage-art");
  const runSection = document.querySelector(".run-section");
  const runWrap = runSection?.querySelector(".wrap") ?? null;
  const featureGrid = runSection?.querySelector(".feature-grid") ?? null;
  const runCards = featureGrid ? Array.from(featureGrid.querySelectorAll(".feature-card")) : [];

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const runStoryQuery = window.matchMedia("(min-width: 320px) and (max-width: 480px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = [
    ...document.querySelectorAll(
      ".hero__copy h1, .hero__copy p, .download-row, .hero__visual, .impact-line, .score-section h2, .bento-card, .run-section h2, .feature-card, .personas-scene > h2, .persona-list, .persona-phone-stage, .footer-nav-shell, .footer-mobile-card",
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
  const personaScrollState = {
    frameId: null,
  };
  let personaStoryTrigger = null;
  let personaTickerId = null;
  let sectionRevealTrigger = null;
  const runStoryState = {
    frameId: null,
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const setupSectionReveal = () => {
    if (sectionRevealTrigger) {
      sectionRevealTrigger.kill();
      sectionRevealTrigger = null;
    }

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", "#ffffff");
    }

    if (!introSection || !revealIntro || !revealPanelTop || !revealPanelBottom || !scoreRunGroup) {
      return;
    }

    if (reducedMotionQuery.matches || !window.gsap || !window.ScrollTrigger) {
      scoreRunGroup.style.removeProperty("transform");
      scoreRunGroup.style.removeProperty("opacity");
      return;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    gsap.set(scoreRunGroup, { y: "24vh", opacity: 0 });
    gsap.set(revealIntro, { opacity: 1, y: "0%" });
    gsap.set(revealPanelTop, { scaleY: 0 });
    gsap.set(revealPanelBottom, { scaleY: 0 });

    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "kickd-section-reveal",
        trigger: introSection,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    timeline.to(
      revealIntro,
      {
        opacity: 0,
        y: "-6%",
        duration: 0.2,
        ease: "power1.in",
      },
      0.22,
    );

    timeline.to(
      revealPanelTop,
      {
        scaleY: 1,
        duration: 0.42,
        ease: "power2.inOut",
      },
      0.26,
    );

    timeline.to(
      revealPanelBottom,
      {
        scaleY: 1,
        duration: 0.42,
        ease: "power2.inOut",
      },
      0.26,
    );

    timeline.to(
      scoreRunGroup,
      {
        y: "0vh",
        opacity: 1,
        duration: 0.36,
        ease: "power2.out",
      },
      0.6,
    );

    sectionRevealTrigger = timeline.scrollTrigger;
  };

  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", "#ffffff");
  }

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

  const syncPersonaSectionHeight = () => {
    if (!section || !personaItems.length || !personaList) {
      return;
    }

    if (!mobileQuery.matches) {
      section.style.removeProperty("--persona-mobile-track-height");
      personaList.scrollLeft = 0;
      return;
    }

    const horizontalDistance = Math.max(0, personaList.scrollWidth - personaList.clientWidth);
    const sectionHeight = Math.max(window.innerHeight, window.innerHeight + horizontalDistance);
    section.style.setProperty("--persona-mobile-track-height", `${sectionHeight}px`);
    window.ScrollTrigger?.refresh();
  };

  const applyPersonaProgress = (progress) => {
    if (!personaItems.length || !personaList) {
      return;
    }

    const normalizedProgress = clamp(progress, 0, 1);
    const maxScrollLeft = Math.max(0, personaList.scrollWidth - personaList.clientWidth);
    const activeIndex = Math.min(
      personaItems.length - 1,
      Math.floor(clamp(normalizedProgress, 0, 0.9999) * personaItems.length),
    );
    const snappedScrollLeft =
      personaItems.length > 1 ? (maxScrollLeft / (personaItems.length - 1)) * activeIndex : 0;

    personaList.scrollLeft = snappedScrollLeft;
    applyStage(activeIndex);
  };

  const updatePersonaSectionScroll = () => {
    if (!section || !personaItems.length || !personaList) {
      return;
    }

    if (!mobileQuery.matches) {
      personaScrollState.frameId = null;
      return;
    }

    const scrollableDistance = Math.max(1, section.offsetHeight - window.innerHeight);
    const sectionTop = section.getBoundingClientRect().top;
    const progress = clamp(-sectionTop / scrollableDistance, 0, 1);

    applyPersonaProgress(progress);
    personaScrollState.frameId = null;
  };

  const setupPersonaStory = () => {
    if (!section || !personaItems.length || !personaList) {
      return;
    }

    if (personaStoryTrigger) {
      personaStoryTrigger.kill();
      personaStoryTrigger = null;
    }

    if (!mobileQuery.matches || reducedMotionQuery.matches || !window.gsap || !window.ScrollTrigger) {
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);

    personaStoryTrigger = window.ScrollTrigger.create({
      id: "kickd-persona-story",
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => applyPersonaProgress(self.progress),
      onRefresh: (self) => applyPersonaProgress(self.progress),
    });
  };

  const stopPersonaTicker = () => {
    if (personaTickerId !== null) {
      window.clearInterval(personaTickerId);
      personaTickerId = null;
    }
  };

  const startPersonaTicker = () => {
    stopPersonaTicker();

    if (!mobileQuery.matches || reducedMotionQuery.matches) {
      return;
    }

    updatePersonaSectionScroll();
    personaTickerId = window.setInterval(updatePersonaSectionScroll, 80);
  };

  const requestStageUpdate = () => {
    if (mobileQuery.matches) {
      updatePersonaSectionScroll();
      return;
    }

    updateStage();
  };

  const teardownRunStory = () => {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.getAll()
        .filter((trigger) => trigger.vars?.id === "kickd-run-story")
        .forEach((trigger) => trigger.kill());
    }

    if (runStoryState.frameId !== null) {
      window.cancelAnimationFrame(runStoryState.frameId);
      runStoryState.frameId = null;
    }

    runSection?.classList.remove("run-section--story-active", "run-section--story-static");

    if (featureGrid) {
      featureGrid.style.removeProperty("height");
    }

    if (runSection) {
      runSection.style.removeProperty("--run-mobile-track-height");
      delete runSection.dataset.runStoryProgress;
    }

    if (runCards.length && window.gsap) {
      window.gsap.set(runCards, {
        clearProps: "transform,opacity,visibility,willChange,zIndex",
      });
    }
  };

  const syncRunStoryHeight = () => {
    if (!runSection) {
      return;
    }

    if (!runStoryQuery.matches || reducedMotionQuery.matches) {
      runSection.style.removeProperty("--run-mobile-track-height");
      return;
    }

    const viewportHeight = window.innerHeight || 0;
    const cardHeight = featureGrid?.offsetHeight || 430;
    const trackHeight = Math.max(viewportHeight + Math.max(300, cardHeight * 0.72), 1080);
    runSection.style.setProperty("--run-mobile-track-height", `${Math.round(trackHeight)}px`);
  };

  const applyRunStoryProgress = (progress) => {
    if (runCards.length !== 3 || !window.gsap) {
      return;
    }

    const gsap = window.gsap;
    const [cardOne, cardTwo, cardThree] = runCards;
    const p = clamp(progress, 0, 1);
    const blend = (value, inMin, inMax) => clamp((value - inMin) / Math.max(0.0001, inMax - inMin), 0, 1);

    if (p < 0.1) {
      gsap.set(cardOne, { y: 0, scale: 1, autoAlpha: 1, zIndex: 3 });
      gsap.set(cardTwo, { y: 90, scale: 1, autoAlpha: 0, zIndex: 4 });
      gsap.set(cardThree, { y: 90, scale: 1, autoAlpha: 0, zIndex: 5 });
      return;
    }

    if (p < 0.36) {
      const t = blend(p, 0.1, 0.36);
      gsap.set(cardOne, { y: -20 * t, scale: 1 - 0.034 * t, autoAlpha: 1 - t, zIndex: 3 });
      gsap.set(cardTwo, { y: 90 * (1 - t), scale: 1, autoAlpha: t, zIndex: 5 });
      gsap.set(cardThree, { y: 90, scale: 1, autoAlpha: 0, zIndex: 4 });
      return;
    }

    if (p < 0.48) {
      gsap.set(cardOne, { y: -20, scale: 0.966, autoAlpha: 0, zIndex: 2 });
      gsap.set(cardTwo, { y: 0, scale: 1, autoAlpha: 1, zIndex: 5 });
      gsap.set(cardThree, { y: 90, scale: 1, autoAlpha: 0, zIndex: 4 });
      return;
    }

    if (p < 0.74) {
      const t = blend(p, 0.48, 0.74);
      gsap.set(cardOne, { y: -20, scale: 0.966, autoAlpha: 0, zIndex: 2 });
      gsap.set(cardTwo, { y: -20 * t, scale: 1 - 0.034 * t, autoAlpha: 1 - t, zIndex: 4 });
      gsap.set(cardThree, { y: 90 * (1 - t), scale: 1, autoAlpha: t, zIndex: 6 });
      return;
    }

    gsap.set(cardOne, { y: -20, scale: 0.966, autoAlpha: 0, zIndex: 2 });
    gsap.set(cardTwo, { y: -20, scale: 0.966, autoAlpha: 0, zIndex: 3 });
    gsap.set(cardThree, { y: 0, scale: 1, autoAlpha: 1, zIndex: 6 });
  };

  const updateRunStoryScroll = () => {
    if (!runSection || runCards.length !== 3) {
      runStoryState.frameId = null;
      return;
    }

    if (!runStoryQuery.matches || reducedMotionQuery.matches) {
      runStoryState.frameId = null;
      return;
    }

    const scrollableDistance = Math.max(1, runSection.offsetHeight - window.innerHeight);
    const sectionTop = runSection.getBoundingClientRect().top;
    const progress = clamp(-sectionTop / scrollableDistance, 0, 1);
    runSection.dataset.runStoryProgress = progress.toFixed(3);
    applyRunStoryProgress(progress);
    runStoryState.frameId = null;
  };

  const requestRunStoryUpdate = () => {
    if (runStoryState.frameId !== null) {
      return;
    }

    runStoryState.frameId = window.requestAnimationFrame(updateRunStoryScroll);
  };

  const setupRunStory = () => {
    if (!runSection || !runWrap || !featureGrid || runCards.length !== 3) {
      return;
    }

    runCards.forEach((card) => card.classList.add("is-visible"));
    teardownRunStory();

    if (!runStoryQuery.matches) {
      return;
    }

    if (reducedMotionQuery.matches || !window.gsap) {
      runSection.classList.add("run-section--story-static");
      return;
    }

    runSection.classList.add("run-section--story-active");
    syncRunStoryHeight();
    applyRunStoryProgress(0);
    updateRunStoryScroll();
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

  if (section && personaItems.length === 4 && personaList) {
    syncPersonaSectionHeight();
    applyStage(calculateStage());
    setupPersonaStory();
    startPersonaTicker();
    requestStageUpdate();
    window.addEventListener("scroll", requestStageUpdate, { passive: true });
    window.addEventListener("resize", syncPersonaSectionHeight);
    window.addEventListener("resize", setupPersonaStory);
    window.addEventListener("resize", startPersonaTicker);
    window.addEventListener("resize", requestStageUpdate);
    mobileQuery.addEventListener("change", syncPersonaSectionHeight);
    mobileQuery.addEventListener("change", setupPersonaStory);
    mobileQuery.addEventListener("change", startPersonaTicker);
    mobileQuery.addEventListener("change", requestStageUpdate);
    reducedMotionQuery.addEventListener("change", setupPersonaStory);
    reducedMotionQuery.addEventListener("change", startPersonaTicker);
    reducedMotionQuery.addEventListener("change", requestStageUpdate);
  }

  if (introSection && impactLine && scoreRunGroup) {
    setupSectionReveal();
    window.addEventListener("resize", setupSectionReveal);
    reducedMotionQuery.addEventListener("change", setupSectionReveal);
  }

  if (runSection && featureGrid) {
    setupRunStory();
    syncRunStoryHeight();
    window.addEventListener("scroll", requestRunStoryUpdate, { passive: true });
    window.addEventListener("resize", setupRunStory);
    window.addEventListener("resize", syncRunStoryHeight);
    window.addEventListener("resize", requestRunStoryUpdate);
    runStoryQuery.addEventListener("change", setupRunStory);
    runStoryQuery.addEventListener("change", syncRunStoryHeight);
    reducedMotionQuery.addEventListener("change", setupRunStory);
    reducedMotionQuery.addEventListener("change", syncRunStoryHeight);
  }

  setupRevealAnimations();
})();
