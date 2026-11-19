const products = {
  "alaminuta-m": { name: "Alaminuta M", price: 2500, proteins: ["Bife de gado", "Frango grelhado"] },
  "alaminuta-g": { name: "Alaminuta G", price: 3400, proteins: ["Bife de gado", "Frango grelhado"] },
  "combo-junior": { name: "Combo Júnior", price: 5000 },
  "combo-familia": { name: "Combo Família", price: 7000 },
  "prato-sexta": { name: "Prato de sexta-feira", price: 2000, proteins: ["Sobrecoxa assada", "Frango grelhado"], salad: true },
  "prato-sabado": { name: "Prato de sábado", price: 2000, proteins: ["Bife de gado", "Frango grelhado"], salad: true },
};
const deliveryFee = 400;
const saladPrice = 200;
const orderStorageKey = "sabor-caseiro-pedido";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents) => currency.format(cents / 100);

function orderLine(id, protein, salad, quantity) {
  if (!Object.hasOwn(products, id) || !Number.isSafeInteger(quantity) || quantity < 1) return null;
  const product = products[id];
  if (product.proteins ? !product.proteins.includes(protein) : protein !== "") return null;
  if (typeof salad !== "boolean" || (salad && !product.salad)) return null;

  return {
    id, protein, salad, quantity,
    key: JSON.stringify([id, protein, salad]),
    name: product.name,
    unitPrice: product.price + (salad ? saladPrice : 0),
    options: [protein, salad ? "com porção de salada" : ""].filter(Boolean).join(", "),
  };
}

function orderTotals(lines, delivery) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const fee = delivery && lines.length ? deliveryFee : 0;
  return { subtotal, fee, total: subtotal + fee };
}

function buildOrderMessage(lines, customer) {
  const { subtotal, fee, total } = orderTotals(lines, customer.delivery);
  const message = [
    "🍽️ *NOVO PEDIDO — SABOR CASEIRO*",
    "",
    `👤 *Cliente:* ${customer.name}`,
    `📦 *Recebimento:* ${customer.delivery ? "Entrega" : "Retirada"}`,
  ];

  if (customer.delivery) {
    message.push(
      `📍 *Endereço:* ${customer.street}, ${customer.number}`,
      `🏘️ *Bairro:* ${customer.neighborhood}`,
    );
  }

  message.push("", "🛒 *ITENS DO PEDIDO:*");
  for (const line of lines) {
    const details = line.options ? ` (${line.options})` : "";
    message.push(`• ${line.quantity}x ${line.name}${details} — ${money(line.unitPrice * line.quantity)}`);
  }

  message.push(
    "",
    `💰 *Subtotal:* ${money(subtotal)}`,
    `🛵 *Taxa de entrega:* ${money(fee)}`,
    `💵 *TOTAL: ${money(total)}*`,
  );
  if (customer.payment) message.push("", `💳 *Pagamento:* ${customer.payment}`);
  if (customer.notes) message.push("", `📝 *Observações:* ${customer.notes}`);
  message.push("", "Aguardo confirmação do pedido!");
  return message.join("\n");
}

function readOrder() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(orderStorageKey) ?? "[]");
    if (!Array.isArray(stored)) return new Map();
    const lines = stored
      .filter((line) => line && typeof line === "object")
      .map((line) => orderLine(line.id, line.protein, line.salad, line.quantity))
      .filter(Boolean);
    return new Map(lines.map((line) => [line.key, line]));
  } catch {
    return new Map();
  }
}

const cartDialog = document.getElementById("pedido");
const cart = readOrder();
const checkout = document.getElementById("checkout-form");
const addressFields = document.getElementById("checkout-address");
const orderLines = document.getElementById("order-lines");
const lineTemplate = document.getElementById("order-line-template");
const status = document.getElementById("order-status");
const menuLink = document.getElementById("order-menu-link");
const receiptIsDelivery = () => checkout.elements.recebimento.value === "entrega";
const customerField = (name) => document.getElementById(`customer-${name}`);

function showOrderTotals() {
  const delivery = receiptIsDelivery();
  addressFields.disabled = !delivery;
  addressFields.hidden = !delivery;
  const { subtotal, fee, total } = orderTotals([...cart.values()], delivery);
  document.getElementById("order-subtotal").textContent = money(subtotal);
  document.getElementById("order-fee").textContent = money(fee);
  document.getElementById("order-total").textContent = money(total);
}

function showOrder() {
  const quantity = [...cart.values()].reduce((sum, line) => sum + line.quantity, 0);
  const empty = quantity === 0;
  document.getElementById("order-empty").hidden = !empty;
  document.getElementById("order-content").hidden = empty;
  document.querySelector(".order-shortcut").hidden = empty;
  for (const count of document.querySelectorAll("[data-order-count]")) {
    count.hidden = empty;
    count.textContent = quantity;
  }

  const rows = [];
  for (const line of cart.values()) {
    const row = lineTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.cartKey = line.key;
    row.querySelector("[data-line-name]").textContent = line.name;
    const options = row.querySelector("[data-line-options]");
    options.textContent = line.options;
    options.hidden = !line.options;
    row.querySelector("[data-line-total]").textContent = money(line.unitPrice * line.quantity);
    const quantityLabel = row.querySelector("[data-line-quantity]");
    quantityLabel.textContent = line.quantity;
    quantityLabel.setAttribute("aria-label", `Quantidade: ${line.quantity}`);
    const label = line.options ? `${line.name} (${line.options})` : line.name;
    row.querySelector('[data-cart-action="decrease"]').setAttribute("aria-label", `Diminuir quantidade de ${label}`);
    row.querySelector('[data-cart-action="increase"]').setAttribute("aria-label", `Aumentar quantidade de ${label}`);
    row.querySelector('[data-cart-action="remove"]').setAttribute("aria-label", `Remover ${label}`);
    rows.push(row);
  }

  orderLines.replaceChildren(...rows);
  showOrderTotals();
}

function changeOrder(line, quantity) {
  if (quantity > 0) cart.set(line.key, { ...line, quantity });
  else cart.delete(line.key);

  try {
    const lines = [...cart.values()].map(({ id, protein, salad, quantity }) => ({ id, protein, salad, quantity }));
    sessionStorage.setItem(orderStorageKey, JSON.stringify(lines));
  } catch {
    // The open page still keeps the order if browser storage is unavailable.
  }
  showOrder();
}

for (const trigger of document.querySelectorAll("[data-open-order]")) {
  trigger.addEventListener("click", () => {
    if (!cartDialog.open) cartDialog.showModal();
  });
}

menuLink.addEventListener("click", () => cartDialog.close());
cartDialog.addEventListener("click", (event) => {
  if (event.target === cartDialog) cartDialog.close();
});

for (const form of document.querySelectorAll("[data-add-item]")) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const line = orderLine(form.dataset.addItem, values.get("protein") ?? "", values.has("salad"), 1);
    if (!line) return;

    const quantity = (cart.get(line.key)?.quantity ?? 0) + 1;
    changeOrder(line, quantity);
    form.closest("dialog").close();
    status.textContent = `${line.name} adicionado ao pedido. ${quantity} no carrinho para esta opção.`;
  });
}

orderLines.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const line = cart.get(button.closest("[data-cart-key]").dataset.cartKey);
  const action = button.dataset.cartAction;
  const quantity = action === "remove" ? 0 : line.quantity + (action === "increase" ? 1 : -1);
  changeOrder(line, quantity);

  const row = [...orderLines.children].find((candidate) => candidate.dataset.cartKey === line.key);
  const focus = row?.querySelector(`[data-cart-action="${action}"]`) ??
    orderLines.querySelector("[data-cart-action]") ?? menuLink;
  focus.focus();
});

checkout.addEventListener("change", (event) => {
  if (event.target.name === "recebimento") showOrderTotals();
});
checkout.addEventListener("input", (event) => event.target.setCustomValidity?.(""));

checkout.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!cart.size) return;

  const delivery = receiptIsDelivery();
  const required = delivery ? ["name", "street", "number", "neighborhood"] : ["name"];
  for (const name of required) {
    const field = customerField(name);
    field.setCustomValidity(field.value.trim() ? "" : "Preencha este campo.");
  }
  if (!checkout.reportValidity()) return;

  const customer = Object.fromEntries(
    ["name", "street", "number", "neighborhood", "payment", "notes"]
      .map((name) => [name, customerField(name).value.trim()]),
  );
  customer.delivery = delivery;
  const message = buildOrderMessage([...cart.values()], customer);
  window.open(`https://wa.me/5551999088670?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});

showOrder();
