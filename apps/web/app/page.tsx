import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Check } from "lucide-react"
import { home } from "@/messages/pl"
import { HomeLeavePreview } from "@/components/home-leave-preview"
import { HomeMotion } from "@/components/home-motion"
import "./home.css"

export const metadata: Metadata = { title: "Świadczenia i urlopy dla rodziców" }

export default function HomePage() {
  return (
    <HomeMotion>
      <section className="home-hero home-shell" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <h1 id="home-title" data-reveal="heading">
            Więcej czasu
            <br />
            dla rodziny.
          </h1>
          <p className="home-hero__lead" data-reveal="copy">
            Sprawdź świadczenia, zaplanuj urlopy i przygotuj dokumenty na
            narodziny dziecka. Przejdziemy przez to razem.
          </p>
          <Link
            href="/start"
            className="home-button home-button--white"
            data-reveal="copy"
          >
            Sprawdź swoje świadczenia{" "}
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <Link href="#mozliwosci" className="home-hero__secondary">
            Poznaj przewodnik
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
        className="home-section"
        id="mozliwosci"
        aria-labelledby="tools-title"
      >
        <div className="home-shell home-tools">
          <div className="home-tools__intro">
            <h2 id="tools-title" data-reveal="heading">
              Świadczenia
              <br />i dokumenty.
            </h2>
            <p data-reveal="copy">
              Wybierz to, czego potrzebujesz. Możesz zacząć od swojej sytuacji
              lub od razu przejść do kalkulatora, dokumentów i planu urlopów.
            </p>
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
              Pierwszy krok?
              <br />
              Twoja sytuacja.
            </h2>
            <p data-reveal="copy">
              Opowiedz nam o swoim planie na rodzicielstwo.
            </p>
          </div>
          <Link href="/start" className="home-button home-button--white">
            Sprawdź swoje świadczenia{" "}
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </HomeMotion>
  )
}
