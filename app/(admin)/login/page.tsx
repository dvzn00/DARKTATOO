import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Área do estúdio",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const busca = await searchParams;
  const bruto = busca.next;

  // Só aceita caminho interno: um "next" apontando para fora viraria um
  // redirecionamento aberto, servido em uma página de login.
  const proximo =
    typeof bruto === "string" && bruto.startsWith("/") && !bruto.startsWith("//")
      ? bruto
      : "/admin";

  return (
    <main
      id="conteudo"
      className="flex min-h-full flex-1 items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg text-ink">
          DARK INK
        </Link>

        <h1 className="mt-10 text-2xl text-ink">Área do estúdio</h1>
        <p className="mt-3 text-sm text-ink-muted">
          A agenda dos dois artistas, em um lugar só.
        </p>

        <div className="mt-9">
          <LoginForm proximo={proximo} />
        </div>

        <p className="mt-10 text-xs text-ink-faint">
          Esta área é do estúdio. Para marcar uma sessão,{" "}
          <Link
            href="/agendar"
            className="text-gold-ink underline underline-offset-4"
          >
            use a agenda pública
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
