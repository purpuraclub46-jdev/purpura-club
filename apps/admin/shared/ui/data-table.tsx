"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Pagination } from "./pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import type { PaginationMeta } from "@/types/api";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyTitle = "Sin resultados",
  emptyDescription,
  rowKey,
  onRowClick,
  meta,
  onPageChange,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-surface/50">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-muted-foreground"
                >
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <TableEmpty colSpan={columns.length}>
                <div>
                  <p className="text-foreground font-medium">{emptyTitle}</p>
                  {emptyDescription ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {emptyDescription}
                    </p>
                  ) : null}
                </div>
              </TableEmpty>
            ) : (
              data.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {meta && onPageChange ? (
        <Pagination meta={meta} onPageChange={onPageChange} />
      ) : null}
    </div>
  );
}
