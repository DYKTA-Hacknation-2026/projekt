import Link from "next/link"
import { Brand } from "@/components/brand"
import { LEGAL_DISCLOSURE, footerLinks } from "@/messages/pl"

const photos = [
  {
    title: "Couple Standing by Window Holding Newborn",
    author: "Dasha Halepova",
    source:
      "https://www.pexels.com/photo/couple-standing-by-window-holding-newborn-16852493/",
    license: "Pexels",
    licenseUrl: "https://www.pexels.com/license/",
  },
  {
    title: "Couple Holding Baby in Arms",
    author: "Dasha Halepova",
    source:
      "https://www.pexels.com/photo/couple-holding-baby-in-arms-16852510/",
    license: "Pexels",
    licenseUrl: "https://www.pexels.com/license/",
  },
  {
    title: "Heart shape on a pregnant belly",
    author: "freestocks.org",
    source: "https://www.flickr.com/photos/135396164@N05/32152969191",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    title: "Baby Holding Its Father's Finger",
    author: "Prestige by Nature",
    source:
      "https://www.pexels.com/photo/baby-holding-its-fathers-finger-21050251/",
    license: "Pexels",
    licenseUrl: "https://www.pexels.com/license/",
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-secondary/50 text-sm">
      <div className="mx-auto w-full max-w-[1320px] px-5 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Brand compact />
            <p className="mt-5 max-w-sm leading-relaxed">{LEGAL_DISCLOSURE}</p>
            <p className="mt-3 max-w-sm leading-relaxed">
              Projekt demonstracyjny. Dane i integracje są symulowane. Serwis
              nie jest oficjalnym serwisem ZUS.
            </p>
          </div>
          <nav aria-label="Nawigacja w stopce">
            <h2 className="font-sans text-lg font-semibold">Przewodnik</h2>
            <ul className="mt-4 grid gap-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="font-sans text-lg font-semibold">
              Źródła oficjalne
            </h2>
            <ul className="mt-4 grid gap-3">
              {[
                {
                  href: "https://www.zus.pl/",
                  label: "Zakład Ubezpieczeń Społecznych",
                },
                {
                  href: "https://www.gov.pl/web/rodzina/urlop-rodzicielski",
                  label: "gov.pl: urlop rodzicielski",
                },
                {
                  href: "https://www.pip.gov.pl/",
                  label: "Państwowa Inspekcja Pracy",
                },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <details className="mt-10 max-w-3xl">
          <summary className="cursor-pointer py-2 font-semibold">
            Zdjęcia i licencje
          </summary>
          <ul className="mt-3 grid gap-3">
            {photos.map((photo) => (
              <li key={photo.title}>
                <a
                  href={photo.source}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {photo.title}
                </a>
                {" — "}
                {photo.author}
                {", "}
                <a
                  href={photo.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {photo.license}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </footer>
  )
}
