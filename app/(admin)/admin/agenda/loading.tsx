import {
  Barra,
  Carregando,
  EsqueletoAgenda,
} from "@/components/shared/esqueleto";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <Carregando rotulo="Carregando a agenda do dia">
        <Barra className="h-8" largura="18rem" />
        <Barra className="mt-4" largura="10rem" />
        <div className="mt-10">
          <EsqueletoAgenda />
        </div>
      </Carregando>
    </div>
  );
}
