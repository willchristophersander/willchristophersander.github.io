const openButtons = document.querySelectorAll("[data-modal-open]");
const closeButtons = document.querySelectorAll("[data-modal-close]");
const modals = document.querySelectorAll(".modal");

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
