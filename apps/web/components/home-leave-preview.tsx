"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarDays, ArrowUpRight } from "lucide-react"

const views = ["Razem", "Mama", "Drugi rodzic"] as const
const explanations = [
  "Jeden wspólny plan. Zobacz, jak można podzielić czas opieki nad dzieckiem.",
  "W tym przykładzie mama łączy urlop macierzyński z częścią rodzicielskiego.",
  "W tym przykładzie drugi rodzic wykorzystuje swoją część urlopu rodzicielskiego.",
]

export function HomeLeavePreview() {
  const [view, setView] = useState(0)
  return (
    <div className="leave-preview" data-ui>
      <div className="leave-preview__heading">
        <span className="leave-preview__symbol">
          <CalendarDays size={22} aria-hidden="true" />
        </span>
        <div>
          <h2>Wasz czas z dzieckiem</h2>
          <p>Przykładowy podział urlopów</p>
        </div>
      </div>
      <div
        className="leave-preview__switch"
        role="group"
        aria-label="Widok planu urlopów"
      >
        {views.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={view === index}
            onClick={() => setView(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="leave-preview__axis" aria-hidden="true">
        <span>Narodziny</span>
        <span>Kolejne miesiące</span>
      </div>
      <div className={`leave-preview__row ${view === 2 ? "is-muted" : ""}`}>
        <div className="leave-preview__label">
          <strong>Mama</strong>
          <span>Urlop macierzyński</span>
        </div>
        <div className="leave-preview__track">
          <div className="leave-preview__bar leave-preview__bar--maternity">
            20 tygodni
          </div>
        </div>
      </div>
      <div className={`leave-preview__row ${view === 2 ? "is-muted" : ""}`}>
        <div className="leave-preview__label">
          <strong>Mama</strong>
          <span>Urlop rodzicielski</span>
        </div>
        <div className="leave-preview__track">
          <div className="leave-preview__bar leave-preview__bar--parental">
            32 tygodnie
          </div>
        </div>
      </div>
      <div className={`leave-preview__row ${view === 1 ? "is-muted" : ""}`}>
        <div className="leave-preview__label">
          <strong>Drugi rodzic</strong>
          <span>Urlop rodzicielski</span>
        </div>
        <div className="leave-preview__track">
          <div className="leave-preview__bar leave-preview__bar--partner">
            9 tyg.
          </div>
        </div>
      </div>
      <p className="leave-preview__explanation" aria-live="polite">
        {explanations[view]}
      </p>
      <div className="leave-preview__footer">
        <span>
          Przykład dla jednego dziecka.
          <br />
          Schemat poglądowy, bez oceny uprawnień.
        </span>
        <Link href="/os-czasu" aria-label="Otwórz planer urlopów">
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
