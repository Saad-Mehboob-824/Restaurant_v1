"use client";

import { useEffect, useMemo, useState } from "react";
import { colors, iconBackgrounds } from '@/constants/colors';

export default function CartOverlay({ products = [], onCartUpdated } = {}) {
  const [open, setOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderError, setOrderError] = useState(null);
  
  // POS-specific state
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'card'
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');

  const markUpdating = (id, v) => {
    setUpdatingIds((prev) => {
      if (v) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  // Local-only cart loader
  const loadCart = async () => {
    setLoading(true);
    try {
      console.debug('[CartOverlay] loadCart called');
      const local = JSON.parse(localStorage.getItem("localCart") || "[]");
      console.debug('[CartOverlay] localCart contents:', local);
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
      console.error("Failed to load local cart", err);
      setCartItems([]);
    } finally {
      setLoading(false);
      onCartUpdated?.();
    }
  };

  useEffect(() => {
    loadCart();
    window.addEventListener("storage", loadCart);
    window.addEventListener("cartUpdated", loadCart);
    const openHandler = () => setOpen(true);
    window.addEventListener("openCart", openHandler);

    return () => {
      window.removeEventListener("storage", loadCart);
      window.removeEventListener("cartUpdated", loadCart);
      window.removeEventListener("openCart", openHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const displayItems = useMemo(() => {
    return cartItems.map((it) => {
      const menuItemObj = it.menuItem && typeof it.menuItem === "object" ? it.menuItem : null;
      const menuItemId = menuItemObj ? (menuItemObj._id || menuItemObj.id) : (it.menuItem || it._localItem?.menuItemId);
      const productFromList = products.find((p) => p._id === menuItemId);
      const name = menuItemObj?.name || productFromList?.name || it._localItem?.product?.name || "Item";
      // Use price from cart item if available (includes variant/sides pricing), otherwise use base price
      const basePrice = Number(it._localItem?.price ?? menuItemObj?.price ?? productFromList?.price ?? it._localItem?.product?.price ?? 0);
      const price = basePrice;
      const image = menuItemObj?.image || productFromList?.image || it._localItem?.product?.image || "/shopping-cart.svg";
      
      // Extract variant and selectedSides from raw cart item
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

  // POS calculations - no delivery fee, tax based on payment method (if applicable)
  // For now, same tax rate for both payment methods (8%)
  // Can be adjusted based on business requirements
  const taxRate = 0.08; // 8%
  const tax = subtotal * taxRate;
  // No delivery fee for POS/dinein orders
  const total = subtotal + tax;

  const itemCount = useMemo(
    () => displayItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
    [displayItems]
  );

  const removeItem = async (cartItemId) => {
    try {
      const local = JSON.parse(localStorage.getItem("localCart") || "[]");
      const filtered = local.filter((i) => (i.menuItemId || i.id) !== cartItemId);
      localStorage.setItem("localCart", JSON.stringify(filtered));
      await loadCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Failed to remove item from local cart", err);
    }
  };

  const clearCart = async () => {
    if (!confirm("Are you sure you want to clear your cart?")) return;
    try {
      localStorage.removeItem("localCart");
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setOrderSuccess(null);
      setOrderError(null);
      await loadCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Failed to clear local cart", err);
    }
  };

  // update quantity in local cart only
  const updateQuantity = async (cartItemId, menuItemId, currentQty, delta) => {
    const idForLock = cartItemId ?? menuItemId;
    const newQty = Math.max(0, (Number(currentQty) || 0) + delta);
    if (updatingIds.includes(idForLock)) return;
    markUpdating(idForLock, true);
    try {
      const local = JSON.parse(localStorage.getItem("localCart") || "[]");
      const idx = local.findIndex((i) => (i.menuItemId || i.id) === menuItemId);
      if (idx >= 0) {
        if (newQty === 0) local.splice(idx, 1);
        else local[idx].quantity = newQty;
      } else if (newQty > 0) {
        local.push({ menuItemId, quantity: newQty, product: products.find((p) => p._id === menuItemId) });
      }
      localStorage.setItem("localCart", JSON.stringify(local));
      await loadCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Failed to update local cart quantity", err);
    } finally {
      markUpdating(idForLock, false);
    }
  };

  // Place order directly (POS functionality)
  const placeOrder = async () => {
    if (displayItems.length === 0) {
      setOrderError('Cart is empty');
      return;
    }

    if (!customerName.trim()) {
      setOrderError('Please enter customer name');
      return;
    }

    setPlacingOrder(true);
    setOrderError(null);
    setOrderSuccess(null);

    try {
      // Prepare order payload
      const orderPayload = {
        customerName: customerName.trim(),
        phone: customerPhone.trim() || '',
        email: '',
        address: '',
        orderType: 'dinein',
        items: displayItems.map((it) => ({
          menuItemId: it.menuItemId,
          name: it.name,
          quantity: it.quantity,
          variant: it.variant || '',
          price: it.price,
          selectedSides: it.selectedSides || []
        })),
        totalAmount: total,
        status: 'accepted' // POS orders start as accepted
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create order');
      }

      const order = await response.json();
      
      // Store order for receipt printing
      setOrderSuccess(order);
      
      // Clear cart
      localStorage.removeItem("localCart");
      setCartItems([]);
      
      // Reset customer form after a delay (to show success message)
      setTimeout(() => {
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setPaymentMethod('cash');
        // Print receipt after showing success
        printReceipt(order);
      }, 1000);

    } catch (err) {
      console.error('Place order error:', err);
      setOrderError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Print receipt
  const printReceipt = (order) => {
    if (!order) return;

    // Get current user info from localStorage (if available)
    let employeeName = 'Staff';
    try {
      const userName = localStorage.getItem('userName');
      if (userName) employeeName = userName;
    } catch (e) {
      // Ignore
    }

    // Create receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${order._id}</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              font-weight: bold;
            }
            .info {
              margin: 10px 0;
              line-height: 1.6;
            }
            .items {
              margin: 20px 0;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              padding: 10px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
            }
            .item-name {
              flex: 1;
            }
            .item-qty {
              margin: 0 10px;
            }
            .totals {
              margin: 15px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .total-row.final {
              font-weight: bold;
              font-size: 14px;
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              border-top: 2px dashed #000;
              padding-top: 10px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RESTAURANT RECEIPT</h1>
          </div>
          <div class="info">
            <div><strong>Order ID:</strong> ${order._id.slice(-8).toUpperCase()}</div>
            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
            <div><strong>Customer:</strong> ${order.customer?.name || customerName}</div>
            ${order.customer?.phone ? `<div><strong>Phone:</strong> ${order.customer.phone}</div>` : ''}
            <div><strong>Employee:</strong> ${employeeName}</div>
            <div><strong>Payment:</strong> ${paymentMethod.toUpperCase()}</div>
          </div>
          <div class="items">
            ${order.items.map(item => `
              <div class="item">
                <span class="item-name">${item.name}${item.variant ? ` (${item.variant})` : ''}${item.selectedSides && item.selectedSides.length > 0 ? ` + ${item.selectedSides.map(s => s.name || s.sideName || s).join(', ')}` : ''}</span>
                <span class="item-qty">${item.quantity}x</span>
                <span>Rs ${(item.price * item.quantity).toFixed(0)}</span>
              </div>
            `).join('')}
          </div>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Rs ${subtotal.toFixed(0)}</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>Rs ${tax.toFixed(0)}</span>
            </div>
            <div class="total-row final">
              <span>TOTAL:</span>
              <span>Rs ${total.toFixed(0)}</span>
            </div>
          </div>
          <div class="footer">
            <div>Thank you for your order!</div>
            <div>Visit us again soon</div>
          </div>
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close window after printing
        setTimeout(() => printWindow.close(), 1000);
      }, 250);
    };
  };

  const renderCustomerForm = () => (
    <div className="space-y-4 mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.bgPrimary, border: `1px solid ${colors.borderLight}` }}>
      <h3 className="font-semibold text-sm mb-3">Customer Information</h3>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: colors.textDark }}>Customer Name *</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{ borderColor: colors.borderLight, backgroundColor: colors.bgSec }}
          placeholder="Walk-in Customer"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: colors.textDark }}>Phone (Optional)</label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{ borderColor: colors.borderLight, backgroundColor: colors.bgSec }}
          placeholder="Phone number"
        />
      </div>
    </div>
  );

  const renderPaymentMethod = () => (
    <div className="space-y-2 mb-6">
      <label className="block text-xs font-medium mb-2" style={{ color: colors.textDark }}>Payment Method</label>
      <div className="flex gap-3">
        <button
          onClick={() => setPaymentMethod('cash')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            paymentMethod === 'cash'
              ? 'bg-neutral-900 text-white'
              : 'bg-white border-2 text-neutral-700 hover:bg-neutral-50'
          }`}
          style={paymentMethod === 'cash' ? {} : { borderColor: colors.borderLight }}
        >
          Cash
        </button>
        <button
          onClick={() => setPaymentMethod('card')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            paymentMethod === 'card'
              ? 'bg-neutral-900 text-white'
              : 'bg-white border-2 text-neutral-700 hover:bg-neutral-50'
          }`}
          style={paymentMethod === 'card' ? {} : { borderColor: colors.borderLight }}
        >
          Card
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: colors.bgPrimary, color: colors.textDark}}>
      {/* Mobile Fixed Cart Bar */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
          <button
            onClick={() => setOpen(true)}
            className="w-full bg-neutral-900 text-white rounded-xl py-4 px-6 flex items-center justify-between hover:bg-neutral-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white text-neutral-900 rounded-full flex items-center justify-center font-semibold text-sm">
                {itemCount}
              </div>
              <span className="font-semibold">View Cart</span>
            </div>
            <span className="font-semibold text-lg">Rs {total.toFixed(0)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Modal */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" style={{ backgroundColor: colors.bgPrimary, color: colors.textDark}}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]" style={{ backgroundColor: colors.bgSec }}>
            <div className="sticky top-0 border-b border-neutral-200 p-4 flex items-center justify-between z-10" style={{ backgroundColor: colors.bgSec }}>
              <h2 className="text-xl font-semibold tracking-tight">POS Terminal</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  setOrderError(null);
                  setOrderSuccess(null);
                }}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-all"
              >
                <span className="text-neutral-600 text-xl">×</span>
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-center py-8 text-neutral-500">Loading...</div>
              ) : displayItems.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <div className="w-12 h-12 mx-auto mb-2 text-neutral-300">🛒</div>
                  <p>Cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {displayItems.map((it) => (
                      <div key={it.id} className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: colors.bgPrimary }}>
                        <img
                          src={it.image || "/shopping-cart.svg"}
                          alt={it.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">{it.name}</h4>
                          {it.variant && (
                            <p className="text-xs text-neutral-600 mb-1">Variant: {it.variant}</p>
                          )}
                          {it.selectedSides && it.selectedSides.length > 0 && (
                            <p className="text-xs text-neutral-600 mb-1">
                              Sides: {it.selectedSides.map(s => s.sideName || s.name || s).join(', ')}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(it.cartItemId ?? it.id, it.menuItemId, it.quantity, -1)}
                                className="w-7 h-7 rounded border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50"
                                disabled={updatingIds.includes(it.cartItemId ?? it.id)}
                              >
                                <span className="text-sm">−</span>
                              </button>
                              <span className="text-sm font-medium w-6 text-center">{it.quantity}</span>
                              <button
                                onClick={() => updateQuantity(it.cartItemId ?? it.id, it.menuItemId, it.quantity, 1)}
                                className="w-7 h-7 rounded border border-neutral-200 bg-white flex items-center justify-center text-neutral-700 hover:bg-neutral-50"
                                disabled={updatingIds.includes(it.cartItemId ?? it.id)}
                              >
                                <span className="text-sm text-neutral-700">+</span>
                              </button>
                            </div>
                            <span className="font-semibold text-sm">Rs {(it.price * it.quantity).toFixed(0)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(it.id)}
                          className="flex-shrink-0 text-red-500 hover:text-red-600"
                        >
                          <span className="text-lg">🗑️</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {renderCustomerForm()}
                  {renderPaymentMethod()}

                  <div className="border-t border-neutral-200 pt-4 space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Subtotal</span>
                      <span className="font-medium">Rs {subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Tax</span>
                      <span className="font-medium">Rs {tax.toFixed(0)}</span>
                    </div>
                    <div className="border-t border-neutral-200 pt-3 flex justify-between">
                      <span className="font-semibold text-lg">Total</span>
                      <span className="font-semibold text-lg">Rs {total.toFixed(0)}</span>
                    </div>
                  </div>

                  {orderError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {orderError}
                    </div>
                  )}

                  {orderSuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                      Order placed successfully! Order ID: {orderSuccess._id.slice(-8).toUpperCase()}
                    </div>
                  )}

                  <button
                    onClick={placeOrder}
                    disabled={placingOrder || displayItems.length === 0}
                    className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      placingOrder || displayItems.length === 0
                        ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {placingOrder ? 'Placing Order...' : 'Place Order'}
                    {!placingOrder && <span>✓</span>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Cart Sidebar */}
      {itemCount > 0 && (
        <aside className="hidden lg:block w-96 border-l border-neutral-200 sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto" style={{ backgroundColor: colors.bgSec }}>
          <div className="p-6 flex flex-col h-full" style={{ backgroundColor: colors.bgSec }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold tracking-tight">POS Terminal</h2>
              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:underline font-medium"
              >
                Clear
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-neutral-500">Loading...</div>
            ) : displayItems.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <div className="w-12 h-12 mx-auto mb-2 text-neutral-300">🛒</div>
                <p>Cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6 overflow-auto flex-1 pr-2">
                  {displayItems.map((it) => (
                    <div key={it.id} className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: colors.bgPrimary }}>
                      <img
                        src={it.image || "/shopping-cart.svg"}
                        alt={it.name}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{it.name}</h4>
                        {it.variant && (
                          <p className="text-xs text-neutral-600 mb-1">Variant: {it.variant}</p>
                        )}
                        {it.selectedSides && it.selectedSides.length > 0 && (
                          <p className="text-xs text-neutral-600 mb-1">
                            Sides: {it.selectedSides.map(s => s.sideName || s.name || s).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(it.cartItemId ?? it.id, it.menuItemId, it.quantity, -1)}
                              className="w-7 h-7 rounded border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50"
                              disabled={updatingIds.includes(it.cartItemId ?? it.id)}
                            >
                              <span className="text-sm">−</span>
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{it.quantity}</span>
                            <button
                              onClick={() => updateQuantity(it.cartItemId ?? it.id, it.menuItemId, it.quantity, 1)}
                              className="w-7 h-7 rounded border border-neutral-200 bg-white flex items-center justify-center hover:bg-neutral-50"
                              disabled={updatingIds.includes(it.cartItemId ?? it.id)}
                            >
                              <span className="text-sm">+</span>
                            </button>
                          </div>
                          <span className="font-semibold text-sm">Rs {(it.price * it.quantity).toFixed(0)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="flex-shrink-0 text-red-500 hover:text-red-600"
                      >
                        <span className="text-lg">🗑️</span>
                      </button>
                    </div>
                  ))}
                </div>

                {renderCustomerForm()}
                {renderPaymentMethod()}

                <div className="border-t border-neutral-200 pt-4 space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-medium">Rs {subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Tax</span>
                    <span className="font-medium">Rs {tax.toFixed(0)}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 flex justify-between">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="font-semibold text-lg">Rs {total.toFixed(0)}</span>
                  </div>
                </div>

                {orderError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {orderError}
                  </div>
                )}

                {orderSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    Order placed successfully! Order ID: {orderSuccess._id.slice(-8).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={placeOrder}
                  disabled={placingOrder || displayItems.length === 0}
                  className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    placingOrder || displayItems.length === 0
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {placingOrder ? 'Placing Order...' : 'Place Order'}
                  {!placingOrder && <span>✓</span>}
                </button>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
