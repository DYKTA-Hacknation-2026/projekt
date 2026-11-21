import { AlertTriangle, Database } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export function DbOffline({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "Nieznany błąd połączenia"

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Baza danych nie odpowiada</AlertTitle>
        <AlertDescription>
          Widok korzysta z PostgreSQL z rozszerzeniem pgvector. Uruchom bazę i
          zastosuj migracje, a następnie odśwież stronę.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            Jak naprawić lokalne środowisko
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>W katalogu repozytorium uruchom kolejno:</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
            <code>{`docker compose up -d db
pnpm --filter @zpr/db db:migrate
pnpm --filter @zpr/db db:seed
pnpm --filter @zpr/rag kb:seed`}</code>
          </pre>
          <p className="text-muted-foreground">
            Domyślny adres bazy to{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              postgresql://zpr:***@localhost:5435/zpr
            </code>
            . Szczegóły w pliku <code>.env.example</code> i README.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="font-mono text-xs break-all text-muted-foreground">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
