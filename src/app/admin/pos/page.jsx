"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import ProductSidebar from "@/components/POS/ProductSidebar";
import POSProductGrid from "@/components/POS/POSProductGrid";
import POSOverlay from "@/components/POS/POSOverlay";

export default function POSPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sectionRefs = useRef({});
  const gridRef = useRef(null);

  // Check authentication via API (server-side check)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token: '' })
        });
        
        if (!res.ok) {
          window.location.href = '/84588878l00o00g00i00n76580982';
          return;
        }
        
        setAuthChecked(true);
      } catch (err) {
        console.error('Auth check failed:', err);
        window.location.href = '/84588878l00o00g00i00n76580982';
      }
    };

    checkAuth();
  }, []);

  // Fetch categories
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

  // Fetch items (including unavailable items for admin)
  const fetchItems = async () => {
    try {
      const res = await fetch('/api/menu-items?admin=true');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch items');
      setItems(json.data || []);
    } catch (err) {
      console.error('fetchItems error', err);
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  // Scroll tracking for active category
  useEffect(() => {
    if (!categories.length || !gridRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-500">Checking authentication...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white text-black border-b border-neutral-300">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/admin'}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 border-neutral-700 bg-white hover:bg-neutral-700 transition-colors"
                aria-label="Back to admin"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  Point of Sale
                </h1>
                <p className="text-sm text-neutral-400 mt-0.5">Fast checkout for walk-in customers</p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
                } catch (e) {
                  console.error('Logout request failed', e)
                } finally {
                  window.location.href = '/84588878l00o00g00i00n76580982'
                }
              }}
              className="px-4 py-2 bg-red-100 text-red-600 border border-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-5rem)] flex-col lg:flex-row">
        {/* Left: Categories Sidebar - Hidden on mobile, visible on lg */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block lg:w-56 xl:w-64 bg-white border-r border-neutral-200 overflow-auto transition-all`}>
          <ProductSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={(id) => {
              setSelectedCategory(id);
              sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth" });
              setSidebarOpen(false); 
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

        {/* Middle: Product Grid */}
        <div ref={gridRef} className="flex-1 overflow-auto px-4 sm:px-6 py-6 bg-neutral-50">
          {loading ? (
            <div className="text-center py-12 text-neutral-500">
              <div className="text-4xl mb-3">⏳</div>
              <p>Loading menu...</p>
            </div>
          ) : (
            <POSProductGrid
              categories={categories}
              items={items}
              sectionRefs={sectionRefs}
            />
          )}
        </div>

        {/* Right: POS Overlay - Responsive width */}
        <POSOverlay products={items} />
      </div>
    </div>
  );
}
