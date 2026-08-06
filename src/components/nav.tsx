'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { startTransition } from 'react'
import { LayoutDashboard, Briefcase, Tags, BarChart3, User, ChevronsLeft, ChevronsRight, LogOut, Flame, Plus } from 'lucide-react'
import { signOut } from '@/app/auth-actions'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConfirmDialog } from '@/components/confirm-dialog'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lamaran', label: 'Lamaran', icon: Briefcase },
  { href: '/statistik', label: 'Statistik', icon: BarChart3 },
  { href: '/sumber', label: 'Sumber', icon: Tags },
  { href: '/akun', label: 'Akun', icon: User },
]

export function Nav({ user, streak }: { user: { email?: string | null; profile?: { name?: string | null } | null } | null; streak: number }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const displayName = user?.profile?.name || user?.email || ''
  const initialChar = (displayName || '?').charAt(0).toUpperCase()
  const roleLine = user?.email || ''

  useEffect(() => {
    const saved = localStorage.getItem('nav-collapsed') === '1'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, hydrate collapsed state + CSS var from localStorage
    setCollapsed(saved)
    document.documentElement.dataset.nav = saved ? 'collapsed' : 'open'
  }, [])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('nav-collapsed', next ? '1' : '0')
    document.documentElement.dataset.nav = next ? 'collapsed' : 'open'
  }

  const isActive = (href: string) => (href === '/lamaran' ? pathname.startsWith('/lamaran') : pathname.startsWith(href))

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper md:hidden">
        <div className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
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

      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-0 hidden h-dvh flex-col border-r border-line bg-paper transition-[width] duration-200 md:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-2 px-3 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <span className="h-3 w-3 shrink-0 rounded-full bg-trailblaze" />
          {!collapsed && (
            <span className="font-display text-xl font-extrabold leading-none tracking-tight">
              <span className="text-trailblaze">Lamar</span>
              <span className="text-ink">anku</span>
            </span>
          )}
        </div>

        {/* Profile header */}
        {!collapsed && (
          <div className="mx-2 mb-4 flex items-center gap-3 border-b border-line px-2 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-trailblaze/15 font-display text-lg font-bold text-trailblaze">
              {initialChar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-ink">{displayName}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <Flame size={12} className="text-trailblaze" fill="currentColor" />
                <span className="font-mono text-xs font-bold text-trailblaze">{streak} hari streak</span>
              </div>
              <p className="truncate text-xs text-stone">{roleLine}</p>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  collapsed ? 'justify-center px-0' : ''
                } ${active ? 'bg-trailblaze/15 text-trailblaze' : 'text-stone hover:bg-stone/10'}`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-auto flex flex-col gap-1 px-2 pb-4">
          <Link
            href="/lamaran/baru"
            title={collapsed ? 'Tambah Lamaran' : undefined}
            className={`inline-flex items-center justify-center gap-1 rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${
              collapsed ? 'w-full' : ''
            }`}
          >
            <Plus size={16} /> {!collapsed && 'Tambah Lamaran'}
          </Link>
          <div className={`flex items-center gap-1 ${collapsed ? 'flex-col' : 'justify-between'}`}>
            <ThemeToggle />
            <button type="button" onClick={toggleCollapse} aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'} className="rounded-lg p-2 text-stone hover:bg-stone/10">
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            title={collapsed ? 'Keluar' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ember hover:bg-ember/10 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut size={18} className="shrink-0" /> {!collapsed && 'Keluar'}
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmLogout}
        title="Keluar?"
        message="Kamu akan keluar dari akun ini."
        confirmLabel="Keluar"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          startTransition(() => signOut())
        }}
      />
    </>
  )
}
