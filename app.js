const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (from, to, amount) => from + (to - from) * amount;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const touchDevice = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 900;

const root = document.documentElement;
const preloader = document.querySelector("[data-preloader]");
const loaderBar = document.querySelector("[data-loader-bar]");
const loaderCount = document.querySelector("[data-loader-count]");
const loaderStatus = document.querySelector("[data-loader-status]");
const loaderRing = document.querySelector("[data-loader-ring]");
const progressBar = document.querySelector(".progress span");
const gallery = document.querySelector(".horizontal-gallery");
const track = document.querySelector("[data-track]");
const galleryCards = document.querySelectorAll(".gallery-track figure");
const depthMedia = [...document.querySelectorAll("[data-depth]")];
const motionSections = [...document.querySelectorAll("[data-section-motion]")];
const slideRows = [...document.querySelectorAll("[data-slide-row]")];
const filmCards = [...document.querySelectorAll("[data-film-card]")];
const ambientSweep = document.querySelector(".ambient-sweep");
const filmDust = document.querySelector(".film-dust");
const filmScratches = document.querySelector(".film-scratches");
const lightLeak = document.querySelector(".light-leak");
const scrollVignette = document.querySelector(".scroll-vignette");
const privateSection = document.querySelector(".private");
const privateBackdrop = document.querySelector(".private-bg");
const driftTexts = [...document.querySelectorAll("[data-drift]")].map((element) => ({
  element,
  top: 0,
  height: 0,
}));
const fadeTargets = document.querySelectorAll("[data-fade], .reveal-image");
const motionVideos = document.querySelectorAll("video");
const cursorRing = document.querySelector(".cursor-ring");
const cursorDot = document.querySelector(".cursor-dot");
const cinemas = [...document.querySelectorAll("[data-cinema]")].map((section) => ({
  section,
  video: section.querySelector(".cinema-main"),
  panel: section.querySelector(".cinema-panel"),
}));

let targetScroll = window.scrollY;
let smoothScroll = targetScroll;
let viewportHeight = window.innerHeight;
let maxScroll = 1;
let galleryTravel = 0;
let pointerX = -80;
let pointerY = -80;
let ringX = pointerX;
let ringY = pointerY;
let framePending = false;
let desktopLoopStarted = false;

function playVideo(video) {
  if (!video || document.hidden) return;
  video.play().catch(() => {});
}

function initPreloader() {
  if (!preloader) return;

  document.body.classList.add("is-loading");
  const heroVideo = document.querySelector(".hero-cinema .cinema-main");
  const reelVideo = document.querySelector(".loader-reel video");
  const assets = [reelVideo, heroVideo].filter(Boolean);
  const startedAt = performance.now();
  const minimumDuration = reducedMotion ? 180 : touchDevice ? 720 : 1200;
  const maximumDuration = touchDevice ? 2400 : 3400;
  let loaded = 0;
  let complete = false;
  const loadedAssets = new WeakSet();

  const dismissPreloader = () => {
    preloader.classList.add("is-complete");
    document.body.classList.remove("is-loading");
    document.documentElement.classList.remove("is-loading");
    playVideo(heroVideo);
    window.setTimeout(() => preloader.remove(), touchDevice ? 980 : 1380);
  };

  const update = () => {
    const progress = assets.length ? loaded / assets.length : 1;
    const percentage = Math.min(100, Math.round(progress * 100));
    loaderBar.style.transform = `scaleX(${progress})`;
    if (loaderRing) loaderRing.style.setProperty("--dial-offset", `${515.22 * (1 - progress)}`);
    loaderCount.textContent = String(percentage).padStart(2, "0");
    loaderStatus.textContent =
      percentage < 35 ? "Composing the atmosphere" :
      percentage < 78 ? "Preparing the private edit" :
      percentage < 100 ? "Final calibration" :
      "Experience ready";
  };

  const reveal = () => {
    if (complete) return;
    const elapsed = performance.now() - startedAt;
    if (elapsed < minimumDuration) {
      window.setTimeout(reveal, minimumDuration - elapsed);
      return;
    }

    complete = true;
    loaderBar.style.transform = "scaleX(1)";
    if (loaderRing) loaderRing.style.setProperty("--dial-offset", "0");
    loaderCount.textContent = "100";
    loaderStatus.textContent = "Experience ready";
    window.setTimeout(dismissPreloader, reducedMotion ? 80 : 420);
  };

  const markLoaded = (asset) => {
    if (loadedAssets.has(asset)) return;
    loadedAssets.add(asset);
    loaded += 1;
    update();
    if (loaded >= assets.length) reveal();
  };

  assets.forEach((asset) => {
    if (asset.tagName === "IMG") {
      if (asset.complete && asset.naturalWidth) {
        markLoaded(asset);
      } else {
        asset.addEventListener("load", () => markLoaded(asset), { once: true });
        asset.addEventListener("error", () => markLoaded(asset), { once: true });
      }
      return;
    }

    if (asset.readyState >= 1) {
      markLoaded(asset);
    } else {
      asset.addEventListener("loadedmetadata", () => markLoaded(asset), { once: true });
      asset.addEventListener("error", () => markLoaded(asset), { once: true });
    }
  });

  update();
  window.setTimeout(reveal, maximumDuration);
  window.setTimeout(() => {
    dismissPreloader();
  }, maximumDuration + 1200);
}

const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in-view");
    });
  },
  { threshold: 0.14, rootMargin: "0px 0px -7% 0px" }
);

fadeTargets.forEach((target) => fadeObserver.observe(target));

function ensureVideoSource(video) {
  if (!video.dataset.src || video.getAttribute("src")) return;
  video.src = video.dataset.src;
  video.removeAttribute("data-src");
  video.load();
}

const videoWarmObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      ensureVideoSource(entry.target);
      videoWarmObserver.unobserve(entry.target);
    });
  },
  { threshold: 0, rootMargin: touchDevice ? "85% 0px 85% 0px" : "140% 0px 140% 0px" }
);

const videoObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        ensureVideoSource(entry.target);
        playVideo(entry.target);
      } else {
        entry.target.pause();
      }
    });
  },
  { threshold: 0.08, rootMargin: touchDevice ? "10% 0px 10% 0px" : "40% 0px 40% 0px" }
);

motionVideos.forEach((video) => {
  video.muted = true;
  video.playsInline = true;
  const markVideoReady = () => video.classList.add("is-ready");
  if (video.readyState >= 2) markVideoReady();
  video.addEventListener("loadeddata", markVideoReady, { once: true });
  video.addEventListener("canplay", markVideoReady, { once: true });
  videoWarmObserver.observe(video);
  videoObserver.observe(video);
});

function resumeVisibleVideos() {
  motionVideos.forEach((video) => {
    const rect = video.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    ensureVideoSource(video);
    playVideo(video);
  });
}

window.addEventListener("pageshow", resumeVisibleVideos);
window.addEventListener("pointerdown", resumeVisibleVideos, { once: true, passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) resumeVisibleVideos();
});

function updateMeasurements() {
  viewportHeight = window.innerHeight;
  maxScroll = Math.max(1, root.scrollHeight - viewportHeight);
  galleryTravel = track ? Math.max(0, track.scrollWidth - window.innerWidth + 82) : 0;

  cinemas.forEach((cinema) => {
    cinema.top = cinema.section.offsetTop;
    cinema.scrollable = Math.max(1, cinema.section.offsetHeight - viewportHeight);
  });

  driftTexts.forEach((item) => {
    const rect = item.element.getBoundingClientRect();
    item.top = rect.top + window.scrollY;
    item.height = rect.height;
  });

  [...depthMedia, ...motionSections, ...slideRows, ...filmCards].forEach((element) => {
    const rect = element.getBoundingClientRect();
    element.motionTop = rect.top + window.scrollY;
    element.motionHeight = element.offsetHeight;
  });

  if (privateSection) {
    const rect = privateSection.getBoundingClientRect();
    privateSection.motionTop = rect.top + window.scrollY;
    privateSection.motionHeight = privateSection.offsetHeight;
  }
}

function updateProgress(scroll) {
  progressBar.style.transform = `scaleX(${clamp(scroll / maxScroll, 0, 1)})`;
}

function updateGallery(scroll) {
  if (!gallery || !track) return;
  const top = gallery.offsetTop;
  const scrollable = Math.max(1, gallery.offsetHeight - viewportHeight);
  const progress = clamp((scroll - top) / scrollable, 0, 1);
  track.style.setProperty("--gallery-x", `${-galleryTravel * progress}px`);

  galleryCards.forEach((card, index) => {
    const wave = Math.sin(progress * Math.PI * 2 + index * 0.72);
    card.style.setProperty("--card-y", `${wave * (touchDevice ? 6 : 16)}px`);
    card.style.setProperty("--image-scale", `${1.025 + Math.abs(wave) * (touchDevice ? 0.012 : 0.035)}`);
    card.style.setProperty("--caption-x", `${wave * (touchDevice ? 0 : 10)}px`);
  });
}

function updateCinemas(scroll) {
  cinemas.forEach(({ top, scrollable, video, panel }) => {
    const progress = clamp((scroll - top) / scrollable, 0, 1);
    const focus = 1 - Math.abs(progress - 0.5) * 2;
    const scale = lerp(1.075, 1.015, focus);
    const brightness = lerp(0.76, 0.92, focus);
    const saturation = lerp(0.8, 1, focus);

    video.style.setProperty("--cinema-scale", scale.toFixed(4));
    video.style.setProperty("--cinema-brightness", brightness.toFixed(3));
    video.style.setProperty("--cinema-saturation", saturation.toFixed(3));

    if (panel) {
      const drift = (0.5 - progress) * 74;
      panel.style.transform = `translate3d(0, ${drift}px, 0)`;
    }
  });
}

function updateEditorialDrift() {
  driftTexts.forEach(({ element, top, height }, index) => {
    const center = top - smoothScroll + height / 2;
    const normalized = clamp((center - viewportHeight / 2) / viewportHeight, -1, 1);
    const direction = index % 2 === 0 ? -1 : 1;
    element.style.setProperty("--drift-x", `${normalized * direction * (touchDevice ? 8 : 28)}px`);
  });
}

function getViewportProgress(element, scroll) {
  const center = element.motionTop - scroll + element.motionHeight / 2;
  return clamp((center - viewportHeight / 2) / viewportHeight, -1, 1);
}

function updateSectionMotion(scroll) {
  motionSections.forEach((section, index) => {
    const progress = getViewportProgress(section, scroll);
    const focus = 1 - Math.abs(progress);
    section.style.setProperty("--section-glow", (focus * (touchDevice ? 0.36 : 0.82)).toFixed(3));
    section.style.setProperty("--section-x", `${48 + Math.sin(index + scroll * 0.00055) * 20}%`);
  });

  depthMedia.forEach((media) => {
    const progress = getViewportProgress(media, scroll);
    media.style.setProperty("--depth-y", `${progress * (touchDevice ? 10 : 28)}px`);
  });

  slideRows.forEach((row, index) => {
    const progress = getViewportProgress(row, scroll);
    const direction = index % 2 === 0 ? -1 : 1;
    row.style.setProperty("--row-x", `${progress * direction * (touchDevice ? 8 : 32)}px`);
  });

  filmCards.forEach((card, index) => {
    const progress = getViewportProgress(card, scroll);
    const wave = Math.sin(index * 0.8 + scroll * 0.0013);
    card.style.setProperty("--film-y", `${progress * (touchDevice ? 8 : 22) + wave * (touchDevice ? 2 : 7)}px`);
    card.style.setProperty("--film-tilt", `${progress * (touchDevice ? -0.5 : -2.4)}deg`);
  });

  if (ambientSweep) {
    const sweepTravel = window.innerWidth * 1.6;
    ambientSweep.style.setProperty("--sweep-x", `${(scroll / maxScroll) * sweepTravel}px`);
  }

  if (filmDust && !touchDevice) {
    filmDust.style.setProperty("--dust-y", `${(scroll % 340) * -0.18}px`);
  }

  if (filmScratches && !touchDevice) {
    filmScratches.style.setProperty("--scratch-x", `${(scroll % 820) * -0.12}px`);
  }

  if (lightLeak && !touchDevice) {
    lightLeak.style.setProperty("--leak-x", `${Math.sin(scroll * 0.0008) * 42}px`);
  }

  if (scrollVignette && !touchDevice) {
    const breath = 0.36 + Math.abs(Math.sin(scroll * 0.0014)) * 0.18;
    scrollVignette.style.setProperty("--vignette-opacity", breath.toFixed(3));
  }

  if (privateSection && privateBackdrop) {
    const progress = getViewportProgress(privateSection, scroll);
    privateBackdrop.style.setProperty("--private-y", `${progress * 30}px`);
    privateBackdrop.style.setProperty("--private-scale", `${1.055 + Math.abs(progress) * 0.025}`);
  }
}

function updateCursor() {
  if (!cursorRing || !cursorDot || window.innerWidth <= 900) return;
  ringX = lerp(ringX, pointerX, 0.16);
  ringY = lerp(ringY, pointerY, 0.16);
  cursorRing.style.transform = `translate3d(${ringX - 17}px, ${ringY - 17}px, 0)`;
  cursorDot.style.transform = `translate3d(${pointerX - 2}px, ${pointerY - 2}px, 0)`;
}

function frame() {
  framePending = false;
  const easing = reducedMotion || touchDevice ? 1 : 0.115;
  smoothScroll = lerp(smoothScroll, targetScroll, easing);

  if (Math.abs(targetScroll - smoothScroll) < 0.08) {
    smoothScroll = targetScroll;
  }

  updateProgress(smoothScroll);
  updateGallery(smoothScroll);
  updateCinemas(smoothScroll);
  updateEditorialDrift();
  updateSectionMotion(smoothScroll);
  updateCursor();

  if (!touchDevice) requestAnimationFrame(frame);
}

function requestFrame() {
  if (!touchDevice) {
    if (desktopLoopStarted) return;
    desktopLoopStarted = true;
    requestAnimationFrame(frame);
    return;
  }

  if (framePending) return;
  framePending = true;
  requestAnimationFrame(frame);
}

window.addEventListener(
  "scroll",
  () => {
    targetScroll = window.scrollY;
    requestFrame();
  },
  { passive: true }
);

window.addEventListener(
  "pointermove",
  (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  },
  { passive: true }
);

document.querySelectorAll("a, .film-grid article").forEach((element) => {
  element.addEventListener("pointerenter", () => document.body.classList.add("cursor-active"));
  element.addEventListener("pointerleave", () => document.body.classList.remove("cursor-active"));
});

window.addEventListener(
  "resize",
  () => {
    updateMeasurements();
    targetScroll = window.scrollY;
    requestFrame();
  },
  { passive: true }
);

updateMeasurements();
window.addEventListener("load", updateMeasurements, { once: true });
initPreloader();
requestFrame();
