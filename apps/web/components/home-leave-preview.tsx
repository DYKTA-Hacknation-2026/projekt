"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { addDays, daysBetween } from "@zpr/domain"
import { DEMO_DUE_DATE } from "@/lib/plan-seed"
import type { HomePlanItem } from "@/lib/home-plan-preview"

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const monthFormat = new Intl.DateTimeFormat("pl-PL", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
function dateLabel(date: string) {
  return dateFormat.format(new Date(`${date}T00:00:00Z`))
}
const ownerLabel = { MOTHER: "Mama", FATHER: "Tata", BOTH: "Oboje rodzice" }

export function HomeLeavePreview({ items }: { items: HomePlanItem[] }) {
  const [selectedId, setSelectedId] = useState(items[0]!.id)
  const selected = items.find((item) => item.id === selectedId) ?? items[0]!
  const periods = items.filter((item) => item.kind !== "deadline")
  const start = items.map((item) => item.start).sort()[0]!
  const end = items
    .map((item) => item.end ?? item.start)
    .sort()
    .at(-1)!
  const duration = daysBetween(start, end) + 1
  const left = (date: string) => (daysBetween(start, date) / duration) * 100
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const date = addDays(start, Math.round((duration * index) / 4))
    return { date, label: monthFormat.format(new Date(`${date}T00:00:00Z`)) }
  })

  return (
    <div className="leave-preview" data-ui>
      <div className="leave-preview__heading">
        <div>
          <h3>Urlopy i ważne terminy</h3>
          <p>Przykład: jedno dziecko, oboje rodzice na etacie</p>
        </div>
        <span className="leave-preview__due">
          Przewidywany poród <strong>{dateLabel(DEMO_DUE_DATE)}</strong>
        </span>
      </div>
      <div className="leave-preview__workspace">
        <div className="leave-preview__chart">
          <div className="leave-preview__axis" aria-hidden="true">
            {ticks.map((tick, index) => (
              <span key={tick.date} style={{ left: `${index * 25}%` }}>
                {tick.label}
              </span>
            ))}
          </div>
          {(["MOTHER", "FATHER"] as const).map((owner) => (
            <div
              className={`leave-preview__lane leave-preview__lane--${owner.toLowerCase()}`}
              key={owner}
            >
              <strong className="leave-preview__owner">
                {ownerLabel[owner]}
              </strong>
              <div className="leave-preview__track">
                {periods
                  .filter((item) => item.owner === owner)
                  .map((item) => {
                    const weeks = (item.days ?? 0) / 7
                    const offset = left(item.start)
                    const width = ((item.days ?? 0) / duration) * 100
                    // Very short periods keep their true width; the label moves
                    // outside the bar so the title never has to be truncated.
                    const isCompact = width < 16
                    const labelBefore = offset + width > 76

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={[
                          "leave-preview__period",
                          `leave-preview__period--${item.kind}`,
                          isCompact
                            ? "leave-preview__period--compact"
                            : undefined,
                          labelBefore
                            ? "leave-preview__period--label-start"
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{
                          left: `${offset}%`,
                          width: `calc(${width}% - var(--leave-period-gap))`,
                        }}
                        aria-pressed={selectedId === item.id}
                        aria-controls="home-plan-detail"
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span className="sr-only">{ownerLabel[owner]}: </span>
                        <span className="leave-preview__period-label">
                          <span className="leave-preview__period-title">
                            {item.title}
                          </span>
                          <span className="leave-preview__period-days">
                            {weeks} tyg.
                          </span>
                        </span>
                        <span className="sr-only"> Pokaż szczegóły</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
          <div className="leave-preview__formalities">
            <strong>Formalności</strong>
            <div>
              {items
                .filter((item) => item.kind === "deadline")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="leave-preview__deadline"
                    aria-pressed={selectedId === item.id}
                    aria-controls="home-plan-detail"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span>{dateLabel(item.start)}</span>
                    {item.title}
                    <span className="sr-only"> Pokaż szczegóły</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div
          className="leave-preview__detail"
          id="home-plan-detail"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{ownerLabel[selected.owner]}</span>
          <h4>
            {selected.kind === "deadline"
              ? selected.title
              : `Urlop ${selected.title.toLowerCase()}`}
          </h4>
          <p className="leave-preview__date">
            {dateLabel(selected.start)}
            {selected.end && <> – {dateLabel(selected.end)}</>}
          </p>
          <p>{selected.description}</p>
          <Link
            href={selected.kind === "deadline" ? "/dokumenty" : "/os-czasu"}
          >
            {selected.kind === "deadline"
              ? "Sprawdź dokumenty"
              : "Dopasuj w swoim planie"}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <p className="leave-preview__note">
        Przykład poglądowy, bez oceny uprawnień. Daty zmienią się, jeśli poród
        nastąpi w innym terminie.
      </p>
    </div>
  )
}
