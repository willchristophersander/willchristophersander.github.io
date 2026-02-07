const openButtons = document.querySelectorAll("[data-modal-open]");
const closeButtons = document.querySelectorAll("[data-modal-close]");
const modals = document.querySelectorAll(".modal");
const sliders = document.querySelectorAll("[data-slider]");

const openModal = (id) => {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.querySelectorAll("[data-slider]").forEach((slider) => initSlider(slider));
};

const closeModal = (modal) => {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-modal-open");
    openModal(target);
  });
});

closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest(".modal");
    closeModal(modal);
  });
});

modals.forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal(modal);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openModalEl = document.querySelector(".modal.is-open");
  if (openModalEl) {
    closeModal(openModalEl);
  }
});

sliders.forEach((slider) => {
  const slides = Array.from(slider.querySelectorAll(".tile-slide"));
  if (!slides.length) return;
  let currentIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  if (currentIndex < 0) currentIndex = 0;

  const updatePositions = () => {
    const total = slides.length;
    const prevIndex = (currentIndex - 1 + total) % total;
    const nextIndex = (currentIndex + 1) % total;

    slides.forEach((slide, idx) => {
      slide.classList.remove(
        "is-active",
        "slide-prev",
        "slide-current",
        "slide-next",
        "slide-hidden"
      );

      if (idx === currentIndex) {
        slide.classList.add("is-active", "slide-current");
      } else if (idx === prevIndex) {
        slide.classList.add("slide-prev");
      } else if (idx === nextIndex) {
        slide.classList.add("slide-next");
      } else {
        slide.classList.add("slide-hidden");
      }
    });
  };

  const showSlide = (index) => {
    currentIndex = (index + slides.length) % slides.length;
    updatePositions();
  };

  const prevButton = slider.querySelector("[data-slider-prev]");
  const nextButton = slider.querySelector("[data-slider-next]");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      showSlide(currentIndex - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      showSlide(currentIndex + 1);
    });
  }

  updatePositions();

  if (slides.length < 2) {
    if (prevButton) prevButton.style.display = "none";
    if (nextButton) nextButton.style.display = "none";
  }
});

const filterInput = document.getElementById("project-search");
const filterChips = document.querySelectorAll(".filter-chip");
const projectCards = document.querySelectorAll(".project-card");

const activeFilters = new Set();
const normalizeText = (text) => text.toLowerCase().trim();

const matchesFilters = (card) => {
  const query = normalizeText(filterInput?.value || "");
  const text = normalizeText(card.textContent || "");
  const tags = (card.dataset.tags || "")
    .split(",")
    .map((tag) => tag.trim());

  const queryMatch = !query || text.includes(query);
  const filterMatch =
    activeFilters.size === 0 ||
    Array.from(activeFilters).every((filter) => tags.includes(filter));

  return queryMatch && filterMatch;
};

const updateFilters = () => {
  projectCards.forEach((card) => {
    card.style.display = matchesFilters(card) ? "" : "none";
  });
};

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const tag = chip.dataset.tag;
    if (!tag) return;

    if (tag === "all") {
      activeFilters.clear();
      filterChips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      updateFilters();
      return;
    }

    document
      .querySelector('.filter-chip[data-tag="all"]')
      ?.classList.remove("is-active");

    if (activeFilters.has(tag)) {
      activeFilters.delete(tag);
      chip.classList.remove("is-active");
    } else {
      activeFilters.add(tag);
      chip.classList.add("is-active");
    }

    updateFilters();
  });
});

filterInput?.addEventListener("input", updateFilters);
