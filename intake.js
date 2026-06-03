const intakeProgress = document.querySelector("[data-intake-progress]");
const intakeScene = document.querySelector("[data-intake-scene]");
const intakeVideo = intakeScene?.querySelector("video");
const intakeRevealTargets = document.querySelectorAll("[data-intake-reveal], [data-intake-step]");
const intakeTouch = window.matchMedia("(pointer: coarse)").matches;

const intakeClamp = (value, min, max) => Math.min(Math.max(value, min), max);

const intakeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in-view");
    });
  },
  { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
);

intakeRevealTargets.forEach((target) => intakeObserver.observe(target));

function updateIntakeMotion() {
  const scroll = window.scrollY;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  intakeProgress.style.transform = `scaleX(${intakeClamp(scroll / maxScroll, 0, 1)})`;

  if (!intakeScene || !intakeVideo) return;
  const sceneProgress = intakeClamp(scroll / Math.max(1, intakeScene.offsetHeight - window.innerHeight), 0, 1);
  const scale = 1.045 + sceneProgress * (intakeTouch ? 0.02 : 0.055);
  intakeVideo.style.transform = `scale(${scale}) translate3d(0, ${sceneProgress * (intakeTouch ? -8 : -20)}px, 0)`;
}

let intakeFramePending = false;
function requestIntakeFrame() {
  if (intakeFramePending) return;
  intakeFramePending = true;
  requestAnimationFrame(() => {
    intakeFramePending = false;
    updateIntakeMotion();
  });
}

window.addEventListener("scroll", requestIntakeFrame, { passive: true });
window.addEventListener("resize", requestIntakeFrame, { passive: true });
requestIntakeFrame();

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzltN5NvZmdnA4GUW_P2NaCYDFgfpAIcu9TQCSlNGf92RXGFQvQJ1XmLd8kU-ajlvwQ_w/exec";
const wellnessForm = document.querySelector("#wellnessForm");
const reviewScreens = [...document.querySelectorAll("[data-review-screen]")];
const reviewTitle = document.querySelector("[data-review-title]");
const reviewCount = document.querySelector("[data-review-count]");
const reviewBar = document.querySelector("[data-review-bar]");
const reviewError = document.querySelector("[data-review-error]");
const reviewActions = document.querySelector("[data-review-actions]");
const reviewNext = document.querySelector("[data-review-next]");
const reviewPrev = document.querySelector("[data-review-prev]");
const reviewSubmit = document.querySelector("[data-review-submit]");
const reviewPersonal = document.querySelector("[data-review-personal] p");
const submissionOverlay = document.querySelector("[data-submission-overlay]");
const submissionName = document.querySelector("[data-submission-name]");
const submissionClose = document.querySelector("[data-submission-close]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const reviewTitles = [
  "Personal context",
  "Desired outcome",
  "Current rhythm",
  "Private follow-up",
];
const reviewChapterCount = reviewScreens.length;
let activeReviewScreen = 0;

function applyTheme(mode) {
  const light = mode === "light";
  document.documentElement.classList.toggle("theme-light", light);
  themeToggle?.setAttribute("aria-pressed", String(light));
  themeToggle?.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
  if (themeLabel) themeLabel.textContent = light ? "Dark" : "Light";
}

function initThemeToggle() {
  const themeVersion = "20260603-light-default";
  let savedTheme = "light";
  try {
    const savedVersion = localStorage.getItem("nutrirish-theme-version");
    savedTheme = savedVersion === themeVersion ? localStorage.getItem("nutrirish-theme") || "light" : "light";
    localStorage.setItem("nutrirish-theme-version", themeVersion);
    if (savedVersion !== themeVersion) localStorage.setItem("nutrirish-theme", "light");
  } catch (error) {}

  applyTheme(savedTheme);
  themeToggle?.addEventListener("click", () => {
    const nextTheme = document.documentElement.classList.contains("theme-light") ? "dark" : "light";
    try {
      localStorage.setItem("nutrirish-theme-version", themeVersion);
      localStorage.setItem("nutrirish-theme", nextTheme);
    } catch (error) {}
    applyTheme(nextTheme);
  });
}

initThemeToggle();

document.querySelectorAll("[data-score-input]").forEach((input) => {
  input.addEventListener("input", () => {
    input.nextElementSibling.value = input.value;
  });
});

function showReviewScreen(index) {
  activeReviewScreen = intakeClamp(index, 0, reviewScreens.length - 1);
  reviewScreens.forEach((screen, screenIndex) => screen.classList.toggle("active", screenIndex === activeReviewScreen));

  const visibleStep = activeReviewScreen + 1;
  reviewTitle.textContent = reviewTitles[activeReviewScreen];
  reviewCount.textContent = `${String(visibleStep).padStart(2, "0")} / ${String(reviewChapterCount).padStart(2, "0")}`;
  reviewBar.style.transform = `scaleX(${visibleStep / reviewChapterCount})`;
  reviewActions.hidden = false;
  reviewActions.classList.toggle("has-back", activeReviewScreen > 0);
  reviewActions.classList.toggle("is-final", activeReviewScreen === reviewChapterCount - 1);
  reviewError.textContent = "";
  document.querySelector("#enquiry").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updatePersonalSignal() {
  if (!reviewPersonal || !wellnessForm) return;
  const name = wellnessForm.elements.name?.value.trim();
  const goal = wellnessForm.elements.mainGoal?.value;
  const training = wellnessForm.elements.trainingFrequency?.value;
  const struggle = wellnessForm.elements.nutritionStruggle?.value;

  if (training && goal) {
    reviewPersonal.textContent = `${name ? `${name}, your` : "Your"} ${goal.toLowerCase()} plan should respect a ${training.toLowerCase()} movement rhythm${struggle ? ` and solve the ${struggle.toLowerCase()} pattern without adding noise.` : "."}`;
  } else if (goal) {
    reviewPersonal.textContent = `${name ? `${name}, this` : "This"} review will focus on ${goal.toLowerCase()} while keeping the plan realistic for your actual calendar.`;
  } else if (name) {
    reviewPersonal.textContent = `${name}, a few thoughtful answers are enough to begin shaping your private review.`;
  } else {
    reviewPersonal.textContent = "A few thoughtful answers are enough to begin shaping your private review.";
  }
}

function showSubmissionOverlay() {
  const name = wellnessForm?.elements.name?.value.trim();
  if (submissionName) {
    submissionName.textContent = name
      ? `${name}, your context has been received privately.`
      : "Your context has been received privately.";
  }
  submissionOverlay?.classList.add("is-visible");
  submissionOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("submission-open");
  window.setTimeout(() => submissionClose?.focus(), 520);
}

function hideSubmissionOverlay() {
  submissionOverlay?.classList.remove("is-visible");
  submissionOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("submission-open");
}

wellnessForm?.addEventListener("input", updatePersonalSignal);
wellnessForm?.addEventListener("change", updatePersonalSignal);
submissionClose?.addEventListener("click", hideSubmissionOverlay);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && submissionOverlay?.classList.contains("is-visible")) hideSubmissionOverlay();
});

const previewSubmission = new URLSearchParams(window.location.search).has("preview-success");
if (["localhost", "127.0.0.1"].includes(window.location.hostname) && previewSubmission) {
  window.setTimeout(showSubmissionOverlay, 240);
}

function validateReviewScreen() {
  const currentScreen = reviewScreens[activeReviewScreen];
  const requiredFields = [...currentScreen.querySelectorAll("[required]")];
  const reviewedRadioNames = new Set();

  for (const field of requiredFields) {
    if (field.type === "radio") {
      if (reviewedRadioNames.has(field.name)) continue;
      reviewedRadioNames.add(field.name);
      if (!currentScreen.querySelector(`input[name="${field.name}"]:checked`)) {
        reviewError.textContent = "Please choose one option before continuing.";
        return false;
      }
    } else if (!field.value.trim()) {
      field.focus();
      reviewError.textContent = "Please complete the required field before continuing.";
      return false;
    }
  }

  reviewError.textContent = "";
  return true;
}

reviewNext?.addEventListener("click", () => {
  if (!validateReviewScreen()) return;
  if (activeReviewScreen < reviewChapterCount - 1) showReviewScreen(activeReviewScreen + 1);
});

reviewPrev?.addEventListener("click", () => showReviewScreen(activeReviewScreen - 1));

wellnessForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateReviewScreen()) return;

  reviewSubmit.disabled = true;
  reviewSubmit.textContent = "Submitting...";
  const formData = new FormData(wellnessForm);
  const payload = Object.fromEntries(formData.entries());
  payload.submittedAt = new Date().toISOString();
  payload.page = "NutriRish Private Wellness Review";

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    showSubmissionOverlay();
  } catch (error) {
    console.error(error);
    reviewError.textContent = "Something went wrong while submitting. Please try again.";
  } finally {
    reviewSubmit.disabled = false;
    reviewSubmit.textContent = "Submit private review";
  }
});
