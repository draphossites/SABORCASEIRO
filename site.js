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


// Carrinho e finalização do pedido pelo WhatsApp.
const WHATSAPP_NUMBER = "5551999088670";
const DELIVERY_FEE = 4;
const cart = new Map();
const money = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const subtotalNode = document.getElementById("cart-subtotal");
const totalNode = document.getElementById("cart-total");
const deliveryFeeNode = document.getElementById("delivery-fee");
const orderType = document.getElementById("order-type");
const deliveryFields = document.getElementById("delivery-fields");

function renderCart() {
  const entries = [...cart.entries()];
  const quantity = entries.reduce((sum, [, item]) => sum + item.quantity, 0);
  const subtotal = entries.reduce((sum, [, item]) => sum + item.price * item.quantity, 0);
  const isDelivery = orderType.value === "Entrega";
  const fee = isDelivery && quantity > 0 ? DELIVERY_FEE : 0;
  cartCount.textContent = `${quantity} ${quantity === 1 ? "item" : "itens"}`;
  subtotalNode.textContent = money(subtotal);
  deliveryFeeNode.textContent = money(fee);
  totalNode.textContent = money(subtotal + fee);
  if (!entries.length) {
    cartItems.innerHTML = '<p class="cart-empty">Seu carrinho está vazio. Escolha um prato no cardápio.</p>';
    return;
  }
  cartItems.innerHTML = entries.map(([name, item]) => `
    <div class="cart-item">
      <div class="cart-item-info"><strong>${name}</strong><span>${money(item.price)} cada</span></div>
      <div class="cart-item-controls"><button type="button" data-cart-action="decrease" data-name="${name}" aria-label="Diminuir ${name}">−</button><span>${item.quantity}</span><button type="button" data-cart-action="increase" data-name="${name}" aria-label="Aumentar ${name}">+</button><button type="button" class="cart-remove" data-cart-action="remove" data-name="${name}" aria-label="Remover ${name}">×</button></div>
      <strong class="cart-line-total">${money(item.price * item.quantity)}</strong>
    </div>`).join("");
}

document.querySelectorAll("[data-add][data-price]").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.add;
    const price = Number(button.dataset.price);
    const existing = cart.get(name);
    cart.set(name, { price, quantity: (existing?.quantity || 0) + 1 });
    renderCart();
    const original = button.textContent;
    button.textContent = "Adicionado ✓";
    window.setTimeout(() => { button.textContent = original; }, 1100);
  });
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const name = button.dataset.name;
  const item = cart.get(name);
  if (!item) return;
  if (button.dataset.cartAction === "remove" || (button.dataset.cartAction === "decrease" && item.quantity === 1)) cart.delete(name);
  else if (button.dataset.cartAction === "decrease") item.quantity -= 1;
  else item.quantity += 1;
  renderCart();
});

function updateDeliveryFields() {
  const isDelivery = orderType.value === "Entrega";
  deliveryFields.hidden = !isDelivery;
  document.getElementById("customer-address").required = isDelivery;
  document.getElementById("customer-neighborhood").required = isDelivery;
  renderCart();
}
orderType.addEventListener("change", updateDeliveryFields);
updateDeliveryFields();
renderCart();

document.getElementById("checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (cart.size === 0) {
    alert("Adicione pelo menos um item ao seu pedido antes de enviar.");
    document.getElementById("cardapio").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const entries = [...cart.entries()];
  const subtotal = entries.reduce((sum, [, item]) => sum + item.price * item.quantity, 0);
  const isDelivery = data.get("orderType") === "Entrega";
  const fee = isDelivery ? DELIVERY_FEE : 0;
  const lines = [
    "🍽️ *NOVO PEDIDO — SABOR CASEIRO*", "",
    `👤 *Cliente:* ${data.get("name")}`,
    `📦 *Recebimento:* ${data.get("orderType")}`
  ];
  if (isDelivery) {
    lines.push(`📍 *Endereço:* ${data.get("address")}`, `🏘️ *Bairro:* ${data.get("neighborhood")}`);
    if (data.get("reference")) lines.push(`📌 *Complemento/referência:* ${data.get("reference")}`);
  }
  lines.push("", "🛒 *ITENS DO PEDIDO:*");
  entries.forEach(([name, item]) => lines.push(`• ${item.quantity}x ${name} — ${money(item.price * item.quantity)}`));
  lines.push("", `💰 *Subtotal:* ${money(subtotal)}`, `🛵 *Taxa de entrega:* ${fee ? money(fee) : "Sem taxa (retirada)"}`, `💵 *TOTAL: ${money(subtotal + fee)}*`, "", `💳 *Pagamento:* ${data.get("payment")}`);
  if (data.get("change")) lines.push(`💵 *Troco:* ${data.get("change")}`);
  if (data.get("notes")) lines.push(`📝 *Observações:* ${data.get("notes")}`);
  lines.push("", "Aguardo confirmação do pedido!");
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
});
