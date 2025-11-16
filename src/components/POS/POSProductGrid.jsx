"use client";

import POSProductCard from "./POSProductCard";

export default function POSProductGrid({ categories, items, sectionRefs }) {
  return (
    <div className="flex-1">
      {categories.map((cat) => {
        const filtered = items.filter((item) => {
          if (!item) return false;
          const catField = item.category;
          if (!catField) return false;
          const itemCatId = typeof catField === "string" ? catField : (catField._id ?? catField.id);
          return itemCatId === cat._id;
        });

        return (
          <div
            key={cat._id}
            ref={(el) => (sectionRefs.current[cat._id] = el)}
            data-category={cat._id}
            className="mb-6 sm:mb-8"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-neutral-900">
              {cat.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {filtered.map((item) => (
                <POSProductCard key={item._id} product={item} />
              ))}
            </div>
            <hr className="mt-4 sm:mt-6 border-neutral-200" />
          </div>
        );
      })}
    </div>
  );
}
