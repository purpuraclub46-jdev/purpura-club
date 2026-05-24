"use client";

import { PageHeader } from "@/shared/ui/page-header";
import { ProductForm } from "@/features/products/components/product-form";

export default function NuevoProductoPage() {
  return (
    <>
      <PageHeader
        title="Nuevo producto"
        description="Crea una nueva pieza para el catálogo Púrpura Club."
      />
      <ProductForm mode="create" />
    </>
  );
}
