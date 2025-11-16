"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import { colors } from "@/constants/colors";
// import AddItemModal from "./AddItemModal";

export default function ProductGrid({ categories, items, setItems, sectionRefs }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleItemAdded = (newItem) => {
    if (!newItem) return;
    setItems((prev) => [...prev, newItem]);
  };

  return (
    <div className="flex-1">
      {categories.map((cat) => {
        const filtered = items.filter((item) => {
          if (!item) return false;
          const catField = item.category;
          if (!catField) return false;
          // category may be an object ({ _id }) or a string id
          const itemCatId = typeof catField === "string" ? catField : (catField._id ?? catField.id);
          return itemCatId === cat._id;
        });

        return (
          <div
            key={cat._id}
            ref={(el) => (sectionRefs.current[cat._id] = el)}
            data-category={cat._id}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textDark }}>
              {cat.name}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => (
                console.log(item),
                <ProductCard key={item._id} product={item} />
              ))}
            </div>
            <hr className="mt-6" style={{ borderColor: colors.borderLight }} />
          </div>
        );
      })}

      {/* <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryId={selectedCategory}
        onSuccess={handleItemAdded}
      /> */}
    </div>
  );
}
