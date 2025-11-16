'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Check } from 'lucide-react'
import Image from 'next/image'

export default function ProductModal({ product, isOpen, onClose, onAddToCart }) {
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedSides, setSelectedSides] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(product?.price || 0)

  useEffect(() => {
    if (product) {
      // Initialize with first variant if variants exist
      if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0])
        setPrice(product.variants[0].price || product.price || 0)
      } else {
        setSelectedVariant(null)
        setPrice(product.price || 0)
      }
      setSelectedSides([])
      setQuantity(1)
    }
  }, [product])

  useEffect(() => {
    // Calculate price based on variant and sides
    let basePrice = product?.price || 0
    
    if (selectedVariant) {
      basePrice = selectedVariant.price || basePrice
    }
    
    const sidesPrice = selectedSides.reduce((sum, side) => sum + (side.extraPrice || 0), 0)
    const finalPrice = (basePrice + sidesPrice) * quantity
    
    setPrice(finalPrice)
  }, [selectedVariant, selectedSides, quantity, product])

  if (!isOpen || !product) return null

  const hasVariants = product.variants && product.variants.length > 0
  const hasSides = product.sides && product.sides.length > 0

  const handleSideToggle = (side) => {
    setSelectedSides(prev => {
      const exists = prev.find(s => s.name === side.name)
      if (exists) {
        return prev.filter(s => s.name !== side.name)
      } else {
        return [...prev, side]
      }
    })
  }

  const handleAddToCartClick = () => {
    if (hasVariants && !selectedVariant) {
      return // Don't allow adding without variant
    }

    const cartItem = {
      menuItemId: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: price / quantity, // Price per item
      quantity: quantity,
      variant: selectedVariant ? selectedVariant.variant : '',
      selectedSides: selectedSides.map(side => ({
        sideName: side.name,
        optionName: side.name,
        extraPrice: side.extraPrice || 0
      })),
      product: product // Store full product for reference
    }

    onAddToCart(cartItem)
    onClose()
  }

  const basePricePerItem = selectedVariant 
    ? (selectedVariant.price || product.price || 0)
    : (product.price || 0)

  const sidesPricePerItem = selectedSides.reduce((sum, side) => sum + (side.extraPrice || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-neutral-200 flex items-center justify-center hover:bg-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-neutral-700" />
        </button>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Product Image */}
          <div className="relative w-full bg-neutral-100" style={{ minHeight: '300px', maxHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={product.image}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '400px' }}
              onError={(e) => {
                e.target.src = 'https://placehold.co/800x400'
              }}
            />
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">{product.name}</h2>
              <p className="text-neutral-600">{product.description || ''}</p>
            </div>

          {/* Variants Section */}
          {hasVariants && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-neutral-900 mb-3 block">
                Size / Variant <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {product.variants.map((variant, idx) => {
                  const isSelected = selectedVariant?.variant === variant.variant
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedVariant(variant)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected 
                          ? 'border-neutral-900 bg-neutral-900' 
                          : 'border-neutral-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {variant.img && (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                          <Image
                            src={variant.img}
                            alt={variant.variant}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-medium text-neutral-900">{variant.variant}</span>
                        <span className="font-semibold text-neutral-900">
                          Rs {variant.price?.toFixed(0) || '0'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sides Section */}
          {hasSides && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-neutral-900 mb-3 block">
                Sides / Add-ons
              </label>
              <div className="space-y-2">
                {product.sides.map((side, idx) => {
                  const isSelected = selectedSides.some(s => s.name === side.name)
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSideToggle(side)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'border-neutral-900 bg-neutral-900' 
                          : 'border-neutral-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {side.img && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                              <Image
                                src={side.img}
                                alt={side.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                          <span className="font-medium text-neutral-900">{side.name}</span>
                        </div>
                        <span className="font-semibold text-neutral-900">
                          +Rs {side.extraPrice?.toFixed(0) || '0'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6 pb-6 border-b border-neutral-200">
            <label className="text-sm font-semibold text-neutral-900 mb-3 block">
              Quantity
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg border-2 border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
              >
                <Minus className="w-4 h-4 text-neutral-700" />
              </button>
              <span className="text-xl font-semibold text-neutral-900 w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg border-2 border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-neutral-700" />
              </button>
            </div>
          </div>

          {/* Price Summary */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">
                {selectedVariant ? selectedVariant.variant : 'Base'} Price
              </span>
              <span className="font-medium text-neutral-900">
                Rs {(basePricePerItem * quantity).toFixed(0)}
              </span>
            </div>
            {selectedSides.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  Sides ({selectedSides.length})
                </span>
                <span className="font-medium text-neutral-900">
                  +Rs {(sidesPricePerItem * quantity).toFixed(0)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
              <span className="text-lg font-semibold text-neutral-900">Total</span>
              <span className="text-2xl font-bold text-neutral-900">
                Rs {price.toFixed(0)}
              </span>
            </div>
          </div>
          </div>
        </div>

        {/* Footer with Add to Cart Button */}
        <div className="border-t border-neutral-200 p-6 bg-neutral-50">
          <button
            onClick={handleAddToCartClick}
            disabled={hasVariants && !selectedVariant}
            className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              hasVariants && !selectedVariant
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <Plus className="w-5 h-5" />
            Add to Cart - Rs {price.toFixed(0)}
          </button>
          {hasVariants && !selectedVariant && (
            <p className="text-xs text-red-600 text-center mt-2">
              Please select a variant
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

