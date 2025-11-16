"use client";

import { useState } from "react";
import Image from "next/image";
import { colors, buttons } from "@/constants/colors";

export default function ProductSidebar({
  categories,
  selectedCategory,
  onSelect,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // You should consider fetching the user role client-side only
  // if this component needs to be rendered without server-side user data.
  let isAdmin = false;
  try {
    // Note: window is not defined during server-side rendering (SSR)
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;
      isAdmin = user?.role === "super_admin";
    }
  } catch (e) {
    isAdmin = false;
  }

  // Common styling for both mobile and desktop views
  const categoryItemBaseClasses = "transition-all font-medium";

  return (
    <>
      {/* This single container handles both views:
        - Mobile (< 1024px): flex, overflow-x-auto, whitespace-nowrap (horizontal scroll bar)
        - Desktop (>= 1024px): lg:block, lg:w-64 (vertical sidebar container)
      */}
      <div 
        className="flex overflow-x-auto whitespace-nowrap space-x-2 p-2 
                   lg:block lg:w-64 lg:space-x-0 lg:p-0"
      >
        {/*
          This inner container controls the flow of the items:
          - Mobile: Default (flex row)
          - Desktop: lg:flex-col and lg:space-y-2 (vertical stack)
        */}
        <div className="lg:flex lg:flex-col lg:space-y-2">
          {categories.map((cat) => {
            const isActive = String(selectedCategory) === String(cat._id);
            
            // Determine styles to apply via the 'style' prop (for dynamic colors)
            const styleProps = isActive 
              ? { 
                  backgroundColor: '#1a1a1a',
                  color: '#ffffff',
                }
              : {
                  backgroundColor: '#f5f5f5',
                  color: '#000000',
                };
                
            return (
              <button
                key={cat._id}
                onClick={() => onSelect(cat._id)}
                style={styleProps}
                className={`${categoryItemBaseClasses} flex-shrink-0 px-4 py-2.5 rounded-full text-sm lg:w-full lg:text-left lg:px-4 lg:py-2.5 lg:rounded-lg transition-all duration-200 hover:opacity-85 ${
                  !isActive ? 'hover:bg-neutral-200' : ''
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}