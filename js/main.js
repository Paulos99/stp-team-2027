(() => {
  "use strict";

  const CONFIG = {
    formUrl: "https://forms.yandex.ru/cloud/6b053cd2b9e5ca32023d131e",
    loaderDuration: 1800,
    applicationsOpenAt: Date.parse("2026-12-01T00:00:00+03:00"),
  };

  const root = document.documentElement;
  const battleFrame = document.querySelector("#sound-battle-frame");
  const application = document.querySelector("#join");
  window.addEventListener("message", (event) => {
    if (!battleFrame || event.source !== battleFrame.contentWindow) return;
    const message = event.data;
    if (message?.source !== "stp-sound-battle" || message.version !== 1) return;
    if (message.action === "skip" || message.action === "apply") {
      const applyButton = application?.querySelector("[data-apply]");
      if (applyButton && !applyButton.hidden) applyButton.focus({ preventScroll: true });
      application?.scrollIntoView({ block: "start" });
    }
  });
  const body = document.body;
  const hero = document.querySelector(".hero");
  const heroScroll = document.querySelector("[data-hero-scroll]");
  const menuToggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".site-menu");
  const applyButtons = document.querySelectorAll("[data-apply]");
  const primaryApply = document.querySelector(".hero .apply-button");
  const scrollRevealItems = document.querySelectorAll("[data-scroll-reveal]");
  const faqItems = document.querySelectorAll(".faq__item");
  const aboutVisual = document.querySelector("[data-about-visual]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = window.matchMedia("(max-width: 900px)").matches;
  const connection = navigator.connection;
  const saveData = connection?.saveData === true;
  const weakLink = ["slow-2g", "2g"].includes(connection?.effectiveType);
  const lowMemory = Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 2;
  const lowCores = Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 2;
  const lite = compact && (saveData || weakLink || lowMemory || lowCores || reduceMotion);
  if (lite) root.classList.add("is-lite");

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const rangeProgress = (value, start, end) => clamp((value - start) / (end - start));
  const smooth = (value) => value * value * (3 - 2 * value);

  const finishLoading = () => root.classList.add("is-ready");

  if (reduceMotion) {
    finishLoading();
  } else if (lite || saveData) {
    const reveal = () => window.setTimeout(finishLoading, 450);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reveal, { once: true });
    else reveal();
    window.setTimeout(finishLoading, 2000);
  } else {
    window.addEventListener("load", () => window.setTimeout(finishLoading, CONFIG.loaderDuration), { once: true });
    window.setTimeout(finishLoading, 4200);
  }

  if (battleFrame?.dataset.src) {
    const loadBattle = () => {
      if (!battleFrame.getAttribute("src")) battleFrame.src = battleFrame.dataset.src;
    };
    if ("IntersectionObserver" in window) {
      const battleObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        loadBattle();
        battleObserver.disconnect();
      }, { rootMargin: "480px 0px" });
      battleObserver.observe(battleFrame);
    } else {
      loadBattle();
    }
  }

  const setMenu = (open) => {
    body.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    if (open) menu.querySelector("a, button")?.focus();
    else menuToggle.focus();
  };

  menuToggle.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  document.addEventListener("click", (event) => {
    if (!body.classList.contains("menu-open")) return;
    if (menu.contains(event.target) || menuToggle.contains(event.target)) return;
    setMenu(false);
  });

  const siteHeader = document.querySelector(".site-header");
  const sectionLinks = [...menu.querySelectorAll('a[href^="#"]')];
  const updateNavigation = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 40);
    let current = "main";
    for (const link of sectionLinks) {
      const section = document.querySelector(link.getAttribute("href"));
      if (section && section.getBoundingClientRect().top <= window.innerHeight * .38) current = section.id;
    }
    sectionLinks.forEach((link) => {
      if (link.hash === `#${current}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  window.addEventListener("scroll", updateNavigation, { passive: true });
  updateNavigation();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("menu-open")) setMenu(false);
  });

  const getAboutDocumentTop = (about) => {
    const heroScroll = document.querySelector("[data-hero-scroll]");
    if (!heroScroll) return about.getBoundingClientRect().top + window.scrollY;
    const overlap = Number.parseFloat(window.getComputedStyle(about).marginTop) || 0;
    return heroScroll.getBoundingClientRect().bottom + window.scrollY + overlap;
  };

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", (event) => {
    if (link.hash === "#about") {
      const about = document.querySelector("#about");
      if (about) {
        event.preventDefault();
        if (window.location.hash !== link.hash) window.history.pushState(null, "", link.hash);
        setMenu(false);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: getAboutDocumentTop(about), behavior: reduceMotion ? "auto" : "smooth" });
          });
        });
        return;
      }
    }
    setMenu(false);
  }));

  const setFocusScene = (active) => hero.classList.toggle("is-focused", active);
  const battleSection = document.querySelector("#sound-battle");
  let overviewFrame = 0;
  let stopOverview = () => {};
  const playOverview = () => {
    stopOverview();
    const rootStyle = document.documentElement.style;
    const previousBehavior = rootStyle.scrollBehavior;
    rootStyle.scrollBehavior = "auto";
    const start = window.scrollY;
    const target = Math.max(0, battleSection.getBoundingClientRect().top + start);
    const distance = target - start;
    const finish = () => {
      window.cancelAnimationFrame(overviewFrame);
      rootStyle.scrollBehavior = previousBehavior;
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
      stopOverview = () => {};
    };
    stopOverview = finish;
    if (reduceMotion || Math.abs(distance) < 4) {
      window.scrollTo(0, target);
      finish();
      return;
    }
    const duration = Math.min(20000, Math.max(6500, Math.abs(distance) / 0.26));
    const started = performance.now();
    const ignoreUntil = started + 700;
    const ease = (progress) => {
      const edge = 0.14;
      const sine = (value) => 0.5 - Math.cos(Math.PI * value) / 2;
      if (progress < edge) return sine(progress / edge) * edge;
      if (progress > 1 - edge) return 1 - edge + sine((progress - (1 - edge)) / edge) * edge;
      return progress;
    };
    function onUserScroll() {
      if (performance.now() < ignoreUntil) return;
      window.cancelAnimationFrame(overviewFrame);
      finish();
    }
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      window.scrollTo(0, start + distance * ease(progress));
      if (progress < 1) overviewFrame = window.requestAnimationFrame(frame);
      else {
        if (window.location.hash !== "#sound-battle") window.history.pushState(null, "", "#sound-battle");
        finish();
      }
    };
    overviewFrame = window.requestAnimationFrame(frame);
  };
  primaryApply.addEventListener("click", () => {
    if (!battleSection) return;
    if (battleFrame?.dataset.src && !battleFrame.getAttribute("src")) battleFrame.src = battleFrame.dataset.src;
    playOverview();
  });
  primaryApply.addEventListener("pointerenter", () => setFocusScene(true));
  primaryApply.addEventListener("pointerleave", () => setFocusScene(false));
  primaryApply.addEventListener("focus", () => setFocusScene(true));
  primaryApply.addEventListener("blur", () => setFocusScene(false));

  applyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!CONFIG.formUrl) return;
      window.open(CONFIG.formUrl, "_blank", "noopener,noreferrer");
    });
  });

  const countdowns = [...document.querySelectorAll("[data-countdown]")];
  const plural = (value, one, few, many) => {
    const abs = Math.abs(value) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last > 1 && last < 5) return few;
    if (last === 1) return one;
    return many;
  };
  const unitNames = {
    days: ["день", "дня", "дней"],
    hours: ["час", "часа", "часов"],
    minutes: ["минута", "минуты", "минут"],
    seconds: ["секунда", "секунды", "секунд"],
  };
  let applicationsOpen = false;
  let finalSecond = null;

  const revealApplication = () => {
    if (applicationsOpen) return;
    applicationsOpen = true;
    document.documentElement.classList.add("is-open");
    countdowns.forEach((countdown) => {
      countdown.hidden = true;
    });
    applyButtons.forEach((button) => {
      button.hidden = false;
      if (reduceMotion || lite) return;
      button.classList.remove("is-arriving");
      window.requestAnimationFrame(() => button.classList.add("is-arriving"));
    });
  };

  const paintCountdown = (countdown, parts, final) => {
    countdown.classList.toggle("is-final", final);
    const units = final ? ["seconds"] : ["days", "hours", "minutes", "seconds"];
    units.forEach((unit) => {
      const slot = countdown.querySelector(`[data-unit="${unit}"]`);
      if (!slot) return;
      const value = slot.querySelector(".countdown__value");
      const caption = slot.querySelector("small");
      const next = String(parts[unit]).padStart(2, "0");
      if (value.textContent !== next) {
        value.textContent = next;
        if (final && !reduceMotion && !lite) {
          value.classList.remove("is-tick");
          void value.offsetWidth;
          value.classList.add("is-tick");
        }
      }
      if (caption) caption.textContent = plural(parts[unit], ...unitNames[unit]);
    });
  };

  const updateCountdown = () => {
    const remaining = CONFIG.applicationsOpenAt - Date.now();
    if (remaining <= 0) {
      revealApplication();
      return;
    }
    const totalSeconds = Math.ceil(remaining / 1000);
    const final = totalSeconds <= 60;
    const parts = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
    if (final && parts.seconds === 0) parts.seconds = 60;
    countdowns.forEach((countdown) => paintCountdown(countdown, parts, final));
    if (final && parts.seconds !== finalSecond) finalSecond = parts.seconds;
  };

  if (Number.isFinite(CONFIG.applicationsOpenAt)) {
    updateCountdown();
    const countdownTimer = window.setInterval(() => {
      updateCountdown();
      if (applicationsOpen) window.clearInterval(countdownTimer);
    }, 250);
  }

  const setFaqItem = (item, open) => {
    const button = item.querySelector(".faq__question");
    const answer = item.querySelector(".faq__answer");
    item.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    answer.style.maxHeight = open ? `${answer.scrollHeight}px` : "0px";
  };

  faqItems.forEach((item) => {
    const button = item.querySelector(".faq__question");
    setFaqItem(item, item.classList.contains("is-open"));
    button.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      faqItems.forEach((otherItem) => setFaqItem(otherItem, false));
      if (willOpen) setFaqItem(item, true);
    });
  });

  window.addEventListener("resize", () => {
    faqItems.forEach((item) => {
      if (item.classList.contains("is-open")) setFaqItem(item, true);
    });
  }, { passive: true });

  if (reduceMotion) {
    scrollRevealItems.forEach((item) => item.classList.add("is-in-view"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in-view");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.22, rootMargin: "0px 0px -8%" });

    scrollRevealItems.forEach((item) => revealObserver.observe(item));
  }

  if (!reduceMotion && !lite && aboutVisual) {
    let aboutTicking = false;
    const updateAboutParallax = () => {
      const rect = aboutVisual.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const shift = Math.max(-1, Math.min(1, (progress - 0.5) * 2));
      aboutVisual.style.setProperty("--about-shift", shift.toFixed(3));
      aboutTicking = false;
    };

    window.addEventListener("scroll", () => {
      if (aboutTicking) return;
      aboutTicking = true;
      window.requestAnimationFrame(updateAboutParallax);
    }, { passive: true });
    updateAboutParallax();
  }

  if (!reduceMotion && !lite && heroScroll) {
    let heroTicking = false;
    const about = document.querySelector("#about");
    const sections = document.querySelectorAll("#levels, #sound-battle, #join, #faq");
    const levels = document.querySelector("#levels");
    if (about) {
      const updatePin = () => {
        const top = Math.min(0, window.innerHeight - about.offsetHeight);
        about.style.setProperty("--about-pin-top", `${top}px`);
      };
      updatePin();
      new ResizeObserver(updatePin).observe(about);
      window.addEventListener("resize", updatePin, { passive: true });
    }

    const updateHeroScroll = () => {
      const rect = heroScroll.getBoundingClientRect();
      const distance = Math.max(1, heroScroll.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / distance);
      sections.forEach((section) => {
        const rise = parseFloat(section.style.getPropertyValue("--section-rise")) || 0;
        const overlap = 1 - (section.getBoundingClientRect().top - rise) / window.innerHeight;
        const opacity = smooth(rangeProgress(overlap, 0.12, 0.94));
        section.style.setProperty("--section-opacity", opacity.toFixed(4));
        section.style.setProperty("--section-rise", `${(1 - opacity) * 36}px`);
        section.style.setProperty("--section-feather", `${(1 - opacity) * 180}px`);
      });
      if (about && levels) {
        const rise = parseFloat(levels.style.getPropertyValue("--section-rise")) || 0;
        const levelsTop = levels.getBoundingClientRect().top - rise;
        about.classList.toggle("is-covered", levelsTop <= 0);
      }
      if (about) {
        const rise = parseFloat(about.style.getPropertyValue("--about-rise")) || 0;
        const entry = 1 - (about.getBoundingClientRect().top - rise) / window.innerHeight;
        const reveal = smooth(rangeProgress(entry, 0.12, 0.94));
        about.style.setProperty("--about-reveal", reveal.toFixed(4));
        about.style.setProperty("--about-rise", `${(1 - reveal) * 36}px`);
      }
      const scenePhase = smooth(rangeProgress(progress, 0.04, 0.68));
      const sceneFade = smooth(rangeProgress(progress, 0.12, 0.82));
      const uiFade = smooth(rangeProgress(progress, 0.02, 0.28));
      const titleFade = smooth(rangeProgress(progress, 0.52, 0.99));

      if (progress > 0.002) heroScroll.classList.add("has-scroll-progress");
      heroScroll.style.setProperty("--hero-progress", progress.toFixed(4));
      heroScroll.style.setProperty("--hero-scene-scale", (1 - scenePhase * 0.19).toFixed(4));
      heroScroll.style.setProperty("--hero-scene-opacity", (1 - sceneFade).toFixed(4));
      heroScroll.style.setProperty("--hero-scene-radius", `${Math.round(scenePhase * 32)}px`);
      heroScroll.style.setProperty("--hero-ui-opacity", (1 - uiFade).toFixed(4));
      heroScroll.style.setProperty("--hero-title-opacity", (1 - titleFade).toFixed(4));
      heroScroll.style.setProperty("--hero-title-scale", (1 - titleFade * 0.07).toFixed(4));
      heroTicking = false;
    };

    const requestHeroUpdate = () => {
      if (heroTicking) return;
      heroTicking = true;
      window.requestAnimationFrame(updateHeroScroll);
    };

    window.addEventListener("scroll", requestHeroUpdate, { passive: true });
    window.addEventListener("resize", requestHeroUpdate, { passive: true });
    updateHeroScroll();
  }

  const setTilt = (x, y) => {
    root.style.setProperty("--mx", clamp(x, -1, 1).toFixed(3));
    root.style.setProperty("--my", clamp(y, -1, 1).toFixed(3));
  };

  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      setTilt((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
    }, { passive: true });
  }

  if (!reduceMotion && window.matchMedia("(pointer: coarse)").matches) {
    let tiltOrigin = null;
    let tiltListening = false;
    const listenTilt = () => {
      if (tiltListening) return;
      tiltListening = true;
      window.addEventListener("deviceorientation", (event) => {
        if (event.gamma == null || event.beta == null) return;
        if (!tiltOrigin) tiltOrigin = { beta: event.beta, gamma: event.gamma };
        setTilt((event.gamma - tiltOrigin.gamma) / 18, (event.beta - tiltOrigin.beta) / 18);
      }, { passive: true });
    };
    const requestTilt = () => {
      const ask = DeviceOrientationEvent?.requestPermission;
      if (typeof ask !== "function") {
        listenTilt();
        return;
      }
      ask.call(DeviceOrientationEvent).then((state) => {
        if (state === "granted") listenTilt();
      }).catch(() => {});
    };
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      window.addEventListener("pointerdown", requestTilt, { once: true });
    } else {
      listenTilt();
    }
  }
})();
