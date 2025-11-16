"use client";

import { useState } from 'react'
import ProductModal from '../Menu/ProductModal'

export default function POSProductCard({ product }) {
  const [showModal, setShowModal] = useState(false)

  const hasVariants = product.variants && product.variants.length > 0
  const hasSides = product.sides && product.sides.length > 0
  const needsModal = hasVariants || hasSides

  const handleAddToCart = (cartItem) => {
    try {
      const raw = localStorage.getItem("posCart");
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

      localStorage.setItem("posCart", JSON.stringify(cart));
      // notify POS overlay
      window.dispatchEvent(new Event("posCartUpdated"));
    } catch (err) {
      console.error("Add to POS cart failed", err);
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
        className="rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 bg-white border border-neutral-200"
        onClick={() => setShowModal(true)}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-32 sm:h-40 lg:h-48 object-cover"
        />

        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-1 text-neutral-900 line-clamp-2">{product.name}</h3>
          <p className="text-xs sm:text-sm mb-2 sm:mb-3 text-neutral-600 line-clamp-2">{product.description}</p>

          <div className="flex items-center justify-between">
            <span className="text-lg sm:text-xl font-semibold text-neutral-900">Rs {product.price}</span>
            <button
              onClick={handleAddClick}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-neutral-900 text-white rounded-lg text-xs sm:text-sm font-medium transition-all hover:bg-neutral-800"
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
