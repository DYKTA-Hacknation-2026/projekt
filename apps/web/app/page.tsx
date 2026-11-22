import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ListChecks,
  MessagesSquare,
} from "lucide-react"
import { home } from "@/messages/pl"
import { HomeLeavePreview } from "@/components/home-leave-preview"
import { HomeMotion } from "@/components/home-motion"
import { homePlanExample } from "@/lib/home-plan-preview"
import "./home.css"

export const metadata: Metadata = {
  title: "Świadczenia i urlopy dla rodziców",
}

type HomeMethod = (typeof home.methods)["form"] | (typeof home.methods)["chat"]

function MethodCard({
  method,
  tone,
}: {
  method: HomeMethod
  tone: "form" | "chat"
}) {
  return (
    <Link
      href={method.href}
      className={`home-method home-method--${tone}`}
      data-reveal="item"
    >
      <h3>{method.label}</h3>
      <p>{method.description}</p>
      <span className="home-method__cta">
        {method.cta}
        <ArrowRight size={18} aria-hidden="true" />
      </span>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="home">
      <HomeMotion />
      <section className="home-hero home-shell" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <h1 id="home-title" data-reveal="heading">
            Więcej czasu
            <br />
            dla rodziny.
          </h1>
          <p className="home-hero__lead" data-reveal="copy">
            {home.lead}
          </p>

          <div className="home-hero__actions" data-reveal="copy">
            <Link
              href={home.methods.form.href}
              className="home-button home-button--white"
            >
              {home.methods.form.cta}
              <ListChecks size={20} aria-hidden="true" />
            </Link>
            <Link
              href={home.methods.chat.href}
              className="home-button home-button--quiet"
            >
              {home.methods.chat.cta}
              <MessagesSquare size={20} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="home-hero__photo" data-reveal="photo">
          <Image
            src="/images/hero-rodzice-z-noworodkiem.jpg"
            alt="Rodzice trzymają nowo narodzone dziecko przy oknie w domu."
            fill
            priority
            sizes="(max-width: 760px) 100vw, 55vw"
          />
        </div>
      </section>
      <div className="home-shell">
        <ul className="home-trust" aria-label="Korzystanie z przewodnika">
          {home.trust.map((item) => (
            <li key={item}>
              <Check size={18} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <section
        className="home-section home-methods-section"
        id="sposob"
        aria-labelledby="methods-title"
      >
        <div className="home-shell">
          <div className="home-methods__intro">
            <h2 id="methods-title" data-reveal="heading">
              {home.methods.title}
            </h2>
            <p data-reveal="copy">{home.methods.lead}</p>
          </div>

          <div className="home-methods">
            <MethodCard method={home.methods.form} tone="form" />
            <MethodCard method={home.methods.chat} tone="chat" />
          </div>
        </div>
      </section>

      <section
        className="home-section"
        id="mozliwosci"
        aria-labelledby="tools-title"
      >
        <div className="home-shell home-tools">
          <div className="home-tools__intro">
            <h2 id="tools-title" data-reveal="heading">
              {home.tools.title}
            </h2>
            <p data-reveal="copy">{home.tools.lead}</p>
            <div className="home-tools__photo" data-reveal="photo">
              <Image
                src="/images/oczekiwanie-na-dziecko.jpg"
                alt="Przyszli rodzice układają dłonie w serce na ciążowym brzuchu."
                fill
                sizes="(max-width: 760px) 100vw, 40vw"
              />
            </div>
          </div>
          <ul className="home-tool-list">
            {home.paths.map((path) => (
              <li key={path.href} data-reveal="item">
                <Link href={path.href}>
                  <div>
                    <h3>{path.title}</h3>
                    <p>{path.description}</p>
                  </div>
                  <ArrowUpRight size={23} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="home-plan"
        id="jak-to-dziala"
        aria-labelledby="plan-title"
      >
        <div className="home-shell">
          <div className="home-plan__intro">
            <div>
              <h2 id="plan-title" data-reveal="heading">
                Wasz plan rodzicielstwa.
              </h2>
              <p data-reveal="copy">
                Urlopy obojga rodziców i ważne formalności na jednej osi czasu.
                Zobacz przykład, a potem dopasuj plan do siebie.
              </p>
            </div>
            <Link href="/os-czasu" className="home-button">
              Ułóż swój plan <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </div>
          <div data-reveal="copy">
            <HomeLeavePreview items={homePlanExample()} />
          </div>
        </div>
      </section>

      <section
        className="home-section"
        id="scenariusze"
        aria-labelledby="stories-title"
      >
        <div className="home-shell home-stories">
          <div className="home-stories__photo" data-reveal="photo">
            <Image
              src="/images/rodzina-z-dzieckiem.jpg"
              alt="Rodzice przytulają niemowlę w domu."
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
          <div className="home-stories__copy">
            <h2 id="stories-title" data-reveal="heading">
              Różne rodziny.
              <br />
              Różne potrzeby.
            </h2>
            <p data-reveal="copy">Zobacz, od czego zacząć w Twojej sytuacji.</p>
            <ul className="home-personas">
              {home.personas.map((persona) => (
                <li key={persona.title} data-reveal="item">
                  <Link href={persona.href}>
                    <div>
                      <h3>{persona.title}</h3>
                      <p>{persona.note}</p>
                    </div>
                    <ArrowUpRight size={22} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="home-small">
              Każdą sytuację sprawdzisz na własnych danych.
            </p>
          </div>
        </div>
      </section>

      <section className="home-questions" aria-labelledby="questions-title">
        <div className="home-shell home-questions__grid">
          <div>
            <h2 id="questions-title" data-reveal="heading">
              Warto wiedzieć.
            </h2>
            <p data-reveal="copy">Kilka odpowiedzi, zanim zaczniesz.</p>
            <Link href="/o-projekcie" className="home-text-link">
              O projekcie <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-faq">
            {[
              {
                q: "Czy to oficjalny serwis ZUS?",
                a: "Nie. To projekt demonstracyjny. Dane, dokumenty i integracje rządowe są symulowane. Informacje nie zastępują decyzji ZUS ani płatnika składek.",
              },
              {
                q: "Czym różni się formularz od rozmowy z asystentem?",
                a: "Formularz prowadzi przez pytania o rodzinę i pracę. W rozmowie opisujesz sytuację własnymi słowami i dopytujesz o przepisy. Kwoty w obu przypadkach wylicza kalkulator.",
              },
              {
                q: "Czy muszę się logować?",
                a: "Możesz rozpocząć demonstracyjną analizę bez logowania i bez numeru PESEL. Kreator pyta o informacje potrzebne do opisania sytuacji rodziny.",
              },
              {
                q: "Skąd pochodzą wyniki?",
                a: "Obliczenia opierają się na wersjonowanych regułach. Przy wynikach znajdziesz źródła i założenia. Brakujące dane oraz niezweryfikowane parametry są jawnie oznaczane.",
              },
            ].map(({ q, a }) => (
              <details key={q} data-reveal="item">
                <summary>
                  {q}
                  <span aria-hidden="true" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="knowledge-title">
        <div className="home-shell home-knowledge">
          <div className="home-knowledge__photo" data-reveal="photo">
            <Image
              src="/images/bliskosc-z-dzieckiem.webp"
              alt="Mała dłoń dziecka trzyma palec rodzica."
              fill
              sizes="(max-width: 760px) 100vw, 40vw"
            />
          </div>
          <div className="home-knowledge__copy">
            <h2 id="knowledge-title" data-reveal="heading">
              Centrum wiedzy.
            </h2>
            <p data-reveal="copy">
              Urlopy, świadczenia i dokumenty wyjaśnione prostym językiem. Z
              odnośnikami do przepisów i oficjalnych źródeł.
            </p>
            <div className="home-knowledge__links" data-reveal="copy">
              <Link href="/wiedza" className="home-text-link">
                Przeglądaj wiedzę <ArrowRight size={19} aria-hidden="true" />
              </Link>
              <Link href="/wiedza/faq" className="home-text-link">
                Najczęstsze pytania <ArrowRight size={19} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-close" aria-labelledby="close-title">
        <div className="home-shell">
          <div>
            <h2 id="close-title" data-reveal="heading">
              {home.finalCta.title}
            </h2>
            <p data-reveal="copy">{home.finalCta.text}</p>
          </div>
          <div className="home-close__actions" data-reveal="copy">
            <Link
              href={home.methods.form.href}
              className="home-button home-button--white"
            >
              {home.finalCta.form}
              <ListChecks size={20} aria-hidden="true" />
            </Link>
            <Link
              href={home.methods.chat.href}
              className="home-button home-button--quiet"
            >
              {home.finalCta.chat}
              <MessagesSquare size={20} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
