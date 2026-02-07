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
  const itemsRaw = slider.dataset.items || "";
  const altsRaw = slider.dataset.alts || "";
  const titlesRaw = slider.dataset.titles || "";
  const items = itemsRaw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [type, ...rest] = entry.split(":");
      return { type, src: rest.join(":") };
    });
  const alts = altsRaw.split("|");
  const titles = titlesRaw.split("|");
  if (!items.length) return;

  let currentIndex = 0;
  let isAnimating = false;

  const getRoleSlots = () => {
    const prevSlot = slider.querySelector(".role-left");
    const currentSlot = slider.querySelector(".role-center");
    const nextSlot = slider.querySelector(".role-right");
    return { prevSlot, currentSlot, nextSlot };
  };

  const setSlot = (slot, index) => {
    const img = slot.querySelector("img");
    const iframe = slot.querySelector("iframe");
    if (!img || !iframe) return;

    const item = items[index];
    if (item.type === "video") {
      iframe.src = item.src;
      iframe.title = titles[index] || "Video";
      iframe.classList.add("is-visible");
      img.classList.remove("is-visible");
      img.style.display = "none";
      iframe.style.display = "block";
      img.removeAttribute("src");
      img.alt = "";
    } else {
      img.src = item.src;
      img.alt = alts[index] || "";
      img.classList.add("is-visible");
      img.style.display = "block";
      iframe.style.display = "none";
      iframe.classList.remove("is-visible");
      iframe.removeAttribute("src");
      iframe.title = "";
    }
  };

  const render = () => {
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    const nextIndex = (currentIndex + 1) % items.length;
    const { prevSlot, currentSlot, nextSlot } = getRoleSlots();
    if (!prevSlot || !currentSlot || !nextSlot) return;
    setSlot(currentSlot, currentIndex);
    if (slider.classList.contains("is-simple")) {
      prevSlot.style.display = "none";
      nextSlot.style.display = "none";
      return;
    }

    prevSlot.style.display = "";
    nextSlot.style.display = "";
    setSlot(prevSlot, prevIndex);
    setSlot(nextSlot, nextIndex);
  };

  const swapClasses = (direction) => {
    const left = slider.querySelector(".role-left");
    const center = slider.querySelector(".role-center");
    const right = slider.querySelector(".role-right");
    if (!left || !center || !right) return;

    if (direction === "next") {
      left.classList.replace("role-left", "role-right");
      center.classList.replace("role-center", "role-left");
      right.classList.replace("role-right", "role-center");
    } else {
      right.classList.replace("role-right", "role-left");
      center.classList.replace("role-center", "role-right");
      left.classList.replace("role-left", "role-center");
    }
  };

  const animateTo = (nextIndex, direction) => {
    if (isAnimating) return;
    isAnimating = true;
    swapClasses(direction);
    setTimeout(() => {
      currentIndex = nextIndex;
      render();
      isAnimating = false;
    }, 360);
  };

  const prevButton = slider.querySelector("[data-slider-prev]");
  const nextButton = slider.querySelector("[data-slider-next]");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (items.length < 2) return;
      animateTo((currentIndex - 1 + items.length) % items.length, "prev");
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (items.length < 2) return;
      animateTo((currentIndex + 1) % items.length, "next");
    });
  }

  render();

  if (items.length < 2) {
    if (prevButton) prevButton.style.display = "none";
    if (nextButton) nextButton.style.display = "none";
  }
});
