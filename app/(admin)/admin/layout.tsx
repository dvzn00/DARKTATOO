import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/actions/auth";
import { getAdminSession } from "@/lib/auth";
import { STUDIO_TIMEZONE } from "@/lib/domain/constants";
import { formatDateLong, studioNow } from "@/lib/domain/time";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Dark Ink" },
  robots: { index: false, follow: false },
};

const NAVEGACAO = [
  { href: "/admin", label: "Hoje" },
  { href: "/admin/agenda", label: "Agenda" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // O middleware já barra quem não tem sessão. Esta segunda checagem cobre o
  // caso que ele não vê: sessão válida de um usuário que não é admin.
  const session = await getAdminSession();
  if (!session) redirect("/login?next=/admin");

  const hoje = studioNow().date;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex items-baseline gap-6">
            <Link href="/admin" className="font-display text-lg text-ink">
              DARK INK
            </Link>
            <span className="hidden text-sm text-ink-muted first-letter:uppercase sm:inline">
              {formatDateLong(hoje)}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <nav aria-label="Painel">
              <ul className="flex gap-6">
                {NAVEGACAO.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-sm border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line px-6 py-5 sm:px-8">
        <p className="mx-auto w-full max-w-6xl text-xs text-ink-muted">
          {session.email} · horários no fuso de {STUDIO_TIMEZONE}
        </p>
      </footer>
    </div>
  );
}
