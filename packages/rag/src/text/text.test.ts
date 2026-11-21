import { describe, expect, it } from "vitest"

import {
  buildOrTsQuery,
  buildPhraseTsQuery,
  foldDiacritics,
  polishStem,
  queryStems,
  toSearchText,
  toStemText,
} from "./search-text"
import {
  detectBenefitTags,
  detectCodes,
  detectDomainTerms,
  expandSynonyms,
} from "./vocabulary"

describe("search text", () => {
  it("folds Polish diacritics including ł and superscripts", () => {
    expect(foldDiacritics("Zasiłek Łódź żółć")).toBe("Zasilek Lodz zolc")
    expect(toSearchText("art. 182¹a")).toBe("art 1821a")
  })

  it("keeps form codes as single hyphenated tokens", () => {
    expect(toSearchText("Druk Z-3a, Z-3 oraz e-ZLA (L4).")).toBe(
      "druk z-3a z-3 oraz e-zla l4"
    )
    expect(toSearchText("pracownik - ojciec")).toBe("pracownik ojciec")
  })

  it("stems inflected forms to the same token", () => {
    const pairs: Array<[string, string]> = [
      ["urlop", "urlopu"],
      ["urlop", "urlopie"],
      ["rodzicielski", "rodzicielskiego"],
      ["macierzyński", "macierzyńskim"],
      ["zasiłek", "zasiłku"],
      ["wniosek", "wniosku"],
      ["wymiar", "wymiarze"],
      ["poród", "porodzie"],
      ["wykorzystać", "wykorzystany"],
      ["przedawnia", "przedawnienie"],
    ]
    for (const [a, b] of pairs) {
      expect(polishStem(toSearchText(a)), `${a} ~ ${b}`).toBe(
        polishStem(toSearchText(b))
      )
    }
    expect(polishStem("z-3a")).toBe("z-3a")
    expect(toStemText("urlopu rodzicielskiego")).toBe(
      toStemText("urlop rodzicielski")
    )
  })

  it("drops stopwords and duplicates from query stems", () => {
    expect(queryStems("Czy i jak")).toEqual([])
    expect(queryStems("urlop urlopu na Z-3a")).toEqual(["urlop", "z-3a"])
  })

  it("builds safe tsquery strings", () => {
    expect(buildOrTsQuery(["urlop", "z-3a"])).toBe("'urlop' | 'z-3a'")
    expect(buildOrTsQuery(["a'b|c&!d"])).toBe("'abcd'")
    expect(buildOrTsQuery([])).toBeNull()
    expect(buildPhraseTsQuery("urlop rodzicielski")).toBe(
      "'urlop' <-> 'rodzici'"
    )
  })
})

describe("domain vocabulary", () => {
  it("distinguishes Z-3 from Z-3a and Z-3b", () => {
    expect(detectDomainTerms("zaświadczenie Z-3").map((t) => t.term)).toEqual([
      "Z-3",
    ])
    expect(detectDomainTerms("zaświadczenie Z-3a").map((t) => t.term)).toEqual([
      "Z-3a",
    ])
    expect(detectCodes("Złóż Z-3b albo ZAM")).toEqual(["ZAM", "Z-3b"])
  })

  it("resolves aliases and inflected multi-word terms", () => {
    expect(detectDomainTerms("Mam L4 w ciąży").map((t) => t.term)).toContain(
      "e-ZLA"
    )
    expect(
      detectDomainTerms("zaświadczenie za zyciem").map((t) => t.term)
    ).toContain("Za życiem")
    expect(
      detectDomainTerms("wymiar urlopu rodzicielskiego").map((t) => t.term)
    ).toContain("urlop rodzicielski")
    expect(
      detectDomainTerms("zasiłku macierzyńskiego").map((t) => t.term)
    ).toContain("zasiłek macierzyński")
  })

  it("expands colloquial synonyms and detects benefit tags", () => {
    expect(expandSynonyms("tacierzyński")).toEqual(["urlop ojcowski"])
    expect(
      detectBenefitTags("urlop rodzicielski i zasiłek macierzyński")
    ).toEqual(expect.arrayContaining(["PARENTAL", "MATERNITY"]))
    expect(detectBenefitTags("Fundacja wspiera rodziców")).toContain("SUPPORT")
  })
})
