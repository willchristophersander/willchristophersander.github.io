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
  const slides = slider.querySelectorAll(".tile-slide");
  if (!slides.length) return;
  let currentIndex = 0;

  const showSlide = (index) => {
    slides[currentIndex].classList.remove("is-active");
    currentIndex = (index + slides.length) % slides.length;
    slides[currentIndex].classList.add("is-active");
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
});
