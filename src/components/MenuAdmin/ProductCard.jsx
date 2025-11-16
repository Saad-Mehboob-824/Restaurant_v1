"use client";

import { useState } from 'react'
import { colors, buttons } from "@/constants/colors";
import ProductModal from './ProductModal'

export default function ProductCard({ product }) {
  const [showModal, setShowModal] = useState(false)

  const hasVariants = product.variants && product.variants.length > 0
  const hasSides = product.sides && product.sides.length > 0
  const needsModal = hasVariants || hasSides

  const handleAddToCart = (cartItem) => {
    try {
      const raw = localStorage.getItem("localCart");
      const cart = raw ? JSON.parse(raw) : [];
      
      // Check if item with same menuItemId, variant, and sides already exists
      const idx = cart.findIndex((c) => {
        const sameMenuItem = c.menuItemId === cartItem.menuItemId
        const sameVariant = c.variant === cartItem.variant
        const sameSides = JSON.stringify(c.selectedSides || []) === JSON.stringify(cartItem.selectedSides || [])
        return sameMenuItem && sameVariant && sameSides
      });

      if (idx >= 0) {
        cart[idx].quantity = Number(cart[idx].quantity || 0) + cartItem.quantity;
      } else {
        cart.push(cartItem);
      }

      localStorage.setItem("localCart", JSON.stringify(cart));
      // notify cart overlay / desktop button
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Add to local cart failed", err);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (needsModal) {
      setShowModal(true);
    } else {
      // Direct add to cart for items without variants/sides
      handleAddToCart({
        menuItemId: product._id,
        name: product.name,
        description: product.description,
        image: product.image,
        price: product.price || 0,
        quantity: 1,
        variant: '',
        selectedSides: [],
        product: product
      });
    }
  };

  return (
    <>
      <div
        className="rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
        onClick={() => setShowModal(true)}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover"
        />

        <div className="p-4 border rounded-b-xl" style={{ backgroundColor: colors.bgSec, color: colors.textDark, borderColor: colors.borderLight }}>
          <h3 className="font-semibold text-lg mb-1" style={{ color: colors.textDark }}>{product.name}</h3>
          <p className="text-sm mb-3" style={{ color: colors.textMuted }}>{product.description}</p>

          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold" style={{ color: colors.textDark }}>Rs {product.price}</span>
            <button
              onClick={handleAddClick}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: buttons.primary.background, color: buttons.primary.text }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <ProductModal
        product={product}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAddToCart={handleAddToCart}
      />
    </>
  );
}