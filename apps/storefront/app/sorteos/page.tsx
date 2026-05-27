"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  ChevronRight,
  Crown,
  Gift,
  Loader2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatCurrency } from "@/shared/lib/format";
import { useRaffles } from "@/features/raffles/hooks/use-raffles";
import type { RaffleEntity } from "@/types/api";

/**
 * Landing pública de Sorteos — ecosistema separado del ecommerce.
 * Estética luxury raffle (Omaze-like) con full-bleed hero negro,
 * sin el contenedor del shop. Convive con la navbar/footer del shell
 * pero presenta una identidad propia.
 */
export default function SorteosPage() {
  const { data, isLoading } = useRaffles();
  const raffles = data ?? [];
  const featured = raffles[0] ?? null;
  const rest = raffles.slice(1);

  return (
    <div className="bg-[#0A0A0A] text-white">
      <SorteosHero featured={featured} loading={isLoading} />

      <section className="relative bg-[#0A0A0A] py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(152,16,250,0.16) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeader
            eyebrow="Cómo funciona"
            title="Compra · Acumula · Gana"
            description="Cada compra activa tu participación en los sorteos del Club. Sin formularios, sin trucos."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            <StepCard
              icon={Users}
              n="01"
              title="Únete al Club Púrpura"
              text="Registro gratuito. Tu cuenta del club te identifica en cada sorteo."
            />
            <StepCard
              icon={Ticket}
              n="02"
              title="Compra y gana tickets"
              text="Cada S/ 25 te suma una participación automática. Mientras más compras, más entradas."
            />
            <StepCard
              icon={Trophy}
              n="03"
              title="Reclama tu premio"
              text="Los ganadores se anuncian en vivo y reciben el premio en su sucursal o domicilio."
            />
          </div>
        </div>
      </section>

      <section className="relative bg-[#0A0A0A] pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeader
            eyebrow="Sorteos activos"
            title="Experiencias en juego"
            description="Premios únicos, edición limitada. Solo para miembros del Club Púrpura."
            align="between"
            action={
              <Link
                href="/register"
                className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65 hover:text-white sm:inline-flex"
              >
                Unirme al club →
              </Link>
            }
          />

          <div className="mt-10">
            {isLoading ? (
              <div className="flex h-72 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-white/45" />
              </div>
            ) : rest.length === 0 && !featured ? (
              <EmptySorteos />
            ) : rest.length === 0 ? (
              <p className="text-center text-sm text-white/55">
                Próximamente más sorteos. El sorteo destacado arriba está activo
                ahora.
              </p>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {rest.map((r, i) => (
                  <RaffleCard key={r.id} raffle={r} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/8 bg-[#0A0A0A] py-20 sm:py-28">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 0% 100%, rgba(152,16,250,0.22) 0%, transparent 60%), radial-gradient(50% 50% at 100% 0%, rgba(192,38,211,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white">
              <Crown className="size-3 text-[#9810FA]" />
              Club Púrpura
            </span>
            <h2 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">
              La membresía premium que multiplica tus probabilidades.
            </h2>
            <p className="max-w-xl text-base text-white/65">
              Tickets dobles en sorteos seleccionados, beneficios miembro en la
              tienda y acceso anticipado a campañas exclusivas.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/register">
                <Button variant="accent" size="lg">
                  Activar membresía gratis
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-transparent text-white hover:border-white hover:bg-white hover:text-[#0A0A0A]"
                >
                  Comprar y ganar tickets
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            <Perk
              icon={Ticket}
              title="Tickets automáticos"
              text="Cada compra suma participaciones — sin tener que registrarte en cada sorteo."
            />
            <Perk
              icon={Sparkles}
              title="Tickets dobles miembros"
              text="Miembros activos del club reciben el doble de participaciones en sorteos premium."
            />
            <Perk
              icon={ShieldCheck}
              title="Transparencia total"
              text="Cierre auditado, ganadores publicados con foto y video. Sin letras pequeñas."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

interface HeroProps {
  featured: RaffleEntity | null;
  loading: boolean;
}

function SorteosHero({ featured, loading }: HeroProps) {
  const cover = featured?.bannerImage ?? featured?.prizeImage ?? null;
  const progress =
    featured && featured.totalTickets > 0
      ? Math.min(100, (featured.soldTickets / featured.totalTickets) * 100)
      : 0;

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        {cover ? (
          <Image
            src={cover}
            alt={featured?.title ?? ""}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-55"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/40 via-[#0A0A0A]/80 to-[#0A0A0A]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 18% 18%, rgba(152,16,250,0.35) 0%, transparent 60%), radial-gradient(50% 50% at 100% 100%, rgba(192,38,211,0.25) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-end gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:py-24">
        <div className="space-y-7">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-white"
          >
            <Crown className="size-3 text-[#9810FA]" />
            Sorteos Purpura Club
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-serif text-5xl leading-[1.05] tracking-tight text-white sm:text-7xl"
          >
            Gana experiencias
            <br />
            <span className="bg-gradient-to-r from-[#c026d3] via-[#9810FA] to-[#7c0fcc] bg-clip-text text-transparent">
              que se recuerdan.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-xl text-base text-white/70 sm:text-lg"
          >
            Cada compra suma. Cada miembro participa. Premios edición limitada,
            sorteos transparentes y experiencias diseñadas para ti.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-wrap items-center gap-3"
          >
            {featured ? (
              <Link href={`/sorteos/${featured.slug}`}>
                <Button variant="accent" size="lg">
                  <Ticket className="size-4" />
                  Participar ahora
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button variant="accent" size="lg">
                  Unirme al club
                </Button>
              </Link>
            )}
            <Link href="/shop">
              <Button
                variant="outline"
                size="lg"
                className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white hover:text-[#0A0A0A]"
              >
                Comprar y ganar tickets
                <ChevronRight className="size-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="grid max-w-md grid-cols-3 gap-4 pt-6 text-white/85"
          >
            <Metric value={raffleCount(featured)} label="Sorteo activo" />
            <Metric
              value={featured ? `${featured.soldTickets}+` : "—"}
              label="Tickets activos"
            />
            <Metric
              value={featured ? formatCurrency(featured.memberTicketPrice ?? featured.ticketPrice) : "—"}
              label="Ticket desde"
            />
          </motion.div>
        </div>

        {/* Card destacado */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:block"
        >
          {loading ? (
            <div className="h-[460px] animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          ) : featured ? (
            <FeaturedRaffleCard raffle={featured} progress={progress} />
          ) : (
            <EmptyHeroCard />
          )}
        </motion.div>
      </div>

      {/* CTA strip mobile */}
      {!loading && featured ? (
        <div className="relative border-t border-white/8 bg-[#0A0A0A]/80 px-5 py-4 backdrop-blur-md lg:hidden">
          <Link
            href={`/sorteos/${featured.slug}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9810FA]">
                Sorteo destacado
              </p>
              <p className="truncate text-sm font-medium text-white">
                {featured.title}
              </p>
            </div>
            <Button variant="accent" size="sm">
              Participar
            </Button>
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function FeaturedRaffleCard({
  raffle,
  progress,
}: {
  raffle: RaffleEntity;
  progress: number;
}) {
  const cover = raffle.prizeImage ?? raffle.bannerImage;
  return (
    <Link
      href={`/sorteos/${raffle.slug}`}
      className="group relative block overflow-hidden rounded-3xl border border-white/12 bg-white/5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md transition-transform duration-500 hover:-translate-y-1"
    >
      <div className="relative aspect-5/4 overflow-hidden bg-[#1c0a26]">
        {cover ? (
          <Image
            src={cover}
            alt={raffle.title}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/30">
            <Gift className="size-14" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/85 via-[#0A0A0A]/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          <Badge tone="accent">
            <Sparkles className="size-2.5" /> Destacado
          </Badge>
          <Badge tone="outline" className="border-white/30 bg-white/10 text-white">
            <CalendarClock className="size-2.5" />
            Activo
          </Badge>
        </div>
        <div className="absolute inset-x-4 bottom-4 space-y-2">
          <h2 className="font-serif text-2xl tracking-tight text-white">
            {raffle.title}
          </h2>
          <p className="line-clamp-2 text-xs text-white/70">
            {raffle.description}
          </p>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/65">
            <span>Progreso</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-gradient-to-r from-[#9810FA] to-[#c026d3]"
            />
          </div>
          <p className="text-[11px] text-white/55">
            {raffle.soldTickets} de {raffle.totalTickets} tickets reservados
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Ticket desde
            </p>
            <p className="text-base font-semibold tabular-nums text-white">
              {formatCurrency(raffle.memberTicketPrice ?? raffle.ticketPrice)}
            </p>
          </div>
          <Button variant="accent" size="sm">
            Ver detalle
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

function EmptyHeroCard() {
  return (
    <div className="flex h-[460px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center backdrop-blur-md">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#9810FA]/15 text-[#c026d3]">
        <Gift className="size-6" />
      </span>
      <p className="font-serif text-2xl tracking-tight text-white">
        Próximamente
      </p>
      <p className="max-w-xs text-sm text-white/55">
        Estamos preparando sorteos exclusivos. Únete al club para enterarte
        primero.
      </p>
      <Link href="/register" className="mt-1">
        <Button variant="accent" size="sm">
          Unirme al club
        </Button>
      </Link>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
    </div>
  );
}

function raffleCount(featured: RaffleEntity | null): string {
  return featured ? "1+" : "—";
}

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "between";
  action?: React.ReactNode;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  action,
}: SectionHeaderProps) {
  if (align === "between") {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
            {eyebrow}
          </p>
          <h2 className="font-serif text-3xl tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-sm text-white/55">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
        {eyebrow}
      </p>
      <h2 className="font-serif text-3xl tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-white/55">{description}</p>
      ) : null}
    </div>
  );
}

interface StepCardProps {
  icon: typeof Users;
  n: string;
  title: string;
  text: string;
}

function StepCard({ icon: Icon, n, title, text }: StepCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/5 p-6 transition-colors hover:border-[#9810FA]/40 hover:bg-white/8">
      <div className="flex items-center justify-between">
        <span className="font-serif text-3xl tracking-tight text-white/15 transition-colors group-hover:text-[#9810FA]/40">
          {n}
        </span>
        <span className="flex size-10 items-center justify-center rounded-full bg-[#9810FA]/12 text-[#c026d3]">
          <Icon className="size-5" strokeWidth={1.6} />
        </span>
      </div>
      <h3 className="mt-5 font-serif text-xl tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/55">{text}</p>
    </div>
  );
}

function Perk({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Ticket;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/8 bg-white/5 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#9810FA]/15 text-[#c026d3]">
        <Icon className="size-4" strokeWidth={1.6} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/55">{text}</p>
      </div>
    </div>
  );
}

function EmptySorteos() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#9810FA]/15 text-[#c026d3]">
        <Gift className="size-6" />
      </span>
      <h3 className="mt-4 font-serif text-2xl tracking-tight text-white">
        Próximamente nuevos sorteos
      </h3>
      <p className="mt-2 text-sm text-white/55">
        Estamos preparando experiencias exclusivas. Únete al club para enterarte
        primero.
      </p>
      <Link href="/register" className="mt-5 inline-block">
        <Button variant="accent">Unirme al Club Púrpura</Button>
      </Link>
    </div>
  );
}

function RaffleCard({ raffle, index }: { raffle: RaffleEntity; index: number }) {
  const progress =
    raffle.totalTickets > 0
      ? Math.min(100, (raffle.soldTickets / raffle.totalTickets) * 100)
      : 0;
  const endsAt = new Date(raffle.endDate);
  const cover = raffle.bannerImage ?? raffle.prizeImage;
  const remaining = useRemainingDays(raffle.endDate);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors hover:border-[#9810FA]/40"
    >
      <Link href={`/sorteos/${raffle.slug}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-[#1c0a26]">
          {cover ? (
            <Image
              src={cover}
              alt={raffle.title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/30">
              <Gift className="size-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/85 via-[#0A0A0A]/10 to-transparent" />
          <div className="absolute left-4 top-4 flex gap-1.5">
            <Badge tone="accent">
              <Crown className="size-2.5" /> Sorteo
            </Badge>
            {raffle.status === "PUBLISHED" ? (
              <Badge
                tone="outline"
                className="border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
              >
                Activo
              </Badge>
            ) : null}
          </div>
          <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-[#0A0A0A]/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-2.5" />
              {remaining}
            </span>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <h3 className="font-serif text-2xl tracking-tight text-white group-hover:text-[#c026d3]">
            {raffle.title}
          </h3>
          <p className="line-clamp-2 text-sm text-white/65">
            {raffle.description}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/55">
              <span>
                {raffle.soldTickets} / {raffle.totalTickets} tickets
              </span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${progress}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-[#9810FA] to-[#c026d3]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                Ticket desde
              </p>
              <p className="text-sm font-semibold tabular-nums text-white">
                {formatCurrency(raffle.memberTicketPrice ?? raffle.ticketPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                Finaliza
              </p>
              <p className="text-sm font-medium text-white">
                {endsAt.toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function useRemainingDays(endDate: string): string {
  const target = useMemo(() => new Date(endDate).getTime(), [endDate]);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Cerrado";
  if (days <= 0) {
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${hours}h restantes`;
  }
  return `${days} ${days === 1 ? "día" : "días"} restantes`;
}
