'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { startTransition } from 'react'
import { LayoutDashboard, Briefcase, BarChart3, Tags, User, ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
import { signOut } from '@/app/auth-actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BrandMark } from '@/components/brand-mark'
import { useLang } from '@/components/language-provider'

export function Nav({ user, streak }: { user: { email?: string | null; profile?: { name?: string | null } | null } | null; streak: number }) {
  const { t } = useLang()
  const items = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/lamaran', label: t('nav.lamaran'), icon: Briefcase },
    { href: '/statistik', label: t('nav.statistik'), icon: BarChart3 },
    { href: '/sumber', label: t('nav.sumber'), icon: Tags },
    { href: '/akun', label: t('nav.akun'), icon: User },
  ]
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const displayName = user?.profile?.name || user?.email || ''
  const initialChar = (displayName || '?').charAt(0).toUpperCase()

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
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface md:hidden">
        <div className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-label-xs font-medium ${
                  active ? 'text-trailblaze' : 'text-stone'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop sidebar — dark admin console */}
      <aside
        className={`fixed left-0 top-0 hidden h-dvh flex-col border-r border-black/10 bg-slate-900 text-slate-300 transition-[width] duration-200 md:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className={`flex ${collapsed ? 'h-auto flex-col items-center justify-center gap-1 px-0 py-2' : 'h-16 items-center gap-2.5 px-4'}`}>
          <BrandMark size={collapsed ? 30 : 28} />
          {!collapsed && (
            <span className="bg-gradient-to-r from-[#7c93f0] to-[#4db3e0] bg-clip-text text-lg font-bold leading-none tracking-tight text-transparent">
              Lamaranku
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={t(collapsed ? 'nav.openNav' : 'nav.closeNav')}
            className={`rounded-md text-slate-400 hover:bg-white/10 hover:text-white ${collapsed ? 'p-1' : 'ml-auto p-2'}`}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          <p className={`mb-1 px-2 text-label-xs font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? 'hidden' : ''}`}>{t('nav.menu')}</p>
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  collapsed ? 'justify-center px-0' : ''
                } ${active ? 'bg-trailblaze text-white shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* User + bottom */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="mb-3 flex items-center gap-2.5 px-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                {initialChar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{streak} {t('nav.dayStreak')}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            title={collapsed ? t('nav.logout') : undefined}
            className={`mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-ember/20 hover:text-red-300 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut size={18} className="shrink-0" /> {!collapsed && t('nav.logout')}
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmLogout}
        title={t('nav.logoutTitle')}
        message={t('nav.logoutMsg')}
        confirmLabel={t('nav.logout')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          startTransition(() => signOut())
        }}
      />
    </>
  )
}
