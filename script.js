(() => {
  const section = document.querySelector(".personas-section");
  const stage = document.querySelector(".persona-phone-stage");
  const buttons = Array.from(document.querySelectorAll(".persona"));
  const entries = Array.from(document.querySelectorAll(".chat-entry"));

  if (!section || !stage || buttons.length === 0 || entries.length === 0) {
    return;
  }

  const personaOrder = buttons.map((button) => button.dataset.persona);
  const state = {
    activeIndex: 0,
  };

  const setActivePersona = (index) => {
    const nextIndex = Math.max(0, Math.min(personaOrder.length - 1, index));

    if (nextIndex === state.activeIndex) {
      return;
    }

    state.activeIndex = nextIndex;

    buttons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === nextIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    entries.forEach((entry, entryIndex) => {
      entry.classList.toggle("is-visible", entryIndex <= nextIndex);
    });
  };

  const updateFromScroll = () => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const viewportHeight = window.innerHeight;
    const travelDistance = Math.max(1, sectionHeight - viewportHeight);
    const progress = (window.scrollY - sectionTop) / travelDistance;
    const clamped = Math.max(0, Math.min(1, progress));
    const nextIndex = Math.round(clamped * (personaOrder.length - 1));

    setActivePersona(nextIndex);
  };

  const scrollToPersona = (index) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const viewportHeight = window.innerHeight;
    const travelDistance = Math.max(1, sectionHeight - viewportHeight);
    const targetScroll = sectionTop + (travelDistance * index) / Math.max(1, personaOrder.length - 1);

    window.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      scrollToPersona(index);
    });
  });

  window.addEventListener("scroll", updateFromScroll, { passive: true });
  window.addEventListener("resize", updateFromScroll, { passive: true });

  entries.forEach((entry, index) => {
    if (index === 0) {
      entry.classList.add("is-visible");
    } else {
      entry.classList.remove("is-visible");
    }
  });

  buttons.forEach((button, index) => {
    button.classList.toggle("is-active", index === 0);
    button.setAttribute("aria-selected", String(index === 0));
  });

  state.activeIndex = 0;
  updateFromScroll();
})();
