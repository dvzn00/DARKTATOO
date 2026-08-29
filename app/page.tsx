import { Hero } from "@/components/marketing/hero";
import {
  Artistas,
  Contato,
  Depoimentos,
  Servicos,
  Sobre,
} from "@/components/marketing/sections";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { getArtists, getServices } from "@/lib/data/catalog";

/** O catálogo muda raramente; revalida de hora em hora. */
export const revalidate = 3600;

export default async function Home() {
  const [servicos, artistas] = await Promise.all([
    getServices(),
    getArtists(),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <Hero />
        <Sobre />
        <Artistas artistas={artistas} />
        <Servicos servicos={servicos} />
        <Depoimentos />
        <Contato />
      </main>
      <SiteFooter />
    </>
  );
}
