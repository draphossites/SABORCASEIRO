const mobileToggle = document.querySelector(".mobile-toggle");
const nav = document.querySelector(".site-nav");
const mobileViewport = window.matchMedia("(max-width: 48rem)");

function setMenuOpen(isOpen) {
  mobileToggle.setAttribute("aria-expanded", String(isOpen));
  mobileToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
}

mobileToggle.hidden = false;
mobileToggle.addEventListener("click", () => {
  setMenuOpen(mobileToggle.getAttribute("aria-expanded") === "false");
});
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileToggle.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    mobileToggle.focus();
  }
});
mobileViewport.addEventListener("change", () => setMenuOpen(false));

const filterGroup = document.querySelector(".menu-filter");
const filterButtons = [...filterGroup.querySelectorAll("button")];

function showMenuCategory(activeButton) {
  for (const button of filterButtons) {
    const isActive = button === activeButton;
    button.setAttribute("aria-pressed", String(isActive));
    document.getElementById(button.dataset.menuFilter).hidden = !isActive;
  }
}

showMenuCategory(filterButtons[0]);
filterGroup.hidden = false;
for (const button of filterButtons) {
  button.addEventListener("click", () => showMenuCategory(button));
}

for (const link of document.querySelectorAll("[data-dialog]")) {
  const dialog = document.getElementById(link.dataset.dialog);
  if (typeof dialog.showModal !== "function") continue;

  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.showModal();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => link.focus());
}
