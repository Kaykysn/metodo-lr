"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, Button, ButtonLink, EmptyState, ErrorNote, Loading, Panel, formatDateBR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { Bell, Eye, Mail, Calendar, CreditCard, AlertCircle, CheckCircle2, XCircle, User, MessageSquare, ArrowRight, Filter, Loader2, MapPin } from "lucide-react";
import type { TeacherNotification } from "@/lib/domain/types";

const TYPE_LABEL: Record<TeacherNotification["type"], string> = {
  link_request: "Solicitação de vínculo",
  schedule_choice: "Horário escolhido",
  gym_change: "Mudança de academia",
  reschedule: "Remarcação",
  cancellation: "Cancelamento",
  late_cancellation: "Desistência tardia",
  feedback_edit: "Feedback editado",
  payment_recorded: "Mensalidade paga",
};

const TYPE_ICON: Record<TeacherNotification["type"], React.ComponentType<{ className?: string }>> = {
  link_request: User,
  schedule_choice: Calendar,
  gym_change: MapPin,
  reschedule: Calendar,
  cancellation: XCircle,
  late_cancellation: AlertCircle,
  feedback_edit: MessageSquare,
  payment_recorded: CreditCard,
};

const TYPE_TONE: Record<TeacherNotification["type"], "success" | "caution" | "danger" | "neutral"> = {
  link_request: "success",
  schedule_choice: "neutral",
  gym_change: "neutral",
  reschedule: "caution",
  cancellation: "caution",
  late_cancellation: "danger",
  feedback_edit: "neutral",
  payment_recorded: "success",
};

export default function NotificacoesPage() {
  const { repo, actor, revision, bump } = useData();
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [markingAll, setMarkingAll] = useState(false);

  const notifications = useAsync(() => repo.listTeacherNotifications(actor, filter === "unread"), [repo, actor, filter, revision]);

  const handleMarkRead = async (id: string) => {
    try {
      await repo.markNotificationRead(actor, id);
      bump();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.data?.every((n) => n.readAt)) return;
    setMarkingAll(true);
    try {
      for (const n of notifications.data ?? []) {
        if (!n.readAt) await repo.markNotificationRead(actor, n.id);
      }
      bump();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setMarkingAll(false);
    }
  };

  const getLink = (n: TeacherNotification) => {
    switch (n.referenceType) {
      case "trainee":
        return n.referenceId ? `/app/alunos/${n.referenceId}` : null;
      case "occurrence":
        return n.referenceId ? `/app/alunos/agenda?occurrence=${n.referenceId}` : null;
      case "payment":
        return n.referenceId ? `/app/alunos/${n.traineeId}?tab=payments` : null;
      case "link_request":
        return `/app/alunos?tab=requests`;
      case "feedback":
        return n.referenceId ? `/app/alunos/${n.traineeId}?tab=feedback` : null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Notificações" description="Atualizações dos seus alunos" />
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "unread")}
            className="inputClass min-w-[180px]"
          >
            <option value="unread">Não lidas</option>
            <option value="all">Todas</option>
          </select>
          {notifications.data?.some((n) => !n.readAt) && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead} disabled={markingAll}>
              {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : "Marcar todas como lidas"}
            </Button>
          )}
        </div>
      </div>

      {notifications.status === "loading" && <Loading />}
      {notifications.status === "error" && <ErrorNote>{notifications.error}</ErrorNote>}

      {notifications.status === "ready" && notifications.data && notifications.data.length === 0 && (
        <EmptyState title={filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"} description={filter === "unread" ? "Tudo em dia! As notificações dos seus alunos aparecerão aqui." : "Quando houver atividade dos seus alunos, você será notificado."} />
      )}

      {notifications.status === "ready" && notifications.data && notifications.data.length > 0 && (
        <div className="space-y-3">
          {notifications.data.map((n) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={handleMarkRead} getLink={getLink} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({ notification, onMarkRead, getLink }: { notification: TeacherNotification; onMarkRead: (id: string) => void; getLink: (n: TeacherNotification) => string | null }) {
  const Icon = TYPE_ICON[notification.type];
  const isUnread = !notification.readAt;
  const link = getLink(notification);

  return (
    <Panel className={`p-4 flex flex-col sm:flex-row sm:items-start gap-4 ${isUnread ? "bg-theme-secondary/50 border-theme-teal/20" : ""}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUnread ? "bg-theme-teal/10 text-theme-teal" : "bg-theme-secondary text-theme-muted"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={TYPE_TONE[notification.type]}>{TYPE_LABEL[notification.type]}</Badge>
              {isUnread && <span className="w-2 h-2 rounded-full bg-theme-teal" aria-label="Não lida" />}
            </div>
            <span className="text-xs text-theme-muted shrink-0">{formatDateBR(notification.createdAt)}</span>
          </div>
          <h3 className={`mt-1 font-medium ${isUnread ? "text-theme-text" : "text-theme-muted"}`}>{notification.title}</h3>
          <p className="mt-1 text-sm text-theme-muted">{notification.summary}</p>
          {notification.traineeId && (
            <p className="mt-1 text-xs text-theme-subtle">Aluno: {notification.traineeId}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {isUnread && (
          <Button variant="ghost" size="sm" onClick={() => onMarkRead(notification.id)}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Marcar como lida
          </Button>
        )}
        {link && (
          <ButtonLink variant="secondary" size="sm" href={link}>
            <ArrowRight className="w-4 h-4 mr-1.5" /> Ver detalhes
          </ButtonLink>
        )}
      </div>
    </Panel>
  );
}