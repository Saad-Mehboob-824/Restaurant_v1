 'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRestaurant } from '@/hooks/useRestaurant'

export default function Sidebar({ onClose, isOpen = false, isDesktop = true }) {
  const router = useRouter()
  const { restaurant, loading } = useRestaurant()

  async function handleLogout(e) {
    e.preventDefault()
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch (err) {
      console.error('Logout failed', err)
    } finally {
      router.push('/84588878l00o00g00i00n76580982')
    }
  }

  // When viewport width is >870px behave as desktop (always visible). Otherwise act as drawer.
  const mobileTransform = isDesktop ? 'translate-x-0' : (isOpen ? 'translate-x-0' : '-translate-x-full')

  return (
    <aside className={`fixed z-40 inset-y-0 left-0 w-72 transform ${mobileTransform} transition-transform`}>
      <div className="h-full flex flex-col bg-white border-r border-neutral-200 shadow-sm">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-neutral-200">
          {restaurant?.logo ? (
            <div className="relative h-9 w-9 rounded-md overflow-hidden flex-shrink-0">
              <Image
                src={restaurant.logo}
                alt={restaurant.name || 'Restaurant Logo'}
                fill
                className="object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className="hidden h-9 w-9 rounded-md bg-neutral-900 text-white items-center justify-center text-sm tracking-tight font-medium">SL</div>
            </div>
          ) : (
            <div className="h-9 w-9 rounded-md bg-neutral-900 text-white flex items-center justify-center text-sm tracking-tight font-medium">SL</div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-neutral-900">Admin</span>
            <span className="text-[11px] text-neutral-500">Dashboard</span>
          </div>
          {!isDesktop && (
            <button onClick={onClose} className="ml-auto inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-neutral-50 text-neutral-700 transition-colors" aria-label="Close sidebar">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto pt-4 pb-4 px-3">
          <div className="text-[11px] uppercase tracking-[0.08em] text-neutral-500 px-2 mb-2 font-medium">Overview</div>
          <Link href="/admin" onClick={() => onClose?.()} className="group flex items-center gap-3 px-2 py-2 rounded-md bg-neutral-900 text-white border border-neutral-900">
            <span className="text-sm font-medium">Dashboard</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">Live</span>
          </Link>
          <Link href="/admin/pos" onClick={() => onClose?.()} className="group flex items-center gap-3 mt-1 px-2 py-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">Point of Sale</Link>
          <Link href="/admin/Orders" onClick={() => onClose?.()} className="group flex items-center gap-3 mt-1 px-2 py-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">Orders</Link>
          <Link href="/admin/MenuManagement" onClick={() => onClose?.()} className="group flex items-center gap-3 mt-1 px-2 py-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">Products</Link>
          <Link href="/admin/Customers" onClick={() => onClose?.()} className="group flex items-center gap-3 mt-1 px-2 py-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">Customers</Link>

          <div className="mt-6 text-[11px] uppercase tracking-[0.08em] text-neutral-500 px-2 mb-2 font-medium">Insights</div>
          <Link href="#" className="group flex items-center gap-3 px-2 py-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">Reports</Link>

          <div className="mt-6 text-[11px] uppercase tracking-[0.08em] text-neutral-500 px-2 mb-2 font-medium">Manage</div>
          <Link href="/admin/profile" onClick={() => onClose?.()} className="group flex items-center gap-3 px-2 py-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">Restaurant Profile</Link>
          <button onClick={handleLogout} className="w-full text-left px-2 py-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">Logout</button>
        </nav>
      </div>
    </aside>
  )
}
