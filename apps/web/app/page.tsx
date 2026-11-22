import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ListChecks,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react"
import { home } from "@/messages/pl"
import { HomeLeavePreview } from "@/components/home-leave-preview"
import { HomeMotion } from "@/components/home-motion"
import "./home.css"

export const metadata: Metadata = {
  title: "Świadczenia i urlopy dla rodziców",
}

type HomeMethod = (typeof home.methods)["form"] | (typeof home.methods)["chat"]

function MethodCard({
  method,
  icon: Icon,
  tone,
}: {
  method: HomeMethod
  icon: LucideIcon
  tone: "form" | "chat"
}) {
  return (
    <Link
      href={method.href}
      className={`home-method home-method--${tone}`}
      data-reveal="item"
    >
      <span className="home-method__label">
        <Icon size={19} aria-hidden="true" />
        {method.label}
      </span>
      <h3>{method.title}</h3>
      <p>{method.description}</p>

      <ul className="home-method__list">
        {method.bullets.map((bullet) => (
          <li key={bullet}>
            <Check size={17} aria-hidden="true" />
            {bullet}
          </li>
        ))}
      </ul>

      <span className="home-method__footer">
        <span className="home-method__cta">
          {method.cta}
          <ArrowRight size={18} aria-hidden="true" />
        </span>
        <span className="home-method__meta">{method.meta}</span>
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
              className="home-button home-button--white"
            >
              {home.methods.chat.cta}
              <MessagesSquare size={20} aria-hidden="true" />
            </Link>
          </div>
          <p className="home-hero__choice-note" data-reveal="copy">
            {home.methods.equalityNote}
          </p>

          <Link href="#sposob" className="home-hero__secondary">
            Poznaj oba sposoby
          </Link>
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
            <MethodCard
              method={home.methods.form}
              icon={ListChecks}
              tone="form"
            />
            <MethodCard
              method={home.methods.chat}
              icon={MessagesSquare}
              tone="chat"
            />
          </div>

          <p className="home-small" data-reveal="copy">
            {home.methods.note}
          </p>
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
        <div className="home-shell home-plan__grid">
          <div className="home-plan__copy">
            <h2 id="plan-title" data-reveal="heading">
              Wasz urlop.
              <br />
              Wasz podział.
            </h2>
            <p data-reveal="copy">
              Pierwsze miesiące to wspólny czas. Zobacz przykładowy podział
              urlopów między rodzicami, a potem ułóż plan dopasowany do swojej
              sytuacji.
            </p>
            <Link href="/os-czasu" className="home-text-link">
              Otwórz planer urlopów <ArrowRight size={19} aria-hidden="true" />
            </Link>
            <div className="home-plan__photo" data-reveal="photo">
              <Image
                src="/images/bliskosc-z-dzieckiem.webp"
                alt="Mała dłoń dziecka trzyma palec rodzica."
                fill
                sizes="(max-width: 760px) 100vw, 40vw"
              />
            </div>
          </div>
          <div data-reveal="copy">
            <HomeLeavePreview />
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
            <p data-reveal="copy">
              Etat czy własna działalność? Poznaj przykładowe sytuacje i zobacz,
              jak korzystać z przewodnika.
            </p>
            <ul className="home-personas">
              {home.personas.map((persona) => (
                <li key={persona.name} data-reveal="item">
                  <Link href="/panel">
                    <div>
                      <h3>{persona.name}</h3>
                      <p className="home-persona-story">„{persona.story}”</p>
                      <span>{persona.role}</span>
                      <p>{persona.note}</p>
                    </div>
                    <ArrowUpRight size={22} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="home-small">
              Przykłady demonstracyjne. Dane osób są syntetyczne.
            </p>
          </div>
        </div>
      </section>

      <section className="home-questions" aria-labelledby="questions-title">
        <div className="home-shell home-questions__grid">
          <div>
            <h2 id="questions-title" data-reveal="heading">
              Pytania
              <br />i odpowiedzi.
            </h2>
            <p data-reveal="copy">
              Jasne zasady i źródła. Zanim podasz informacje o swojej sytuacji,
              sprawdź, jak działa przewodnik.
            </p>
            <Link href="/o-projekcie" className="home-text-link">
              O projekcie i jego ograniczeniach{" "}
              <ArrowUpRight size={19} aria-hidden="true" />
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
                a: "To dwa sposoby rozpoczęcia tej samej analizy. Formularz prowadzi krok po kroku i porządkuje dane. Rozmowa pozwala opisać sytuację własnymi słowami i od razu dopytać o przepisy. Obie ścieżki prowadzą do tego samego kalkulatora i tych samych zastrzeżeń.",
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
        <div className="home-shell home-questions__grid">
          <div>
            <h2 id="knowledge-title" data-reveal="heading">
              Centrum wiedzy.
            </h2>
            <p data-reveal="copy">
              Artykuły, najczęstsze pytania, karty dokumentów, przewodniki i
              słownik pojęć. Wszystko prostym językiem, z datą weryfikacji i
              odnośnikiem do oficjalnego źródła.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4" data-reveal="copy">
            <Link href="/wiedza" className="home-text-link">
              Przeglądaj wiedzę <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
            <Link href="/wiedza/faq" className="home-text-link">
              Najczęstsze pytania <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
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
              className="home-button home-button--white"
            >
              {home.finalCta.chat}
              <MessagesSquare size={20} aria-hidden="true" />
            </Link>
            <p className="home-close__note">{home.finalCta.note}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
