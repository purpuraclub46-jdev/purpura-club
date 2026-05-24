"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { ProductForm } from "@/features/products/components/product-form";
import { useProduct } from "@/features/products/hooks/use-products";

export function ProductDetailView({ id }: { id: string }) {
  const { data: product, isLoading, isError } = useProduct(id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/productos">
            <ArrowLeft className="size-4" /> Volver a productos
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Producto no encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/productos">
          <ArrowLeft className="size-4" /> Volver a productos
        </Link>
      </Button>

      <PageHeader
        title={product.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant={product.active ? "success" : "muted"}>
              {product.active ? "Activo" : "Inactivo"}
            </Badge>
            {product.featured ? (
              <Badge variant="default">
                <Sparkles className="size-3" /> Destacado
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              SKU {product.sku} · /{product.slug}
            </span>
          </span>
        }
      />

      <ProductForm mode="edit" initial={product} />
    </>
  );
}
