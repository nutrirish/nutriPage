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
const reviewTitles = [
  "Personal context",
  "Goals and body",
  "Nutrition rhythm",
  "Food relationship",
  "Recovery signals",
  "Movement pattern",
  "Coaching fit",
  "Complete",
];
let activeReviewScreen = 0;

document.querySelectorAll("[data-score-input]").forEach((input) => {
  input.addEventListener("input", () => {
    input.nextElementSibling.value = input.value;
  });
});

function showReviewScreen(index) {
  activeReviewScreen = intakeClamp(index, 0, reviewScreens.length - 1);
  reviewScreens.forEach((screen, screenIndex) => screen.classList.toggle("active", screenIndex === activeReviewScreen));

  const completed = activeReviewScreen === reviewScreens.length - 1;
  const visibleStep = Math.min(activeReviewScreen + 1, reviewScreens.length - 1);
  reviewTitle.textContent = reviewTitles[activeReviewScreen];
  reviewCount.textContent = completed ? "Complete" : `${String(visibleStep).padStart(2, "0")} / 07`;
  reviewBar.style.transform = `scaleX(${completed ? 1 : visibleStep / 7})`;
  reviewActions.hidden = completed;
  reviewActions.classList.toggle("has-back", activeReviewScreen > 0 && !completed);
  reviewActions.classList.toggle("is-final", activeReviewScreen === 6);
  reviewError.textContent = "";
  document.querySelector("#enquiry").scrollIntoView({ behavior: "smooth", block: "start" });
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
  showReviewScreen(activeReviewScreen + 1);
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
    showReviewScreen(7);
  } catch (error) {
    console.error(error);
    reviewError.textContent = "Something went wrong while submitting. Please try again.";
  } finally {
    reviewSubmit.disabled = false;
    reviewSubmit.textContent = "Submit private review";
  }
});
