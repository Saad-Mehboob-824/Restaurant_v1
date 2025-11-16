"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserId } from "@/utils/auth/getCurrentUser";

export default function POSOverlay({ products = [] } = {}) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  const markUpdating = (id, v) => {
    setUpdatingIds((prev) => {
      if (v) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  // Load cart from localStorage
  const loadCart = async () => {
    setLoading(true);
    try {
      const local = JSON.parse(localStorage.getItem("posCart") || "[]");
      setCartItems(
        local.map((i) => ({
          cartItemId: i.menuItemId || i.id,
          menuItem: i.product ?? i.menuItemId ?? i.id,
          quantity: i.quantity ?? 1,
          _localItem: i,
          raw: i,
        }))
      );
    } catch (err) {
      console.error("Failed to load POS cart", err);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
    window.addEventListener("storage", loadCart);
    window.addEventListener("posCartUpdated", loadCart);

    return () => {
      window.removeEventListener("storage", loadCart);
      window.removeEventListener("posCartUpdated", loadCart);
    };
  }, []);

  const displayItems = useMemo(() => {
    return cartItems.map((it) => {
      const menuItemObj = it.menuItem && typeof it.menuItem === "object" ? it.menuItem : null;
      const menuItemId = menuItemObj ? (menuItemObj._id || menuItemObj.id) : (it.menuItem || it._localItem?.menuItemId);
      const productFromList = products.find((p) => p._id === menuItemId);
      const name = menuItemObj?.name || productFromList?.name || it._localItem?.product?.name || "Item";
      const basePrice = Number(it._localItem?.price ?? menuItemObj?.price ?? productFromList?.price ?? it._localItem?.product?.price ?? 0);
      const price = basePrice;
      const image = menuItemObj?.image || productFromList?.image || it._localItem?.product?.image || "/shopping-cart.svg";
      
      const variant = it._localItem?.variant || it.raw?.variant || '';
      const selectedSides = it._localItem?.selectedSides || it.raw?.selectedSides || [];

      return {
        id: it.cartItemId ?? menuItemId,
        cartItemId: it.cartItemId,
        menuItemId,
        name,
        price,
        quantity: it.quantity ?? 1,
        image,
        variant,
        selectedSides,
        raw: it.raw ?? it,
      };
    });
  }, [cartItems, products]);

  const subtotal = useMemo(
    () => displayItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0),
    [displayItems]
  );

  const tax = subtotal * 0.08;
  const deliveryFee = 0; // POS orders have no delivery fee
  const total = subtotal + tax + deliveryFee;

  const itemCount = useMemo(
    () => displayItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
    [displayItems]
  );

  const removeItem = async (item) => {
    try {
      const local = JSON.parse(localStorage.getItem("posCart") || "[]");
      // Match by menuItemId, variant, and selectedSides
      const filtered = local.filter((i) => {
        const sameMenuItem = (i.menuItemId || i.id) === item.menuItemId;
        const sameVariant = (i.variant || '') === (item.variant || '');
        const sameSides = JSON.stringify(i.selectedSides || []) === JSON.stringify(item.selectedSides || []);
        return !(sameMenuItem && sameVariant && sameSides);
      });
      localStorage.setItem("posCart", JSON.stringify(filtered));
      await loadCart();
      window.dispatchEvent(new Event("posCartUpdated"));
    } catch (err) {
      console.error("Failed to remove item from POS cart", err);
    }
  };

  const clearCart = async () => {
    try {
      localStorage.removeItem("posCart");
      await loadCart();
      window.dispatchEvent(new Event("posCartUpdated"));
    } catch (err) {
      console.error("Failed to clear POS cart", err);
    }
  };

  const updateQuantity = async (item, delta) => {
    const idForLock = item.id || item.menuItemId;
    const newQty = Math.max(0, (Number(item.quantity) || 0) + delta);
    if (updatingIds.includes(idForLock)) return;
    markUpdating(idForLock, true);
    try {
      const local = JSON.parse(localStorage.getItem("posCart") || "[]");
      
      // Find exact match by menuItemId, variant, and selectedSides
      const idx = local.findIndex((i) => {
        const sameMenuItem = (i.menuItemId || i.id) === item.menuItemId;
        const sameVariant = (i.variant || '') === (item.variant || '');
        const sameSides = JSON.stringify(i.selectedSides || []) === JSON.stringify(item.selectedSides || []);
        return sameMenuItem && sameVariant && sameSides;
      });
      
      if (idx >= 0) {
        if (newQty === 0) {
          local.splice(idx, 1);
        } else {
          local[idx].quantity = newQty;
        }
      } else if (newQty > 0) {
        // This shouldn't happen, but handle it gracefully
        local.push({
          menuItemId: item.menuItemId,
          quantity: newQty,
          variant: item.variant || '',
          selectedSides: item.selectedSides || [],
          price: item.price,
          product: products.find((p) => p._id === item.menuItemId)
        });
      }
      
      localStorage.setItem("posCart", JSON.stringify(local));
      await loadCart();
      window.dispatchEvent(new Event("posCartUpdated"));
    } catch (err) {
      console.error("Failed to update POS cart quantity", err);
    } finally {
      markUpdating(idForLock, false);
    }
  };

  const handlePrintReceipt = () => {
    // TODO: Implement receipt printing
    console.log("Print receipt - To be implemented");
    window.print();
  };

  const handlePaid = async () => {
    if (displayItems.length === 0) {
      alert("Cart is empty. Add items before processing payment.");
      return;
    }

    const userId = getUserId();
    if (!userId) {
      alert("User not authenticated. Please log in again.");
      return;
    }

    setProcessingPayment(true);

    try {
      // Prepare order payload
      const orderPayload = {
        userId,
        customerName: "POS",
        name: "POS",
        phone: "",
        customerNumber: "",
        email: "",
        customerEmail: "",
        type: "pickup", // POS orders are pickup by default
        orderType: "pickup",
        branch: "",
        source: "pos",
        paymentMethod,
        items: displayItems.map((it) => ({
          menuItemId: it.menuItemId || it.id,
          name: it.name,
          quantity: it.quantity,
          variant: it.variant || '',
          price: it.price,
          selectedSides: it.selectedSides || []
        })),
        totalAmount: total,
        total,
        status: "accepted", // POS orders start as accepted
        instructions: `POS Order - Payment Method: ${paymentMethod}`
      };

      console.log("Creating POS order:", orderPayload);

      // Create order via API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const result = await response.json();
      console.log("Order created successfully:", result);

      // Clear cart on success
      await clearCart();

      // Show success message
      alert(`Order created successfully! Order ID: ${result._id || 'N/A'}\nPayment Method: ${paymentMethod}\nTotal: Rs ${total.toFixed(0)}`);

      // Optional: Print receipt automatically
      if (confirm("Print receipt?")) {
        handlePrintReceipt();
      }

    } catch (error) {
      console.error('Failed to create POS order:', error);
      alert(`Failed to create order: ${error.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <>
      {/* Mobile Fixed Cart Bar */}
      {displayItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
          <button
            onClick={() => setMobileModalOpen(true)}
            className="w-full bg-neutral-900 text-white rounded-xl py-3 sm:py-4 px-4 sm:px-6 flex items-center justify-between hover:bg-neutral-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white text-neutral-900 rounded-full flex items-center justify-center font-semibold text-sm">
                {itemCount}
              </div>
              <span className="font-semibold text-sm sm:text-base">View Order</span>
            </div>
            <span className="font-semibold text-base sm:text-lg">Rs {total.toFixed(0)}</span>
          </button>
        </div>
      )}

      {/* Mobile Modal */}
      {mobileModalOpen && displayItems.length > 0 && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]" style={{ backgroundColor: '#f5f5f5' }}>
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-neutral-200 p-4 sm:p-6 flex items-center justify-between z-10 bg-neutral-900 text-white rounded-t-2xl">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Order Summary</h2>
              <button
                onClick={() => setMobileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center hover:bg-neutral-600 transition-all"
              >
                <span className="text-white text-xl">×</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 pb-32 sm:pb-40">
              {/* Cart Items */}
              <div className="space-y-3 sm:space-y-4 mb-6">
                {displayItems.map((it) => (
                  <div key={it.id} className="flex gap-3 p-3 sm:p-4 rounded-lg bg-white border border-neutral-200">
                    <img
                      src={it.image || "/shopping-cart.svg"}
                      alt={it.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base mb-1 line-clamp-2">{it.name}</h4>
                      {it.variant && (
                        <p className="text-xs sm:text-sm text-neutral-600 mb-1 line-clamp-1">Variant: {it.variant}</p>
                      )}
                      {it.selectedSides && it.selectedSides.length > 0 && (
                        <p className="text-xs sm:text-sm text-neutral-600 mb-2 line-clamp-1">
                          Sides: {it.selectedSides.map(s => s.sideName || s.name || s).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(it, -1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded border border-neutral-300 bg-white flex items-center justify-center hover:bg-neutral-50 text-neutral-700 text-xs"
                            disabled={updatingIds.includes(it.id)}
                          >
                            <span className="font-bold">−</span>
                          </button>
                          <span className="text-xs sm:text-sm font-semibold w-6 sm:w-8 text-center">{it.quantity}</span>
                          <button
                            onClick={() => updateQuantity(it, 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded border border-neutral-300 bg-white flex items-center justify-center hover:bg-neutral-50 text-neutral-700 text-xs"
                            disabled={updatingIds.includes(it.id)}
                          >
                            <span className="font-bold">+</span>
                          </button>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm">Rs {(it.price * it.quantity).toFixed(0)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(it)}
                      className="flex-shrink-0 text-red-500 hover:text-red-600 h-6 w-6 flex items-center justify-center text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6 bg-white p-4 rounded-lg border border-neutral-200">
                <label className="block text-xs sm:text-sm font-semibold text-neutral-900 mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2 sm:py-3 px-3 sm:px-4 rounded-lg border-2 font-medium text-xs sm:text-sm transition-all ${
                      paymentMethod === "cash"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`py-2 sm:py-3 px-3 sm:px-4 rounded-lg border-2 font-medium text-xs sm:text-sm transition-all ${
                      paymentMethod === "card"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    💳 Card
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-2 sm:space-y-3 bg-white p-4 sm:p-6 rounded-lg border border-neutral-200 mb-6">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-medium">Rs {subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-neutral-600">Delivery Fee</span>
                  <span className="font-medium">Rs {deliveryFee.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-neutral-600">Tax (8%)</span>
                  <span className="font-medium">Rs {tax.toFixed(0)}</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 sm:pt-3 flex justify-between">
                  <span className="font-bold text-base sm:text-lg">Total</span>
                  <span className="font-bold text-base sm:text-lg">Rs {total.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Fixed Footer in Modal */}
            <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-neutral-200 p-4 sm:p-6 space-y-2 sm:space-y-3">
              <button
                onClick={handlePaid}
                disabled={processingPayment}
                className="w-full py-3 sm:py-4 bg-green-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-green-700 transition-all disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {processingPayment ? "Processing..." : `✓ PAID - Rs ${total.toFixed(0)}`}
              </button>
              <button
                onClick={handlePrintReceipt}
                className="w-full py-2 sm:py-3 bg-white text-neutral-700 rounded-lg font-medium text-xs sm:text-sm border border-neutral-200 hover:bg-neutral-50 transition-all"
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop POS Overlay - Hidden on mobile, fully scrollable with max height */}
      <aside className="hidden lg:flex lg:w-80 xl:w-96 border-l border-neutral-200 bg-white flex-col max-h-screen overflow-y-auto">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 p-4 sm:p-6 border-b border-neutral-200 text-black">
          <div className="flex items-center justify-center mb-2 border border-red-300 bg-red-100 p-1 rounded-lg hover:bg-red-50">
            {itemCount > 0 && (
              <button
                onClick={clearCart}
                className="text-xs sm:text-sm text-red-400 hover:text-red-300 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Cart Items - Scrollable content */}
        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="text-center py-8 text-neutral-500 text-sm">Loading...</div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <div className="text-4xl mb-3">🛒</div>
              <p className="font-medium text-sm sm:text-base">Cart is empty</p>
              <p className="text-xs sm:text-sm mt-1">Select items from the menu</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {displayItems.map((it) => (
                <div key={it.id} className="flex gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                  <img
                    src={it.image || "/shopping-cart.svg"}
                    alt={it.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1 line-clamp-2">{it.name}</h4>
                    {it.variant && (
                      <p className="text-xs text-neutral-600 mb-0.5 sm:mb-1 line-clamp-1">{it.variant}</p>
                    )}
                    <div className="flex items-center justify-between mt-1 sm:mt-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => updateQuantity(it, -1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded border border-neutral-300 bg-white flex items-center justify-center hover:bg-neutral-50 text-neutral-700 text-xs"
                          disabled={updatingIds.includes(it.id)}
                        >
                          <span className="font-bold">−</span>
                        </button>
                        <span className="text-xs sm:text-sm font-semibold w-6 sm:w-8 text-center">{it.quantity}</span>
                        <button
                          onClick={() => updateQuantity(it, 1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded border border-neutral-300 bg-white flex items-center justify-center hover:bg-neutral-50 text-neutral-700 text-xs"
                          disabled={updatingIds.includes(it.id)}
                        >
                          <span className="font-bold">+</span>
                        </button>
                      </div>
                      <span className="font-semibold text-xs sm:text-sm">Rs {(it.price * it.quantity).toFixed(0)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(it)}
                    className="flex-shrink-0 text-red-500 hover:text-red-600 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center text-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary & Payment */}
        {displayItems.length > 0 && (
          <div className="border-t border-neutral-200 bg-white p-3 sm:p-4">
            {/* Payment Method */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5 sm:mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg border-2 font-medium text-xs sm:text-sm transition-all ${
                    paymentMethod === "cash"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg border-2 font-medium text-xs sm:text-sm transition-all ${
                    paymentMethod === "card"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  💳 Card
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-1.5 mb-3 sm:mb-4 bg-neutral-50 p-2.5 sm:p-3 rounded-lg">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">Rs {subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-neutral-600">Delivery Fee</span>
                <span className="font-medium">Rs {deliveryFee.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-neutral-600">Tax (8%)</span>
                <span className="font-medium">Rs {tax.toFixed(0)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-1.5 sm:pt-2 flex justify-between">
                <span className="font-bold text-base sm:text-lg">Total</span>
                <span className="font-bold text-base sm:text-lg">Rs {total.toFixed(0)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 sm:space-y-2">
              <button
                onClick={handlePaid}
                disabled={processingPayment}
                className="w-full py-3 sm:py-4 bg-black text-white rounded-xl font-bold text-sm sm:text-lg hover:bg-white hover:text-black border transition-all disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>Processing...</>
                ) : (
                  <>
                    ✓ PAID - Rs {total.toFixed(0)}
                  </>
                )}
              </button>
              <button
                onClick={handlePrintReceipt}
                className="w-full py-1.5 sm:py-2 bg-white text-neutral-700 rounded-lg font-medium text-xs sm:text-sm border border-neutral-200 hover:bg-neutral-50 transition-all"
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}