"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Cake,
  CreditCard,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Ticket,
  Trash2,
  Trophy,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { formatCurrency, formatDate, formatDateOnly } from "@/shared/lib/format";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useCustomer,
  useDeleteCustomer,
  useSetCustomerActive,
} from "../hooks/use-customers";
import { GENDER_LABEL } from "../types";
import type {
  CustomerOrderEntry,
  CustomerRaffleEntry,
  CustomerWonPrize,
} from "../types";
import { CustomerFormDialog } from "./customer-form-dialog";
import {
  CustomerStatusBadge,
  MembershipBadge,
} from "./customer-status-badge";

interface Props {
  id: string;
}

export function CustomerDetailView({ id }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const canDelete = user?.role === "SUPER_ADMIN";

  const { data: customer, isLoading, isError } = useCustomer(id);
  const setActive = useSetCustomerActive();
  const remove = useDeleteCustomer();

  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clientes">
            <ArrowLeft className="size-4" /> Volver a clientes
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Cliente no encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = async () => {
    try {
      await setActive.mutateAsync({ id: customer.id, active: !customer.active });
      toast.success(
        customer.active ? "Cliente desactivado" : "Cliente activado",
      );
    } catch (e) {
      toast.error("No se pudo actualizar", extractErrorMessage(e));
    } finally {
      setToggleOpen(false);
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(customer.id);
      toast.success("Cliente eliminado");
      router.replace("/clientes");
    } catch (e) {
      toast.error("No se pudo eliminar", extractErrorMessage(e));
      setDeleteOpen(false);
    }
  };

  const orderColumns: DataTableColumn<CustomerOrderEntry>[] = [
    {
      key: "number",
      header: "Pedido",
      cell: (row) => (
        <span className="font-mono text-xs">{row.number}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <Badge variant="outline">{row.status}</Badge>,
    },
    {
      key: "paymentMethod",
      header: "Pago",
      cell: (row) => (
        <span className="text-xs">{row.paymentMethod}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.itemsCount,
    },
    {
      key: "total",
      header: "Total",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span className="font-medium">{formatCurrency(row.total)}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Fecha",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  const raffleColumns: DataTableColumn<CustomerRaffleEntry>[] = [
    {
      key: "ticket",
      header: "Ticket",
      cell: (row) => (
        <span className="font-mono text-xs">#{row.ticketNumber}</span>
      ),
    },
    {
      key: "raffle",
      header: "Sorteo",
      cell: (row) => (
        <Link
          href={`/sorteos/${row.raffleId}`}
          className="text-sm hover:text-primary"
        >
          {row.raffleTitle}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => <Badge variant="outline">{row.type}</Badge>,
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <Badge
          variant={row.status === "WINNER" ? "default" : "outline"}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Fecha",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  const prizeColumns: DataTableColumn<CustomerWonPrize>[] = [
    {
      key: "title",
      header: "Premio",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.title}</span>
          <Link
            href={`/sorteos/${row.raffleId}`}
            className="truncate text-xs text-muted-foreground hover:text-primary"
          >
            {row.raffleTitle}
          </Link>
        </div>
      ),
    },
    {
      key: "position",
      header: "Posición",
      cell: (row) => <Badge variant="outline">#{row.position}</Badge>,
    },
    {
      key: "published",
      header: "Publicado",
      cell: (row) =>
        row.winnerPublished ? (
          <Badge variant="default">Publicado</Badge>
        ) : (
          <Badge variant="muted">Pendiente</Badge>
        ),
    },
    {
      key: "publishedAt",
      header: "Fecha publicación",
      cell: (row) =>
        row.publishedAt ? (
          <span className="text-xs">{formatDate(row.publishedAt)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/clientes">
          <ArrowLeft className="size-4" /> Volver a clientes
        </Link>
      </Button>

      <PageHeader
        title={customer.fullName}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <CustomerStatusBadge active={customer.active} />
            <MembershipBadge
              isMember={customer.isMember}
              expiresAt={customer.membershipExpiresAt}
            />
            {customer.primaryLocation ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {customer.primaryLocation.name}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setToggleOpen(true)}
            >
              {customer.active ? (
                <>
                  <ShieldOff className="size-4" /> Desactivar
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Activar
                </>
              )}
            </Button>
            {canDelete ? (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" /> Eliminar
              </Button>
            ) : null}
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Editar
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Info + contacto */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Información</CardTitle>
            <CardDescription>Contacto y datos personales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={IdCard} label="DNI" value={customer.dni} />
            <InfoRow icon={Phone} label="Teléfono" value={customer.phone} />
            <InfoRow icon={Mail} label="Email" value={customer.email} />
            <InfoRow
              icon={Cake}
              label="Cumpleaños"
              value={
                customer.birthDate
                  ? formatDateOnly(customer.birthDate)
                  : null
              }
            />
            <InfoRow
              icon={Sparkles}
              label="Género"
              value={
                customer.gender ? GENDER_LABEL[customer.gender] : null
              }
            />
            <InfoRow
              icon={MapPin}
              label="Sucursal"
              value={customer.primaryLocation?.name ?? null}
            />
            {customer.linkedUser ? (
              <div className="rounded-md border border-border-strong bg-surface/40 p-3 text-xs">
                <p className="font-medium">Cuenta de usuario enlazada</p>
                <p className="mt-1 text-muted-foreground">
                  {customer.linkedUser.email}{" "}
                  {customer.linkedUser.active ? "(activa)" : "(desactivada)"}
                </p>
              </div>
            ) : null}
            {customer.notes ? (
              <div className="rounded-md border border-border-strong bg-surface/40 p-3 text-xs">
                <p className="font-medium">Notas internas</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {customer.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Stats + Membresía */}
        <div className="space-y-6 xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas comerciales</CardTitle>
              <CardDescription>Calculadas en tiempo real</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatBox
                  label="Total gastado"
                  value={formatCurrency(customer.stats.totalSpent)}
                  icon={CreditCard}
                />
                <StatBox
                  label="Pedidos pagados"
                  value={customer.stats.paidOrders.toString()}
                  hint={`${customer.stats.totalOrders} totales`}
                />
                <StatBox
                  label="Ticket promedio"
                  value={
                    customer.stats.paidOrders > 0
                      ? formatCurrency(customer.stats.averageTicket)
                      : "—"
                  }
                />
                <StatBox
                  label="Última compra"
                  value={
                    customer.stats.lastPurchaseAt
                      ? formatDateOnly(customer.stats.lastPurchaseAt)
                      : "—"
                  }
                />
                <StatBox
                  label="Tickets sorteos"
                  value={customer.stats.raffleEntries.toString()}
                  icon={Ticket}
                />
                <StatBox
                  label="Premios ganados"
                  value={customer.stats.wonRaffles.toString()}
                  icon={Trophy}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membresía Púrpura Club</CardTitle>
              <CardDescription>
                {customer.linkedUser
                  ? "Estado sincronizado con su cuenta de usuario."
                  : "Sin cuenta de usuario enlazada — la membresía se calcula vía POS futuro."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado</span>
                <MembershipBadge
                  isMember={customer.isMember}
                  expiresAt={customer.membershipExpiresAt}
                />
              </div>
              {customer.membershipExpiresAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vencimiento</span>
                  <span className="text-sm">
                    {formatDateOnly(customer.membershipExpiresAt)}
                  </span>
                </div>
              ) : null}
              <p className="rounded-md border border-border-strong bg-surface/40 p-3 text-xs text-muted-foreground">
                Beneficios: 10% adicional en ofertas activas, participaciones
                automáticas por cada S/25 comprados, bono de referido al
                primer pedido elegible.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compras recientes</CardTitle>
          <CardDescription>
            Últimas 10 órdenes asociadas a la cuenta enlazada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<CustomerOrderEntry>
            data={customer.recentOrders}
            columns={orderColumns}
            rowKey={(row) => row.id}
            emptyTitle="Sin compras registradas"
            emptyDescription={
              customer.linkedUser
                ? "Cuando el cliente realice una compra aparecerá aquí."
                : "El cliente aún no tiene cuenta enlazada — no es posible mostrar historial."
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Participaciones en sorteos</CardTitle>
            <CardDescription>Últimos 20 tickets generados.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable<CustomerRaffleEntry>
              data={customer.recentRaffleEntries}
              columns={raffleColumns}
              rowKey={(row) => row.id}
              emptyTitle="Sin participaciones"
              emptyDescription="Las participaciones aparecerán cuando el cliente compre o ingrese tickets."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Premios ganados</CardTitle>
            <CardDescription>
              Historial completo de premios asignados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable<CustomerWonPrize>
              data={customer.wonPrizes}
              columns={prizeColumns}
              rowKey={(row) => row.id}
              emptyTitle="Sin premios ganados"
              emptyDescription="Cuando se le asigne un premio aparecerá aquí."
            />
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={customer}
      />

      <ConfirmDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={customer.active ? "¿Desactivar cliente?" : "¿Activar cliente?"}
        description={
          customer.active
            ? `«${customer.fullName}» dejará de aparecer en sugerencias del POS.`
            : `«${customer.fullName}» volverá a estar disponible para operaciones.`
        }
        confirmLabel={customer.active ? "Desactivar" : "Activar"}
        destructive={customer.active}
        isLoading={setActive.isPending}
        onConfirm={() => void handleToggle()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar cliente?"
        description={`«${customer.fullName}» se eliminará de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        isLoading={remove.isPending}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IdCard;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm">{value || "—"}</p>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: typeof CreditCard;
}) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
