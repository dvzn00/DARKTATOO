import { Barra, Carregando } from "@/components/shared/esqueleto";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <Carregando rotulo="Carregando o resumo do dia">
        <Barra className="h-8" largura="14rem" />
        <div className="mt-10 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <div key={indice} className="bg-bg px-6 py-8">
              <Barra className="h-9" largura="3rem" />
              <Barra className="mt-4" largura="7rem" />
            </div>
          ))}
        </div>
      </Carregando>
    </div>
  );
}
