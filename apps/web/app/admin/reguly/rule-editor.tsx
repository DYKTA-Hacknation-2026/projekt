import { History, Save } from "lucide-react"

import {
  RULE_EDITOR_META,
  type AdminRuleGroup,
  type AdminRuleVersion,
  type RuleFieldMeta,
} from "@zpr/contracts/rules-admin"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"

import { formatDate } from "@/lib/format"

import { saveRuleAction } from "./actions"
import { formatRuleValue, ruleInputValue } from "./format"

const STATUS_LABELS: Record<string, string> = {
  VERIFIED: "Zweryfikowana",
  PROPOSED: "Propozycja",
  UNVERIFIED: "Niezweryfikowana",
}

function statusVariant(status: string) {
  if (status === "VERIFIED") return "success" as const
  if (status === "UNVERIFIED") return "warning" as const
  return "info" as const
}

function objectValue(value: unknown, key: string): string | number | undefined {
  if (!value || typeof value !== "object") return undefined
  const entry = (value as Record<string, unknown>)[key]
  return typeof entry === "number" || typeof entry === "string"
    ? entry
    : undefined
}

function ObjectField({
  code,
  field,
  value,
}: {
  code: string
  field: RuleFieldMeta
  value: unknown
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 p-3 md:col-span-2">
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.unit && (
            <span className="font-normal text-muted-foreground">
              {" "}
              ({field.unit})
            </span>
          )}
        </p>
        {field.hint && (
          <p className="text-xs text-muted-foreground">{field.hint}</p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(field.objectLabels ?? {}).map(([key, label]) => {
          const id = `${code}-${field.key}-${key}`
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={id} className="text-xs">
                {label}
              </Label>
              <Input
                id={id}
                name={`param.${field.key}.${key}`}
                type="number"
                min={field.min}
                max={field.max}
                step={field.integer === false ? "0.01" : "1"}
                defaultValue={objectValue(value, key)}
                required
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FieldControl({
  code,
  field,
  value,
}: {
  code: string
  field: RuleFieldMeta
  value: unknown
}) {
  const id = `${code}-${field.key}`

  if (field.type === "boolean") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border/70 p-3">
        <input
          id={id}
          name={`param.${field.key}`}
          type="checkbox"
          defaultChecked={value === true}
          className="mt-0.5 size-4 rounded border-input accent-primary"
        />
        <div className="space-y-0.5">
          <Label htmlFor={id}>{field.label}</Label>
          {field.hint && (
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          )}
        </div>
      </div>
    )
  }

  if (field.type === "weeks" || field.type === "pool") {
    return <ObjectField code={code} field={field} value={value} />
  }

  const isPercent = field.type === "percent"
  const isMoney = field.type === "money"
  const min = isPercent ? 0 : field.min
  const max = isPercent ? 100 : field.max
  const step = field.integer ? "1" : "0.01"

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {field.label}
        {field.unit && (
          <span className="font-normal text-muted-foreground">
            {" "}
            ({field.unit})
          </span>
        )}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={`param.${field.key}`}
          type="number"
          inputMode={field.integer ? "numeric" : "decimal"}
          min={min}
          max={max}
          step={step}
          defaultValue={ruleInputValue(field, value)}
          placeholder={isMoney && field.allowNull ? "brak wartości" : undefined}
          className={isPercent ? "pr-7" : undefined}
        />
        {isPercent && (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            %
          </span>
        )}
      </div>
      {field.hint && (
        <p className="text-xs text-muted-foreground">{field.hint}</p>
      )}
    </div>
  )
}

function VersionHistory({ versions }: { versions: AdminRuleVersion[] }) {
  return (
    <details className="rounded-lg border border-border/70">
      <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-medium">
        <History aria-hidden="true" className="size-4 text-muted-foreground" />
        Historia wersji ({versions.length})
      </summary>
      <div className="border-t border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Wersja</TableHead>
              <TableHead>Obowiązuje</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4">Notatka</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => (
              <TableRow key={version.id}>
                <TableCell className="pl-4 font-mono text-xs">
                  {version.version}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(version.effectiveFrom)} –{" "}
                  {version.effectiveTo
                    ? formatDate(version.effectiveTo)
                    : "bez końca"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(version.verificationStatus)}>
                    {STATUS_LABELS[version.verificationStatus] ??
                      version.verificationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[22rem] pr-4 text-xs whitespace-normal text-muted-foreground">
                  {version.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  )
}

export function RuleEditorCard({ rule }: { rule: AdminRuleGroup }) {
  const meta = RULE_EDITOR_META[rule.code]
  const current = rule.current ?? rule.versions[0] ?? null

  return (
    <Card>
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                {rule.code}
              </span>
              {rule.title}
            </CardTitle>
            <CardDescription>
              {meta?.summary ?? rule.description}
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {rule.legalReference}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {current && (
              <>
                <Badge variant="outline" className="font-mono">
                  {current.version}
                </Badge>
                <Badge variant={statusVariant(current.verificationStatus)}>
                  {STATUS_LABELS[current.verificationStatus] ??
                    current.verificationStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  od {formatDate(current.effectiveFrom)}
                </span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {meta && current ? (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {meta.fields.map((field) => (
              <div key={field.key} className="space-y-0.5">
                <dt className="text-xs font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="text-sm">
                  {formatRuleValue(field, current.parameters[field.key])}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ta reguła nie ma jeszcze edytora w panelu. Wartości można zmienić
            przez nową wersję danych.
          </p>
        )}

        {meta && (
          <details className="rounded-lg border border-border/70 bg-muted/30">
            <summary className="cursor-pointer p-3 text-sm font-medium text-primary">
              Zmień parametry i utwórz nową wersję
            </summary>
            <form
              action={saveRuleAction}
              className="space-y-5 border-t border-border/70 p-4"
            >
              <input type="hidden" name="ruleId" value={rule.ruleId} />
              <input type="hidden" name="code" value={rule.code} />

              <div className="grid gap-4 sm:grid-cols-2">
                {meta.fields.map((field) => (
                  <FieldControl
                    key={field.key}
                    code={rule.code}
                    field={field}
                    value={current?.parameters[field.key]}
                  />
                ))}
              </div>

              <fieldset className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
                <legend className="sr-only">Nowa wersja</legend>
                <div className="space-y-1.5">
                  <Label htmlFor={`${rule.code}-effectiveFrom`}>
                    Obowiązuje od
                  </Label>
                  <Input
                    id={`${rule.code}-effectiveFrom`}
                    name="effectiveFrom"
                    type="date"
                    min={rule.nextEffectiveFrom}
                    defaultValue={rule.nextEffectiveFrom}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Poprzednia wersja zostanie zamknięta dzień wcześniej.
                    Wersja:{" "}
                    <span className="font-mono">{rule.suggestedVersion}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${rule.code}-status`}>
                    Status weryfikacji
                  </Label>
                  <select
                    id={`${rule.code}-status`}
                    name="verificationStatus"
                    defaultValue="PROPOSED"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="PROPOSED">
                      Propozycja — do potwierdzenia
                    </option>
                    <option value="VERIFIED">
                      Zweryfikowana — wymaga źródła
                    </option>
                    <option value="UNVERIFIED">
                      Niezweryfikowana — wartość zewnętrzna
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${rule.code}-sourceUrl`}>
                    Źródło (adres URL)
                  </Label>
                  <Input
                    id={`${rule.code}-sourceUrl`}
                    name="sourceUrl"
                    type="url"
                    defaultValue={current?.sourceUrl ?? ""}
                    placeholder="https://www.zus.pl/…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${rule.code}-notes`}>
                    Notatka dla audytu
                  </Label>
                  <Textarea
                    id={`${rule.code}-notes`}
                    name="notes"
                    rows={2}
                    placeholder="Np. nowelizacja ustawy, Dz.U. …"
                  />
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-xs text-muted-foreground">
                  Zapis tworzy nową, niezmienną wersję. Wcześniejsze wersje
                  pozostają w historii, a obliczenia z ich datą nadal korzystają
                  z dawnych wartości.
                </p>
                <Button type="submit">
                  <Save aria-hidden="true" data-icon="inline-start" />
                  Zapisz nową wersję
                </Button>
              </div>
            </form>
          </details>
        )}

        {rule.versions.length > 1 && (
          <VersionHistory versions={rule.versions} />
        )}
      </CardContent>
    </Card>
  )
}
