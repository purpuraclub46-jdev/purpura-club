"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
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
import { use, useEffect, useMemo, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatCurrency } from "@/shared/lib/format";
import { useRaffleBySlug } from "@/features/raffles/hooks/use-raffles";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "@/stores/toast.store";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SorteoDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const { data, isLoading, isError } = useRaffleBySlug(slug);
  const { isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="size-6 animate-spin text-white/45" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="bg-[#0A0A0A] py-24 text-center text-white">
        <div className="mx-auto max-w-md px-6">
          <Gift className="mx-auto size-10 text-white/35" />
          <h1 className="mt-4 font-serif text-3xl tracking-tight">
            Sorteo no encontrado
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Es posible que ya se haya cerrado o no esté publicado.
          </p>
          <Link href="/sorteos" className="mt-6 inline-block">
            <Button variant="accent">Ver sorteos activos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress =
    data.totalTickets > 0
      ? Math.min(100, (data.soldTickets / data.totalTickets) * 100)
      : 0;
  const cover = data.bannerImage ?? data.prizeImage;
  const ticketPrice = data.memberTicketPrice ?? data.ticketPrice;

  const handleJoin = () => {
    if (!isAuthenticated) {
      toast.info(
        "Inicia sesión para participar",
        "Únete al Club Púrpura — los tickets se otorgan automáticamente con tus compras.",
      );
      return;
    }
    toast.info(
      "¡Estás dentro del club!",
      `${user?.firstName ?? "Miembro"}, compra en la tienda para acumular participaciones.`,
    );
  };

  return (
    <div className="bg-[#0A0A0A] text-white">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          {cover ? (
            <Image
              src={cover}
              alt={data.title}
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

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <Link
            href="/sorteos"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] text-white/70 hover:text-white"
          >
            <ChevronLeft className="size-3.5" />
            Todos los sorteos
          </Link>

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">
                  <Crown className="size-2.5" /> Sorteo Premium
                </Badge>
                {data.status === "PUBLISHED" ? (
                  <Badge
                    tone="outline"
                    className="border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                  >
                    Activo
                  </Badge>
                ) : null}
              </div>
              <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-white sm:text-7xl">
                {data.title}
              </h1>
              <p className="max-w-xl text-base text-white/70 sm:text-lg">
                {data.description}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="accent" size="lg" onClick={handleJoin}>
                  <Ticket className="size-4" />
                  Participar
                </Button>
                <Link href="/shop">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white hover:text-[#0A0A0A]"
                  >
                    Comprar y ganar tickets
                  </Button>
                </Link>
              </div>
            </div>

            <Countdown endsAt={data.endDate} />
          </div>
        </div>
      </section>

      {/* Progreso + premios */}
      <section className="relative bg-[#0A0A0A] py-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(152,16,250,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-10">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/55">
                <span>
                  {data.soldTickets} / {data.totalTickets} tickets
                </span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-gradient-to-r from-[#9810FA] to-[#c026d3]"
                />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Stat
                  icon={Ticket}
                  label="Ticket desde"
                  value={formatCurrency(ticketPrice)}
                />
                <Stat
                  icon={Sparkles}
                  label="Vendidos"
                  value={data.soldTickets.toString()}
                />
                <Stat
                  icon={Trophy}
                  label="Premios"
                  value={data.prizes.length.toString()}
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
                  Premios en juego
                </p>
                <h2 className="font-serif text-3xl tracking-tight text-white">
                  Lo que está esperando por ti
                </h2>
              </div>
              {data.prizes.length === 0 ? (
                <p className="text-sm text-white/55">
                  Los premios se anunciarán pronto.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.prizes.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors hover:border-[#9810FA]/40"
                    >
                      <div className="relative aspect-5/4 bg-[#1c0a26]">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.title}
                            fill
                            sizes="(min-width: 768px) 33vw, 100vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white/30">
                            <Gift className="size-10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 via-transparent to-transparent" />
                        <span className="absolute left-3 top-3 rounded-full bg-[#0A0A0A]/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c026d3] backdrop-blur">
                          Premio {p.position}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-white">{p.title}</h3>
                        {p.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-white/55">
                            {p.description}
                          </p>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
                <Users className="size-3" />
                Cómo participar
              </p>
              <ol className="mt-4 space-y-4 text-sm text-white/75">
                <Step n={1} text="Únete al Club Púrpura — registro gratuito." />
                <Step
                  n={2}
                  text="Compra en la tienda y suma tickets automáticos."
                />
                <Step
                  n={3}
                  text="Cada S/ 25 de compra te da una participación adicional."
                />
                <Step n={4} text="Refiere amigos y gana tickets extra." />
              </ol>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
                <ShieldCheck className="size-3" />
                Reglas del sorteo
              </p>
              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-white/65">
                <li>· Solo participan miembros activos del Club Púrpura.</li>
                <li>· La participación es automática con compras válidas.</li>
                <li>
                  · El sorteo se cierra el{" "}
                  <strong className="text-white">
                    {new Date(data.endDate).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  .
                </li>
                <li>· Los resultados se publican con foto y video del ganador.</li>
                <li>
                  · Documento de identidad obligatorio para reclamar el premio.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#9810FA]/30 bg-[#9810FA]/12 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#c026d3]">
                Tip miembro
              </p>
              <p className="mt-2 text-sm text-white/85">
                Los miembros activos reciben tickets dobles en sorteos
                seleccionados. Activa tu membresía gratis y multiplica tus
                probabilidades.
              </p>
              <Link href="/register" className="mt-4 inline-block">
                <Button variant="accent" size="sm">
                  Activar membresía
                </Button>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
        <Icon className="size-3 text-[#c026d3]" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#9810FA]/20 text-[10px] font-semibold text-[#c026d3]">
        {n}
      </span>
      <span>{text}</span>
    </li>
  );
}

function Countdown({ endsAt }: { endsAt: string }) {
  const target = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/85">
        <CalendarDays className="size-3 text-[#c026d3]" />
        Tiempo restante
      </p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        <Unit label="Días" value={days} />
        <Unit label="Horas" value={hours} />
        <Unit label="Min" value={minutes} />
        <Unit label="Seg" value={seconds} />
      </div>
    </div>
  );
}

function Unit({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
    </div>
  );
}
