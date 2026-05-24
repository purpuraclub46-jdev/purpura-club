"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import type { PaginationMeta } from "@/types/api";

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, total, hasNextPage, hasPreviousPage } = meta;

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-muted-foreground">
      <div>
        Página <span className="font-medium text-foreground">{page}</span> de{" "}
        <span className="font-medium text-foreground">
          {Math.max(totalPages, 1)}
        </span>
        <span className="ml-3 hidden sm:inline">— {total} en total</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
