/**
 * Opens the order drawer from anywhere on the page.
 *   openOrder()                  just open it
 *   openOrder({ mode: "three" }) open on the 3-pack (a pack id from content/site.ts)
 *   openOrder({ add: "classic" }) open and add one bottle of that flavour
 */
export type OrderMode = "bottles" | string;
export type OpenOrder = { mode?: OrderMode; add?: string };

export const ORDER_EVENT = "bb:order";

export function openOrder(detail: OpenOrder = {}) {
  window.dispatchEvent(new CustomEvent<OpenOrder>(ORDER_EVENT, { detail }));
}
