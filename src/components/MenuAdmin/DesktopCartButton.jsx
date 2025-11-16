// "use client";

// import { useEffect, useState } from "react";
// import Image from "next/image";
// import api from "@/services/api";
// import ShoppingCartIcon from "@/public/shopping-cart.svg";

// export default function DesktopCartButton() {
//   const [count, setCount] = useState(0);
//   const [total, setTotal] = useState(0);

//   const loadCart = async () => {
//     try {
//       const tokenNow = typeof window !== "undefined" ? localStorage.getItem("token") : null;
//       if (tokenNow) {
//         const res = await api.get("cart", { headers: { Authorization: `Bearer ${tokenNow}` } });
//         const serverItems = res?.data?.items ?? res?.data?.data?.items ?? [];
//         const itemCount = serverItems.reduce((s, it) => s + (it.quantity ?? 1), 0);
//         const sum = serverItems.reduce((s, it) => {
//           const price = Number(it.menuItem?.price ?? 0);
//           return s + price * (it.quantity ?? 1);
//         }, 0);
//         setCount(itemCount);
//         setTotal(sum);
//       } else {
//         const local = JSON.parse(localStorage.getItem("localCart") || "[]");
//         const itemCount = local.reduce((s, it) => s + (it.quantity ?? 1), 0);
//         const sum = local.reduce((s, it) => s + (Number(it.product?.price ?? 0) * (it.quantity ?? 1)), 0);
//         setCount(itemCount);
//         setTotal(sum);
//       }
//     } catch (err) {
//       console.error("Failed to load cart (desktop button)", err);
//       setCount(0);
//       setTotal(0);
//     }
//   };

//   useEffect(() => {
//     loadCart();
//     const onUpdate = () => loadCart();
//     window.addEventListener("storage", onUpdate);
//     window.addEventListener("cartUpdated", onUpdate);
//     return () => {
//       window.removeEventListener("storage", onUpdate);
//       window.removeEventListener("cartUpdated", onUpdate);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <button
//       className="hidden md:flex items-center gap-3 fixed right-6 bottom-6 z-50 bg-white border shadow-lg rounded-full px-3 py-2 hover:shadow-2xl"
//       onClick={() => window.dispatchEvent(new Event("openCart"))}
//       aria-label="Open cart"
//       title="Open cart"
//     >
//       <div className="relative w-8 h-8">
//         <Image src={ShoppingCartIcon} alt="Cart" width={24} height={24} className="object-contain" />
//         {count > 0 && (
//           <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-semibold rounded-full px-2 py-0.5">
//             {count}
//           </span>
//         )}
//       </div>
//       <div className="hidden lg:flex flex-col text-left">
//         <span className="text-sm font-medium">Cart</span>
//         <span className="text-xs text-gray-500">Rs {total}</span>
//       </div>
//     </button>
//   );
// }