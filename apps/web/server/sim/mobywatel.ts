import type {
  MobywatelPersona,
  MobywatelProfile,
} from "@zpr/contracts/mobywatel"

/**
 * Synthetic identities for the mObywatel login simulation.
 *
 * Names, e-mails and dates are invented. No PESEL is returned: the real
 * mObywatel bundle contains it, but this product does not need it (data
 * minimisation), so the simulated consent screen explicitly asks for a
 * smaller scope.
 */
const PERSONAS: readonly MobywatelPersona[] = [
  {
    id: "anna-kowalska",
    firstName: "Anna",
    lastName: "Kowalska",
    birthDate: "1994-05-14",
    city: "Warszawa",
    email: "anna.kowalska@example.test",
    description: "Ciąża, jedno dziecko, umowa o pracę.",
    initials: "AK",
  },
  {
    id: "kasia-nowak",
    firstName: "Kasia",
    lastName: "Nowak",
    birthDate: "1997-11-02",
    city: "Kraków",
    email: "kasia.nowak@example.test",
    description: "Umowa zlecenia zakończona przed porodem.",
    initials: "KN",
  },
  {
    id: "tomasz-kowalski",
    firstName: "Tomasz",
    lastName: "Kowalski",
    birthDate: "1991-03-08",
    city: "Warszawa",
    email: "tomasz.kowalski@example.test",
    description: "Ojciec, umowa o pracę, drugi rodzic.",
    initials: "TK",
  },
]

export const MOBYWATEL_PIN_HINT = "1234"

export const MOBYWATEL_DISCLAIMER =
  "Symulacja. Ten ekran nie łączy się z login.gov.pl ani aplikacją mObywatel i nie przetwarza prawdziwych danych."

export function listMobywatelPersonas(): MobywatelPersona[] {
  return PERSONAS.map((persona) => ({ ...persona }))
}

export function findMobywatelPersona(
  personaId: string
): MobywatelPersona | null {
  return PERSONAS.find((persona) => persona.id === personaId) ?? null
}

export function toMobywatelProfile(
  persona: MobywatelPersona
): MobywatelProfile {
  return {
    firstName: persona.firstName,
    lastName: persona.lastName,
    birthDate: persona.birthDate,
    city: persona.city,
    email: persona.email,
  }
}
