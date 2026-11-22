import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileCheck2,
  FileText,
  Info,
  ListChecks,
  MessagesSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { LeaveOverview } from "@/components/leave-overview"
import {
  AI_DISCLOSURE,
  LEGAL_DISCLOSURE,
  SIMULATION_DISCLOSURE,
  home,
} from "@/messages/pl"

const heroIcons = [Scale, CalendarDays, Calculator, ShieldCheck]
const toolIcons = [Calculator, CalendarDays, FileCheck2]
const trustIcons = [Scale, BookOpen, ShieldCheck]

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
      {children}
    </p>
  )
}

function SectionHeader({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow: string
  title: string
  lead?: string
  className?: string
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-3 text-sm text-pretty text-muted-foreground sm:text-base">
          {lead}
        </p>
      )}
    </div>
  )
}

function HeroChoice({
  method,
  tone,
  icon: Icon,
}: {
  method: (typeof home.methods)["form"] | (typeof home.methods)["chat"]
  tone: "primary" | "success"
  icon: LucideIcon
}) {
  return (
    <Link
      href={method.href}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-6"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          tone === "primary" ? "bg-primary" : "bg-success"
        )}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg",
              tone === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-success/10 text-success-foreground"
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </span>
          {method.label}
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
        />
      </div>

      <p className="mt-4 text-xl font-semibold tracking-tight">
        {method.title}
      </p>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        {method.shortDescription}
      </p>

      <div className="mt-auto pt-5">
        <span className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/85">
          {method.cta}
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
        <span className="mt-2 block text-xs text-muted-foreground">
          {method.meta}
        </span>
      </div>
    </Link>
  )
}

function MethodPanel({
  method,
  tone,
  icon: Icon,
}: {
  method: (typeof home.methods)["form"] | (typeof home.methods)["chat"]
  tone: "primary" | "success"
  icon: LucideIcon
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-t-2 border-border/80 bg-card p-6",
        tone === "primary" ? "border-t-primary" : "border-t-success"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            tone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-success/10 text-success-foreground"
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {method.label}
          </p>
          <h3 className="text-xl font-semibold tracking-tight">
            {method.title}
          </h3>
        </div>
      </div>

      <p className="mt-4 text-sm text-pretty text-muted-foreground">
        {method.description}
      </p>

      <ul className="mt-5 space-y-2.5">
        {method.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-sm">
            <CheckCircle2
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4 shrink-0",
                tone === "primary" ? "text-primary" : "text-success"
              )}
            />
            <span className="text-pretty">{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Button asChild className="h-10 w-full px-4 sm:w-auto">
          <Link href={method.href}>
            {method.cta}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">{method.meta}</p>
      </div>
    </div>
  )
}

function KnowledgeRow({
  link,
}: {
  link: (typeof home.knowledge.links)[number]
}) {
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <BookOpen aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {link.label}
          {link.external && (
            <ExternalLink
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
            />
          )}
        </span>
        <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
          {link.description}
        </span>
      </span>
      {link.external ? (
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      ) : (
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      )}
    </>
  )

  const className =
    "group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  )
}

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/70">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_85%_10%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_70%),radial-gradient(50%_50%_at_10%_90%,color-mix(in_oklch,var(--warning)_18%,transparent),transparent_70%)]"
        />
        <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-12 sm:px-6 lg:pt-20 lg:pb-16">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="order-1 space-y-6 lg:col-start-1 lg:row-start-1">
              <Badge
                variant="outline"
                className="h-6 gap-1.5 bg-background/70 px-3"
              >
                <Sparkles aria-hidden="true" className="size-3.5" />
                {home.eyebrow}
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-2xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  {home.title}
                </h1>
                <p className="max-w-xl text-lg text-pretty text-muted-foreground">
                  {home.lead}
                </p>
              </div>
              <p className="max-w-xl text-sm font-medium text-foreground/80">
                {home.methods.equalityNote}
              </p>
            </div>

            <div className="order-2 lg:col-span-2 lg:row-start-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <HeroChoice
                  method={home.methods.form}
                  tone="primary"
                  icon={ListChecks}
                />
                <HeroChoice
                  method={home.methods.chat}
                  tone="success"
                  icon={MessagesSquare}
                />
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="text-pretty">{home.methods.note}</span>
              </p>
            </div>

            <div className="order-3 rounded-2xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur sm:p-6 lg:col-start-2 lg:row-start-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                  Po sprawdzeniu
                </p>
                <Badge variant="outline" className="bg-background/70">
                  DEMO
                </Badge>
              </div>
              <ul className="mt-5 grid gap-4">
                {home.heroPoints.map((point, index) => {
                  const Icon = heroIcons[index] ?? Info
                  return (
                    <li key={point.title} className="flex gap-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{point.title}</p>
                        <p className="text-xs text-pretty text-muted-foreground">
                          {point.text}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                Wersja demonstracyjna. Bez logowania i bez numeru PESEL.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeader
          eyebrow={home.methods.eyebrow}
          title={home.methods.title}
          lead={home.methods.lead}
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <MethodPanel
            method={home.methods.form}
            tone="primary"
            icon={ListChecks}
          />
          <MethodPanel
            method={home.methods.chat}
            tone="success"
            icon={MessagesSquare}
          />
        </div>

        <div className="mt-4 grid gap-4 rounded-2xl border border-border/70 bg-secondary/40 p-5 sm:grid-cols-3">
          {home.methods.shared.map((item) => (
            <div key={item.title}>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-pretty text-muted-foreground">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow={home.tools.eyebrow}
              title={home.tools.title}
            />
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              {home.tools.lead}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {home.tools.items.map((item, index) => {
              const Icon = toolIcons[index] ?? FileText
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-pretty text-muted-foreground">
                    {item.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-primary group-hover:underline">
                    {item.cta}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionHeader
            eyebrow={home.leave.eyebrow}
            title={home.leave.title}
            lead={home.leave.lead}
          />
          <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-sm text-pretty text-muted-foreground">
            {home.leave.note}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border/70 bg-card p-4 sm:p-6">
          <LeaveOverview />
          <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs text-pretty text-muted-foreground">
              To skrót przykładowego planu. W pełnym planerze zmienisz termin
              porodu, liczbę dzieci, tygodnie drugiego rodzica i zobaczysz
              wszystkie terminy, wnioski i dokumenty.
            </p>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/os-czasu">
                {home.leave.cta}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow="Przykładowe sytuacje"
              title="Różne rodziny. Różne potrzeby."
            />
            <p className="max-w-md text-sm text-pretty text-muted-foreground">
              Każda historia to syntetyczny scenariusz z dokumentacji projektu.
              Pokazuje, że system uwzględnia różne sytuacje rodzinne i zawodowe.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {home.personas.map((persona) => (
              <article
                key={persona.name}
                className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary">
                    {persona.name.slice(0, 1)}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {persona.scenario}
                  </Badge>
                </div>

                <blockquote className="mt-4">
                  <p className="text-lg leading-snug font-medium text-pretty">
                    „{persona.story}”
                  </p>
                </blockquote>

                <div className="mt-4 space-y-1 text-sm">
                  <p className="font-medium">{persona.name}</p>
                  <p className="text-muted-foreground">{persona.role}</p>
                </div>
                <p className="mt-3 text-xs text-pretty text-muted-foreground">
                  {persona.note}
                </p>

                <div className="mt-auto pt-5">
                  <Link
                    href="/start"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Sprawdź podobną sytuację
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-4 text-xs text-pretty text-muted-foreground">
            Wszystkie osoby i dane są syntetyczne. Scenariusze służą do
            porównania działania systemu, a nie do oceny konkretnej sprawy.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeader
          eyebrow={home.trust.eyebrow}
          title={home.trust.title}
          lead={home.trust.lead}
        />

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {home.trust.items.map((item, index) => {
            const Icon = trustIcons[index] ?? ShieldCheck
            return (
              <div key={item.title} className="border-t border-border pt-5">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-pretty text-muted-foreground">
                  {item.text}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Info aria-hidden="true" className="size-4 text-primary" />
                Demo, źródła i ograniczenia
              </p>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                {home.trust.note}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/o-projekcie">
                O projekcie i AI
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 grid gap-4 border-t border-border/70 pt-4 text-xs text-pretty text-muted-foreground md:grid-cols-3">
            <p>{SIMULATION_DISCLOSURE}</p>
            <p>{LEGAL_DISCLOSURE}</p>
            <p>{AI_DISCLOSURE}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow={home.faq.eyebrow}
                title={home.faq.title}
              />
              <p className="mt-4 max-w-sm text-sm text-pretty text-muted-foreground">
                Nie znalazłeś odpowiedzi? Zapytaj asystenta albo sprawdź
                szczegóły w sekcji o projekcie.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/asystent">Zapytaj asystenta</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/o-projekcie">O projekcie</Link>
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
              {home.faq.items.map((item) => (
                <details
                  key={item.question}
                  className="[&[open]_svg]:rotate-180"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform"
                    />
                  </summary>
                  <p className="px-5 pb-4 text-sm text-pretty text-muted-foreground">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeader
            eyebrow={home.knowledge.eyebrow}
            title={home.knowledge.title}
            lead={home.knowledge.lead}
          />

          <ul className="grid gap-3">
            {home.knowledge.links.map((link) => (
              <li key={link.href}>
                <KnowledgeRow link={link} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground shadow-lg shadow-primary/10 sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
                {home.finalCta.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {home.finalCta.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-pretty text-primary-foreground/85 sm:text-base">
                {home.finalCta.lead}
              </p>
            </div>

            <div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="h-12 w-full px-5"
                >
                  <Link href="/start">
                    <ListChecks data-icon="inline-start" aria-hidden="true" />
                    {home.finalCta.form}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="h-12 w-full px-5"
                >
                  <Link href="/asystent">
                    <MessagesSquare
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    {home.finalCta.chat}
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-xs text-pretty text-primary-foreground/75">
                {home.finalCta.note}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
