import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CalendarRange,
  Check,
  ClipboardList,
  FileCheck2,
  FileText,
  HeartHandshake,
  Info,
  LockKeyhole,
  MessagesSquare,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { home } from "@/messages/pl"
import { formatPln } from "@/lib/format"
import "./home.css"

export const metadata: Metadata = {
  title: "Spokojnie zaplanuj czas po narodzinach dziecka",
}

const capabilityIcons = {
  "/panel": Scale,
  "/kalkulator": Calculator,
  "/os-czasu": CalendarRange,
  "/dokumenty": FileCheck2,
  "/asystent": MessagesSquare,
} as const

const benefitIcons = [HeartHandshake, Scale, ClipboardList]
const principleIcons = [FileCheck2, Sparkles, LockKeyhole]

const panelRows = [
  ["Urlop macierzyński", "20 tygodni"],
  ["Urlop rodzicielski", "41 tygodni"],
  ["Dla drugiego rodzica", "9 tygodni"],
]

export default function HomePage() {
  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-shell home-hero__inner">
          <div className="home-hero__copy">
            <p className="home-eyebrow">
              <span className="home-eyebrow__dot" aria-hidden="true" />
              {home.eyebrow}
            </p>
            <h1 id="home-hero-title" className="home-hero__title">
              Spokojnie zaplanuj czas po{" "}
              <span className="home-hero__accent">narodzinach dziecka</span>.
            </h1>
            <p className="home-hero__lead">{home.lead}</p>

            <div className="home-hero__actions">
              <Link href="/start" className="home-button home-button--primary">
                {home.primaryCta}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="#scenariusze"
                className="home-button home-button--secondary"
              >
                {home.secondaryCta}
                <ArrowDown aria-hidden="true" />
              </Link>
            </div>

            <ul className="home-trust" aria-label="Co zyskujesz">
              {home.trust.map((item) => (
                <li key={item}>
                  <span className="home-trust__check" aria-hidden="true">
                    <Check />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="home-hero__media">
            <figure className="home-hero__figure">
              <div className="home-hero__frame">
                <Image
                  src="/images/hero-rodzice-z-noworodkiem.jpg"
                  alt="Rodzice trzymają nowo narodzone dziecko przy jasnym oknie w domu."
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 46vw"
                  className="home-hero__img"
                />
                <span className="home-hero__shade" aria-hidden="true" />
                <a
                  className="home-photo-credit"
                  href="https://www.pexels.com/photo/couple-standing-by-window-holding-newborn-16852493/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Fot. Dasha Halepova / Pexels
                </a>
              </div>
            </figure>

            <aside
              className="home-summary"
              aria-label="Przykładowa sprawa demo"
            >
              <p className="home-summary__label">
                <FileText aria-hidden="true" />
                Przykładowa sprawa · demo
              </p>
              <div className="home-summary__amount">
                <span>Szacunek łączny</span>
                <strong>{formatPln(15_540_000)}</strong>
              </div>
              <dl className="home-summary__rows">
                {panelRows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="home-summary__meta">
                <Info aria-hidden="true" />
                Podstawa 8 000 zł brutto · wynik niezweryfikowany (Q-29)
              </p>
            </aside>

            <p className="home-hero__time">
              <ShieldCheck aria-hidden="true" />
              Pierwszy wynik w około 3 minuty
            </p>
          </div>
        </div>
      </section>

      <section className="home-benefits" aria-labelledby="home-benefits-title">
        <div className="home-shell">
          <h2 id="home-benefits-title" className="sr-only">
            Dlaczego warto korzystać z przewodnika
          </h2>
          <ul className="home-benefits__grid">
            {home.benefits.map((benefit, index) => {
              const Icon = benefitIcons[index] ?? HeartHandshake
              return (
                <li key={benefit.title} className="home-benefit">
                  <span className="home-benefit__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section
        className="home-section"
        id="mozliwosci"
        aria-labelledby="home-capabilities-title"
      >
        <div className="home-shell">
          <header className="home-section__head">
            <div>
              <p className="home-eyebrow">Jedno miejsce na wszystko</p>
              <h2 id="home-capabilities-title">
                Co możesz zrobić w przewodniku
              </h2>
            </div>
            <p className="home-section__lead">
              Od pierwszego pytania o uprawnienia po gotowy plan urlopów i listę
              dokumentów. Wszystko po kolei, bez urzędowego języka.
            </p>
          </header>

          <ul className="home-capabilities">
            {home.paths.map((path) => {
              const Icon = capabilityIcons[path.href]
              return (
                <li
                  key={path.href}
                  className={`home-capability home-capability--${path.tone}`}
                >
                  <Link href={path.href} className="home-capability__link">
                    <span className="home-capability__top">
                      <span
                        className="home-capability__icon"
                        aria-hidden="true"
                      >
                        <Icon />
                      </span>
                      {path.tone === "featured" && (
                        <span className="home-capability__badge">
                          Zacznij tutaj
                        </span>
                      )}
                      <ArrowUpRight
                        className="home-capability__arrow"
                        aria-hidden="true"
                      />
                    </span>
                    <h3>{path.title}</h3>
                    <p>{path.description}</p>
                    <span className="home-capability__cue">
                      Przejdź
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section
        className="home-steps"
        id="jak-to-dziala"
        aria-labelledby="home-steps-title"
      >
        <div className="home-shell">
          <header className="home-section__head">
            <div>
              <p className="home-eyebrow">Jak to działa</p>
              <h2 id="home-steps-title">Spokojny plan w trzech krokach</h2>
            </div>
            <p className="home-section__lead">
              Każdy wynik ma numer reguły, wersję zestawu przepisów i jawne
              założenia. Braki danych nie zamieniają się w zgadywanie.
            </p>
          </header>

          <ol className="home-steps__list">
            {home.steps.map((step) => (
              <li key={step.number} className="home-step">
                <span className="home-step__number" aria-hidden="true">
                  {step.number}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="home-scenarios"
        id="scenariusze"
        aria-labelledby="home-scenarios-title"
      >
        <div className="home-shell home-scenarios__grid">
          <figure className="home-scenarios__figure">
            <div className="home-scenarios__frame">
              <Image
                src="/images/rodzina-z-dzieckiem.jpg"
                alt="Mama i tata blisko tulą niemowlę w domowym zaciszu."
                fill
                loading="lazy"
                sizes="(max-width: 900px) 100vw, 40vw"
                className="home-scenarios__img"
              />
              <span className="home-scenarios__shade" aria-hidden="true" />
              <a
                className="home-photo-credit"
                href="https://www.pexels.com/photo/father-and-mother-holding-baby-son-20729677/"
                target="_blank"
                rel="noreferrer"
              >
                Fot. Gisele Seidel / Pexels
              </a>
            </div>
            <figcaption>
              <span className="home-scenarios__tag">Scenariusze demo</span>
              <span>
                Dane osób są syntetyczne i służą do porównania wyników.
              </span>
            </figcaption>
          </figure>

          <div className="home-scenarios__content">
            <p className="home-eyebrow">Przykładowe sytuacje</p>
            <h2 id="home-scenarios-title">
              Zobacz, jak to wygląda dla konkretnej rodziny
            </h2>
            <p className="home-section__lead">
              Trzy historie, które pokazują różne punkty startu. Każda odpowiada
              scenariuszowi z dokumentacji projektu, więc wynik można sprawdzić
              z oczekiwanym.
            </p>

            <ul className="home-personas">
              {home.personas.map((persona) => (
                <li key={persona.name}>
                  <Link href="/panel" className="home-persona">
                    <span className="home-persona__avatar" aria-hidden="true">
                      {persona.name.slice(0, 1)}
                    </span>
                    <span className="home-persona__body">
                      <span className="home-persona__heading">
                        <span className="home-persona__name">
                          {persona.name}
                        </span>
                        <span className="home-persona__scenario">
                          {persona.scenario}
                        </span>
                      </span>
                      <span className="home-persona__role">{persona.role}</span>
                      <span className="home-persona__note">{persona.note}</span>
                    </span>
                    <span className="home-persona__cta">
                      Otwórz
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="home-scenarios__foot">
              <Info aria-hidden="true" />
              To symulacja. Wyniki nie zastępują decyzji ZUS.
            </p>
          </div>
        </div>
      </section>

      <section
        className="home-trust-section"
        aria-labelledby="home-trust-title"
      >
        <div className="home-shell home-trust-section__grid">
          <div>
            <p className="home-eyebrow">Zaufanie i przejrzystość</p>
            <h2 id="home-trust-title">Wiesz, skąd bierze się każda kwota</h2>
            <ul className="home-principles">
              {home.principles.map((principle, index) => {
                const Icon = principleIcons[index] ?? ShieldCheck
                return (
                  <li key={principle.title} className="home-principle">
                    <span className="home-principle__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <div>
                      <h3>{principle.title}</h3>
                      <p>{principle.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <aside className="home-honesty">
            <span className="home-honesty__icon" aria-hidden="true">
              <Info />
            </span>
            <h3>{home.honesty.title}</h3>
            <p>{home.honesty.text}</p>
            <Link href="/o-projekcie" className="home-honesty__link">
              {home.honesty.cta}
              <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-title">
        <div className="home-shell">
          <div className="home-cta__panel">
            <div className="home-cta__copy">
              <p className="home-cta__eyebrow">
                <Sparkles aria-hidden="true" />
                {home.finalCta.eyebrow}
              </p>
              <h2 id="home-cta-title">{home.finalCta.title}</h2>
              <p>{home.finalCta.text}</p>
            </div>
            <div className="home-cta__actions">
              <Link href="/start" className="home-button home-button--on-navy">
                {home.finalCta.primary}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/o-projekcie"
                className="home-button home-button--ghost-light"
              >
                {home.finalCta.secondary}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
