const scentJourney = [
  {
    question: "What kinds of scents do you like?",
    hint: "Choose one to get started.",
    answers: [
      { id: "coast", label: "Fresh and clean", mood: "bright" },
      { id: "garden", label: "Soft and floral", mood: "floral" },
      { id: "sun", label: "Warm and sweet", mood: "warm" },
      { id: "dusk", label: "Smoky and spicy", mood: "deep" }
    ]
  },
  {
    question: "What mood are you going for?",
    hint: "",
    answers: [
      { id: "composed", label: "Fresh and energized", mood: "bright" },
      { id: "intimate", label: "Soft and romantic", mood: "floral" },
      { id: "comfort", label: "Warm and cozy", mood: "warm" },
      { id: "bold", label: "Bold and confident", mood: "deep" }
    ]
  },
  {
    question: "When would you wear it most?",
    hint: "",
    answers: [
      { id: "daily", label: "Every day", mood: "bright" },
      { id: "close", label: "Relaxed days", mood: "floral" },
      { id: "golden", label: "Daytime outings", mood: "warm" },
      { id: "night", label: "Evenings and special occasions", mood: "deep" }
    ]
  }
];

const scentAccents = {
  static: ["composed", "daily"], anchor: ["composed", "close"], momentum: ["bold", "daily"],
  untamed: ["bold", "golden"], "velvet-rose": ["bold", "close"], "golden-hour-bloom": ["intimate", "golden"],
  "iris-noir": ["bold", "night"], "soft-pulse": ["intimate", "close"], "sunlit-skin": ["comfort", "golden"],
  sugarplum: ["comfort", "close"], "tropic-musk": ["intimate", "night"], "self-made": ["composed", "daily"],
  "worn-leather": ["composed", "golden"], "midnight-spice": ["bold", "night"],
  wildfire: ["bold", "daily"], "after-hours": ["intimate", "night"]
};

// The UI supplies answer IDs and the catalog. A future guide can replace this
// ranking function or supply its own questions without rewriting the storefront.
function recommendScents(answerIds, catalog, collection = "all") {
  const picked = answerIds.map((id, step) => scentJourney[step].answers.find(answer => answer.id === id));
  const eligible = collection === "all" ? catalog : catalog.filter(scent => scent.collection === collection);
  return eligible.map(scent => {
    const score = picked.reduce((total, answer, step) => {
      return total + (scent.family === answer.mood ? [5, 3, 2][step] : 0)
        + (scentAccents[scent.id]?.includes(answer.id) ? 3 : 0);
    }, 0);
    return { scent, score };
  }).sort((a, b) => b.score - a.score).slice(0, 2).map(match => match.scent);
}

const finder = document.querySelector("#finder");
const question = finder.querySelector(".question");
const hint = finder.querySelector(".question-hint");
const choices = finder.querySelector(".answer-grid");
const collectionPicker = finder.querySelector(".finder-collections");
const stepTrack = finder.querySelector(".step-track");
const backStep = finder.querySelector(".back-step");
const artwork = document.querySelector(".living-art");
const moodScene = artwork.querySelector(".scene-mood");
const answers = [];

function paintMood(mood) {
  artwork.dataset.request = mood || "";
  if (!mood) {
    moodScene.classList.remove("visible");
    return;
  }
  if (moodScene.dataset.mood === mood) {
    moodScene.classList.add("visible");
    return;
  }
  const url = `assets/journey/${mood}.webp`;
  const nextImage = new Image();
  nextImage.onload = () => {
    if (artwork.dataset.request !== mood) return;
    moodScene.src = url;
    moodScene.hidden = false;
    moodScene.dataset.mood = mood;
    moodScene.classList.remove("visible");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (artwork.dataset.request === mood) moodScene.classList.add("visible");
    }));
  };
  nextImage.src = url;
}

function showStep(moveFocus = false) {
  const step = answers.length;
  choices.replaceChildren();
  backStep.hidden = step === 0;
  collectionPicker.hidden = step !== 0;
  backStep.textContent = t("Back");
  finder.querySelectorAll(".step-track i").forEach((dot, index) => {
    dot.classList.toggle("filled", index <= step);
  });
  choices.classList.toggle("results", step === scentJourney.length);

  if (step === scentJourney.length) {
    const collection = collectionPicker.querySelector("input:checked").value;
    const matches = recommendScents(answers, scents, collection);
    stepTrack.setAttribute("aria-label", t("Fragrance finder complete"));
    question.textContent = t("Your two matches");
    hint.hidden = false;
    hint.textContent = t("Start with these two fragrances based on your answers.");
    for (const scent of matches) {
      const match = document.createElement("button");
      match.type = "button";
      match.className = "match";
      const img = document.createElement("img");
      setCardArtwork(img, scent.id);
      img.alt = "";
      const name = document.createElement("strong");
      name.textContent = scent.name;
      match.append(img, name);
      match.addEventListener("click", () => openScent(scent));
      choices.append(match);
    }
    backStep.textContent = t("Start again");
    paintMood(matches[0].family);
  } else {
    const current = scentJourney[step];
    stepTrack.setAttribute("aria-label", t("Question {step} of {total}", { step: step + 1, total: scentJourney.length }));
    question.textContent = t(current.question);
    hint.textContent = t(current.hint);
    hint.hidden = !current.hint;
    for (const answer of current.answers) {
      const button = document.createElement("button");
      button.className = "answer";
      button.type = "button";
      const img = document.createElement("img");
      img.src = `assets/journey/${answer.mood}.webp`;
      img.alt = "";
      const label = document.createElement("span");
      label.textContent = t(answer.label);
      button.append(img, label);
      button.addEventListener("click", () => {
        answers.push(answer.id);
        paintMood(answer.mood);
        showStep(true);
      });
      choices.append(button);
    }
  }
  if (moveFocus) question.focus({ preventScroll: true });
}

backStep.addEventListener("click", () => {
  if (answers.length === scentJourney.length) answers.length = 0;
  else answers.pop();
  const prior = answers.length && scentJourney[answers.length - 1].answers.find(answer => answer.id === answers.at(-1));
  paintMood(prior ? prior.mood : "");
  showStep(true);
});

const still = window.matchMedia("(prefers-reduced-motion: reduce)");
const pointer = window.matchMedia("(pointer: fine)");
const journey = document.querySelector(".journey");
journey.addEventListener("pointermove", event => {
  if (still.matches || !pointer.matches) return;
  const rect = journey.getBoundingClientRect();
  artwork.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width - .5) * 13}px`);
  artwork.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height - .5) * 10}px`);
});
journey.addEventListener("pointerleave", () => {
  artwork.style.removeProperty("--mx");
  artwork.style.removeProperty("--my");
});

finder.hidden = false;
showStep();

document.addEventListener("nasaem:language", () => showStep());
