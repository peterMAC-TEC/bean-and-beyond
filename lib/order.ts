/**
 * Opens the order drawer from anywhere on the page.
 *   openOrder()                  just open it
 *   openOrder({ add: "classic" }) open and add one bottle of that flavour
 *   openOrder({ mode: "bottles", add: "vanilla", qty: 2 }) open with two Vanilla bottles added
 */
export type OrderMode = "bottles" | string;
export type OpenOrder = { mode?: OrderMode; add?: string; qty?: number };

export const ORDER_EVENT = "bb:order";

export function openOrder(detail: OpenOrder = {}) {
  window.dispatchEvent(new CustomEvent<OpenOrder>(ORDER_EVENT, { detail }));
}
