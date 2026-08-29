import {
  Barra,
  Carregando,
  EsqueletoCartoes,
} from "@/components/shared/esqueleto";

export default function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-12 sm:px-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Carregando rotulo="Carregando a agenda">
          <Barra largura="6rem" />
          <Barra className="mt-4 h-7" largura="70%" />
          <div className="mt-9">
            <EsqueletoCartoes />
          </div>
        </Carregando>
      </div>

      <div className="lg:col-span-4 lg:col-start-9">
        <div className="border border-line bg-bg p-6">
          <Barra largura="8rem" />
          <div className="mt-8 space-y-5">
            <Barra />
            <Barra />
            <Barra />
            <Barra />
          </div>
        </div>
      </div>
    </div>
  );
}
