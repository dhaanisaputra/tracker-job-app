'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, Tags, User } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/statistik', label: 'Statistik', icon: BarChart3 },
  { href: '/sumber', label: 'Sumber', icon: Tags },
  { href: '/akun', label: 'Akun', icon: User },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone/30 bg-paper md:hidden">
        <div className="grid grid-cols-4">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? 'text-trailblaze' : 'text-stone'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      <aside className="fixed left-0 top-0 hidden h-dvh w-52 border-r border-stone/30 bg-paper p-4 md:block">
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="h-3 w-3 rounded-full bg-trailblaze" />
          <span className="font-display text-sm font-bold">Lamaranku</span>
        </div>
        <div className="mt-6 flex flex-col gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? 'bg-trailblaze/10 text-trailblaze' : 'text-stone hover:bg-stone/10'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </div>
      </aside>
    </>
  )
}