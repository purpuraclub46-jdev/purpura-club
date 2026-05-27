"use client";

import { Filter, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { formatDate } from "@/shared/lib/format";
import { useComplaintsList } from "@/features/complaints/hooks/use-complaints";
import { ComplaintDetailDialog } from "./complaint-detail-dialog";
import {
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_TYPE_LABEL,
  type ComplaintEntity,
  type ComplaintStatus,
  type ComplaintType,
} from "@/types/api";

/**
 * Tabla + filtros del Libro de Reclamaciones.
 *
 * Diseñada para que el agente de atención pueda escanear la cola pendiente
 * y abrir el detalle de cada reclamo con un click. El detalle vive en un
 * Dialog (composable, no router push) para mantener el contexto de la
 * cola visible.
 *
 * El estado de filtros vive local — no se persiste en URL por ahora porque
 * el caso de uso típico es "abrir, atender, cerrar" y no compartir links
 * filtrados.
 */

const STATUS_FILTERS: Array<{ label: string; value: ComplaintStatus | "" }> = [
  { label: "Todos", value: "" },
  { label: "Pendiente", value: "PENDIENTE" },
  { label: "En revisión", value: "EN_REVISION" },
  { label: "Resuelto", value: "RESUELTO" },
];

const TYPE_FILTERS: Array<{ label: string; value: ComplaintType | "" }> = [
  { label: "Todos", value: "" },
  { label: "Reclamo", value: "RECLAMO" },
  { label: "Queja", value: "QUEJA" },
];

export function ComplaintsManager() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [type, setType] = useState<ComplaintType | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ComplaintEntity | null>(null);

  const { data, isLoading } = useComplaintsList({
    page,
    limit: 20,
    search: search.trim() || undefined,
    status: status || undefined,
    type: type || undefined,
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  const columns: DataTableColumn<ComplaintEntity>[] = [
    {
      key: "ticket",
      header: "Folio",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold tabular-nums">
          {row.ticketNumber}
        </span>
      ),
    },
    {
      key: "consumer",
      header: "Consumidor",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {row.firstName} {row.lastName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.email}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{COMPLAINT_TYPE_LABEL[row.type]}</span>
          <span className="text-muted-foreground">{row.subjectType}</span>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Asunto",
      cell: (row) => (
        <span className="line-clamp-2 max-w-md text-xs text-muted-foreground">
          {row.subjectDetail}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Recibido",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Folio, nombre, DNI o correo…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          label="Estado"
          value={status}
          options={STATUS_FILTERS}
          onChange={(v) => {
            setStatus(v as ComplaintStatus | "");
            setPage(1);
          }}
        />
        <FilterSelect
          label="Tipo"
          value={type}
          options={TYPE_FILTERS}
          onChange={(v) => {
            setType(v as ComplaintType | "");
            setPage(1);
          }}
        />
      </div>

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelected(row)}
        meta={meta}
        onPageChange={setPage}
        emptyTitle="Sin reclamos por ahora"
        emptyDescription="Los reclamos presentados desde el storefront aparecerán aquí."
      />

      <ComplaintDetailDialog
        complaint={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const variant =
    status === "RESUELTO"
      ? "success"
      : status === "EN_REVISION"
        ? "warning"
        : "muted";
  return <Badge variant={variant}>{COMPLAINT_STATUS_LABEL[status]}</Badge>;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: Array<{ label: string; value: T | "" }>;
  onChange: (value: T | "") => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-muted-foreground">
      <Filter className="size-3.5" />
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className="h-9 cursor-pointer bg-transparent text-sm text-foreground focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
