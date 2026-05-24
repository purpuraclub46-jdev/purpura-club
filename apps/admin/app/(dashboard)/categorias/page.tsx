"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { CategoriesFilters } from "@/features/categories/components/categories-filters";
import { CategoriesTable } from "@/features/categories/components/categories-table";
import { CategoryDialog } from "@/features/categories/components/category-form";
import { useCategoriesList } from "@/features/categories/hooks/use-categories";
import type {
  CategoryEntity,
  CategoryListQuery,
} from "@/features/categories/types";

export default function CategoriasPage() {
  const [query, setQuery] = useState<CategoryListQuery>({
    page: 1,
    limit: 30,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryEntity | null>(null);

  const { data, isLoading } = useCategoriesList(query);

  const items = useMemo(() => data?.items ?? [], [data]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (category: CategoryEntity) => {
    setEditing(category);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organiza el catálogo en Joyería, Perfumes y Accesorios."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nueva categoría
          </Button>
        }
      />

      <CategoriesFilters value={query} onChange={setQuery} />

      <CategoriesTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
        onEdit={openEdit}
      />

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
    </>
  );
}
