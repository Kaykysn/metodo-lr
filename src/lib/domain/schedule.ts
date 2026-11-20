// ==============================================================================
// Acompanhamento: horário habitual, atendimentos e feedback (tipos e regras puras).
// Horários vivem no fuso do estabelecimento: o horário habitual é "segunda 07:00" no relógio
// de São Paulo, e cada ocorrência vira um instante absoluto para comparar com remarcações.
// ==============================================================================

export const STUDIO_TZ = "America/Sao_Paulo";

export interface WeeklySlot {
  id: string;
  traineeId: string;
  weekday: number; // 0 = domingo … 6 = sábado
  startTime: string; // "HH:MM" no fuso do estabelecimento
  durationMin: number;
}

export type SessionChangeKind = "avulso" | "remarcacao" | "cancelamento";

/** Atendimento em data específica, ou alteração de UMA ocorrência do horário habitual. */
export interface SessionChange {
  id: string;
  traineeId: string;
  kind: SessionChangeKind;
  originalAt: string | null; // ocorrência do horário habitual afetada (remarcação/cancelamento)
  scheduledAt: string | null; // novo horário (avulso/remarcação)
  durationMin: number;
  note: string;
  createdAt: string;
}

export interface FollowUpNote {
  id: string;
  traineeId: string;
  occurredOn: string; // "YYYY-MM-DD"
  sessionAt: string | null; // atendimento ao qual a nota se refere, se houver
  studentReport: string;
  professionalNote: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpData {
  slots: WeeklySlot[];
  changes: SessionChange[];
  notes: FollowUpNote[];
}

export type AppointmentSource = "habitual" | "avulso" | "remarcado" | "cancelado";

export interface Appointment {
  key: string;
  at: string; // instante do atendimento (ISO); para "cancelado", o horário que foi cancelado
  durationMin: number;
  source: AppointmentSource;
  originalAt: string | null; // ocorrência do horário habitual (para remarcar/cancelar/desfazer)
  changeId: string | null;
  note: string;
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

// ---------------------------------------------------------------------------
// Fuso horário (sem bibliotecas): relógio local de um fuso <-> instante UTC
// ---------------------------------------------------------------------------
const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    partsFmt.set(tz, f);
  }
  return f;
}

/** Data e hora no relógio do fuso. */
export function localParts(ms: number, tz = STUDIO_TZ): { date: string; time: string; weekday: number } {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const [y, m, d] = date.split("-").map(Number);
  return { date, time: `${p.hour}:${p.minute}`, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function offsetMs(ms: number, tz: string): number {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Instante (ms) de "YYYY-MM-DD HH:MM" no relógio do fuso. */
export function zonedToUtc(date: string, time: string, tz = STUDIO_TZ): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMs(guess, tz);
  // Segunda passada cobre o dia de troca de horário (não ocorre em São Paulo desde 2019)
  t = guess - offsetMs(t, tz);
  return t;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function formatAppointment(iso: string, tz = STUDIO_TZ): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: tz, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function isValidTime(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

// ---------------------------------------------------------------------------
// Próximos atendimentos = horário habitual + avulsos + remarcados (− cancelados)
// ---------------------------------------------------------------------------
export function upcomingAppointments(
  data: Pick<FollowUpData, "slots" | "changes">,
  opts: { fromMs: number; days?: number; limit?: number; includeCanceled?: boolean; tz?: string }
): Appointment[] {
  const tz = opts.tz ?? STUDIO_TZ;
  const days = opts.days ?? 28;
  const until = opts.fromMs + days * 864e5;
  const byOriginal = new Map<number, SessionChange>();
  for (const c of data.changes) if (c.originalAt) byOriginal.set(Date.parse(c.originalAt), c);

  const out: Appointment[] = [];
  const startDate = localParts(opts.fromMs, tz).date;
  for (let i = 0; i <= days; i++) {
    const date = addDays(startDate, i);
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    for (const s of data.slots) {
      if (s.weekday !== weekday) continue;
      const at = zonedToUtc(date, s.startTime, tz);
      if (at + s.durationMin * 6e4 <= opts.fromMs || at > until) continue;
      const change = byOriginal.get(at);
      if (change?.kind === "remarcacao") continue; // aparece no novo horário, abaixo
      if (change?.kind === "cancelamento") {
        if (opts.includeCanceled) out.push({ key: `c:${change.id}`, at: new Date(at).toISOString(), durationMin: s.durationMin, source: "cancelado", originalAt: new Date(at).toISOString(), changeId: change.id, note: change.note });
        continue;
      }
      out.push({ key: `h:${s.id}:${at}`, at: new Date(at).toISOString(), durationMin: s.durationMin, source: "habitual", originalAt: new Date(at).toISOString(), changeId: null, note: "" });
    }
  }
  for (const c of data.changes) {
    if (c.kind === "cancelamento" || !c.scheduledAt) continue;
    const at = Date.parse(c.scheduledAt);
    if (at + c.durationMin * 6e4 <= opts.fromMs || at > until) continue;
    out.push({ key: `x:${c.id}`, at: new Date(at).toISOString(), durationMin: c.durationMin, source: c.kind === "avulso" ? "avulso" : "remarcado", originalAt: c.originalAt, changeId: c.id, note: c.note });
  }
  out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/** Histórico do mais recente para o mais antigo (data, horário do atendimento, criação). */
export function sortNotes(notes: FollowUpNote[]): FollowUpNote[] {
  const key = (n: FollowUpNote) => n.sessionAt ?? `${n.occurredOn}T23:59:59.999Z`;
  return [...notes].sort((a, b) => (b.occurredOn.localeCompare(a.occurredOn)) || key(b).localeCompare(key(a)) || b.createdAt.localeCompare(a.createdAt));
}
