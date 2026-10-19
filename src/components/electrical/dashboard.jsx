import { Zap } from "lucide-react";
import { PRODUCTS } from "../../config/products";

export function ElectricalShopDashboard() {
  const product = PRODUCTS.electricalShop;

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-[#DDE3DA] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
        <Zap size={26} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#1C8C9E]">
        Separate product workspace
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[#0B3B45]">
        {product.name}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#5B6B68]">
        This workspace is coming soon. It is kept separate from Water Factory
        operations and does not access or change water-factory records.
      </p>
    </section>
  );
}