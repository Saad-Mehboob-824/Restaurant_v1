"use client";

import { useEffect, useState, useRef } from "react";
// Use Next.js API routes (relative fetch). Removed axios backend `api` import.
import ProductSidebar from "@/components/MenuAdmin/ProductSidebar";
import ProductGrid from "@/components/MenuAdmin/ProductGrid";
import CartOverlay from "@/components/MenuAdmin/CartOverlay";
// import DesktopCartButton from "@/components/MenuAdmin/DesktopCartButton";
import Footer from '@/components/Customer/Footer';
import Header from '@/components/Customer/Header';
import { colors, iconBackgrounds } from '@/constants/colors';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [error, setError] = useState(null);

  const sectionRefs = useRef({});
  const gridRef = useRef(null);

  
  // fetch categories from Next.js API
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch categories');
      setCategories(json.data || []);
      if ((json.data || []).length > 0) {
        setSelectedCategory(json.data[0]._id);
      }
    } catch (err) {
      console.error('fetchCategories error', err);
      setError('Failed to load categories');
    }
  };

  // fetch items from Next.js API
  const fetchItems = async () => {
    try {
      const res = await fetch('/api/menu-items');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch items');
      // API returns array of items in json.data
      setItems(json.data || []);
    } catch (err) {
      console.error('fetchItems error', err);
      setError('Failed to load items');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  // scroll tracking
  useEffect(() => {
    // Wait until categories and the grid container are available
    if (!categories.length || !gridRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the intersecting entry closest to the top of the grid root.
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length) {
          let best = intersecting[0];
          let bestDistance = Math.abs(best.boundingClientRect.top);
          for (let i = 1; i < intersecting.length; i++) {
            const e = intersecting[i];
            const dist = Math.abs(e.boundingClientRect.top);
            if (dist < bestDistance) {
              best = e;
              bestDistance = dist;
            }
          }
          setSelectedCategory(best.target.dataset.category);
        }
      },
      { root: gridRef.current, rootMargin: "-50% 0px -40% 0px", threshold: 0 }
    );

    categories.forEach((cat) => {
      const el = sectionRefs.current[cat._id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories, gridRef]);

  if (error) {
    return <div className="text-red-500 font-medium p-4">{error}</div>;
  }

  return (
    <div style={{ backgroundColor: colors.bgPrimary, color: colors.textDark}}>
    <Header/>
    <div className="flex flex-col md:flex-row gap-5 p-5 pt-20 sm:pt-24 h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <div className="md:w-52 w-full md:h-auto md:max-h-[calc(100vh-7rem)] overflow-auto no-scrollbar">
        <ProductSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={(id) => {
            setSelectedCategory(id);
            sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth" });
          }}
          onCategoryAdded={(newCat) => {
            setCategories((prev) => [...prev, newCat]);
            setSelectedCategory(newCat._id);
          }}
          onCategoryUpdated={(updated) => {
            setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
          }}
          onCategoryDeleted={(id) => {
            setCategories((prev) => prev.filter((c) => c._id !== id));
            if (selectedCategory === id) {
              setSelectedCategory((cats) => (categories.length ? categories[0]?._id : null));
            }
          }}
        />
      </div>

      {/* Grid */}
      <div ref={gridRef} className="flex-1 overflow-auto px-1 py-2 no-scrollbar">
        <ProductGrid
          categories={categories}
          items={items}
          setItems={setItems}
          sectionRefs={sectionRefs}
        />
      </div>

      {/* Cart overlay (mobile bar + sheet). pass items so product info can be resolved */}
      <CartOverlay products={items} style={{ backgroundColor: colors.bgPrimary, color: '#000000ff'}}/>

      {/* Desktop floating cart button
      <DesktopCartButton /> */}
      
      

    </div>
    <Footer/>
    </div>
  );
}
