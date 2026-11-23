"use client";

import { ROLE_LABEL, type Role } from "@/lib/domain/roles";
import CatalogAdminPanel from "@/components/catalog/CatalogAdminPanel";

import React, { useCallback, useEffect, useState } from "react";
import { loadAccounts, loadAudit, runAdminAction, type AdminAction } from "@/lib/data/admin-api";
import AccessRequestsPanel from "@/components/admin/AccessRequestsPanel";
import Link from "next/link";
import {
  INITIAL_DEMO_USERS,
  INITIAL_DEMO_AUDIT_LOGS,
} from "@/lib/demo-store";
import {
  evaluateAccessEntitlement,
  adminApproveUser,
  adminPauseUser,
  adminResumeUser,
  adminExtendUser,
  adminRevokeUser,
  UserAccessProfile,
  AccessAuditRecord,
} from "@/lib/access-policy";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Lock,
} from "lucide-react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

export default function AdminPage() {
  // Modo real: dados e ações vêm do backend (Edge Function admin-access). Demonstração: dados locais.
  const real = isSupabaseConfigured;
  const [users, setUsers] = useState<UserAccessProfile[]>(real ? [] : INITIAL_DEMO_USERS);
  const [auditLogs, setAuditLogs] = useState<AccessAuditRecord[]>(real ? [] : INITIAL_DEMO_AUDIT_LOGS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Prazos e datas dependem do relógio e do fuso do navegador: só renderiza depois de montar,
  // para o HTML pré-gerado não divergir do que o navegador calcula (erro de hidratação).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // A própria conta não recebe botões: o backend recusa (admin_set_access) e o clique só daria erro.
  const [selfId, setSelfId] = useState<string | null>(null);
  useEffect(() => {
    const client = real ? getSupabaseBrowserClient() : null;
    if (!client) return;
    void client.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null));
  }, [real]);

  const reload = useCallback(async () => {
    if (!real) return;
    try {
      const accounts = await loadAccounts();
      setUsers(accounts);
      setAuditLogs(await loadAudit(accounts));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar as contas.");
    }
  }, [real]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** No modo real executa no servidor e recarrega; devolve false se falhar. */
  const remote = async (userId: string, action: AdminAction, message: string, days?: number) => {
    setBusy(true);
    try {
      await runAdminAction(userId, action, days);
      await reload();
      setFeedbackNotice(message);
    } catch (e) {
      setFeedbackNotice(e instanceof Error ? e.message : "A ação não foi concluída.");
    } finally {
      setBusy(false);
      setTimeout(() => setFeedbackNotice(null), 4000);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const handleApprove = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (real) return void remote(userId, "approve", `Ação registrada para ${user.fullName}.`);
    const { updatedProfile, audit } = adminApproveUser(user, "admin@studioleandrorangel.com.br");
    setUsers(users.map((u) => (u.id === userId ? updatedProfile : u)));
    setAuditLogs([audit, ...auditLogs]);
    setFeedbackNotice(`Usuário ${user.fullName} aprovado. Os 30 dias iniciarão no 1º acesso.`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handlePause = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (real) return void remote(userId, "pause", `Ação registrada para ${user.fullName}.`);
    const { updatedProfile, audit } = adminPauseUser(user, "admin@studioleandrorangel.com.br");
    setUsers(users.map((u) => (u.id === userId ? updatedProfile : u)));
    setAuditLogs([audit, ...auditLogs]);
    setFeedbackNotice(`Acesso de ${user.fullName} pausado e saldo congelado.`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleResume = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (real) return void remote(userId, "resume", `Ação registrada para ${user.fullName}.`);
    const { updatedProfile, audit } = adminResumeUser(user, "admin@studioleandrorangel.com.br");
    setUsers(users.map((u) => (u.id === userId ? updatedProfile : u)));
    setAuditLogs([audit, ...auditLogs]);
    setFeedbackNotice(`Acesso de ${user.fullName} retomado com nova expiração.`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleExtend = (userId: string, days: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (real) return void remote(userId, "extend", `Prazo de ${user.fullName} estendido em +${days} dias.`, days);
    const { updatedProfile, audit } = adminExtendUser(user, days, "admin@studioleandrorangel.com.br");
    setUsers(users.map((u) => (u.id === userId ? updatedProfile : u)));
    setAuditLogs([audit, ...auditLogs]);
    setFeedbackNotice(`Prazo de ${user.fullName} estendido em +${days} dias.`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleRevoke = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    // Revogar corta o acesso na hora e invalida um convite ainda não usado: pede confirmação
    if (!window.confirm(`Revogar o acesso de ${user.fullName} (${user.email})? A pessoa deixa de entrar e um convite ainda não usado para de funcionar.`)) return;
    if (real) return void remote(userId, "revoke", `Ação registrada para ${user.fullName}.`);
    const { updatedProfile, audit } = adminRevokeUser(user, "Determinação administrativa da moderação", "admin@studioleandrorangel.com.br");
    setUsers(users.map((u) => (u.id === userId ? updatedProfile : u)));
    setAuditLogs([audit, ...auditLogs]);
    setFeedbackNotice(`Acesso de ${user.fullName} foi revogado.`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.institution && u.institution.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === "all" || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* Cabeçalho do Console */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-theme-border gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-theme-text">
                Segurança & Governança
              </span>
            </div>
            <h1 className="lr-app-title text-2xl sm:text-3xl font-extrabold text-theme-text mt-1">
              Console de Gestão de Acessos
            </h1>
            <p className="text-xs sm:text-sm text-theme-muted mt-0.5">
              Aprovação de novos pedidos, congelamento de prazos, prorrogações e auditoria imutável.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isSupabaseConfigured && (
              <span className="px-3 py-1 bg-status-caution-bg text-status-caution-fg border border-status-caution-border rounded-lg text-xs font-bold">
                Modo Prévia Segura (Simulação Local)
              </span>
            )}
          </div>
        </div>

        {loadError && (
          <div role="alert" className="p-4 bg-status-danger-bg border border-status-danger-border text-status-danger-fg rounded-xl text-sm font-semibold">
            {loadError}
          </div>
        )}
        {busy && <p role="status" className="text-sm text-theme-muted">Registrando a ação…</p>}

        {/* Feedback de Ação */}
        {feedbackNotice && (
          <div className="p-4 bg-status-success-bg border border-status-success-border text-status-success-fg rounded-xl text-xs font-bold shadow-xs animate-fadeIn">
            {feedbackNotice}
          </div>
        )}

        {/* Pedidos de acesso (nome e e-mail) e convites de primeiro acesso */}
        {isSupabaseConfigured ? (
          <AccessRequestsPanel />
        ) : (
          <p className="rounded-xl border border-theme-border bg-theme-secondary/60 p-4 text-sm text-theme-muted">
            Na demonstração não há pedidos reais. Com o servidor configurado, os pedidos de acesso aparecem aqui com nome e e-mail.
          </p>
        )}

        <h2 className="text-lg font-bold text-theme-text">Contas</h2>

        {/* Painel de Filtros e Busca */}
        <div className="bg-theme-primary rounded-2xl p-5 border border-theme-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou instituição"
              className="w-full pl-9 pr-3 py-2 bg-theme-primary border border-theme-boundary/80 rounded-control text-xs text-theme-text focus:outline-hidden focus:border-[var(--lr-gold-deep)] focus:ring-2 focus:ring-[rgb(var(--accent-teal)/0.25)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-theme-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-theme-primary border border-theme-boundary/50 rounded-xl text-xs font-semibold text-theme-text"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Apenas Pendentes</option>
              <option value="active">Apenas Ativos</option>
              <option value="paused">Apenas Pausados</option>
              <option value="expired">Apenas Expirados</option>
              <option value="revoked">Apenas Revogados</option>
            </select>
          </div>
        </div>

        {/* Tabela de Gestão de Usuários */}
        <div className="bg-theme-primary rounded-2xl border border-theme-border shadow-card overflow-hidden">
          <div className="p-4 bg-theme-secondary border-b border-theme-border flex items-center justify-between">
            <span className="text-xs font-bold text-theme-text">
              Usuários Registrados ({filteredUsers.length})
            </span>
            <span className="text-[11px] text-theme-muted">
              Prazos calculados no fuso oficial America/Sao_Paulo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-theme-primary text-theme-text font-bold border-b border-theme-border">
                <tr>
                  <th scope="col" className="p-4">Usuário</th>
                  <th scope="col" className="p-4">Perfil</th>
                  <th scope="col" className="p-4">Situação</th>
                  <th scope="col" className="p-4">Fim do período de teste</th>
                  <th scope="col" className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {(mounted ? filteredUsers : []).map((user) => {
                  const evalUser = evaluateAccessEntitlement(user);
                  return (
                    <tr key={user.id} className="hover:bg-theme-secondary">
                      <td className="p-4">
                        <span className="font-bold text-theme-text block text-sm">{user.fullName}</span>
                        <span className="text-[11px] text-theme-muted">{user.email}</span>
                        {user.institution && (
                          <span className="text-[10px] text-theme-muted block mt-0.5">{user.institution}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-sm bg-theme-secondary text-theme-text font-medium capitalize">
                          {ROLE_LABEL[user.role as Role] ?? user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            user.status === "active"
                              ? "bg-status-success-bg text-status-success-fg"
                              : user.status === "pending"
                              ? "bg-status-caution-bg text-status-caution-fg"
                              : user.status === "paused"
                              ? "bg-theme-teal-subtle text-theme-teal"
                              : "bg-theme-border text-theme-text"
                          }`}
                        >
                          {user.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-theme-muted">
                        <div>{evalUser.formattedExpiresAt}</div>
                        {user.status === "active" && (
                          <span className="text-[10px] text-theme-text font-bold">
                            {evalUser.daysRemaining}d {evalUser.hoursRemaining}h restantes
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {user.id === selfId ? (
                          <span className="text-[11px] text-theme-muted">Sua conta</span>
                        ) : (
                        <>
                        {user.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(user.id)}
                            className="px-3 py-1.5 bg-action hover:bg-action-hover text-action-text rounded-control font-bold"
                          >
                            Aprovar 30d
                          </button>
                        )}

                        {user.status === "active" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePause(user.id)}
                              className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-control font-semibold"
                            >
                              Pausar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtend(user.id, 15)}
                              className="px-2.5 py-1.5 bg-theme-border hover:bg-theme-boundary/50 text-theme-text rounded-control font-semibold"
                            >
                              +15d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevoke(user.id)}
                              className="px-2.5 py-1.5 bg-status-danger-bg hover:bg-status-danger-border text-status-danger-fg rounded-control font-semibold"
                            >
                              Revogar
                            </button>
                          </>
                        )}

                        {user.status === "paused" && (
                          <button
                            type="button"
                            onClick={() => handleResume(user.id)}
                            className="px-3 py-1.5 bg-action hover:bg-action-hover text-action-text rounded-control font-bold"
                          >
                            Retomar Acesso
                          </button>
                        )}

                        {user.status === "expired" && (
                          <button
                            type="button"
                            onClick={() => handleExtend(user.id, 30)}
                            className="px-3 py-1.5 bg-action hover:bg-action-hover text-action-text rounded-lg font-bold"
                          >
                            Renovar +30d
                          </button>
                        )}
                        </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trilha de Auditoria (Audit Logs) */}
        <div className="bg-theme-primary rounded-2xl p-6 border border-theme-border shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-theme-border">
            <h3 className="text-base font-bold text-theme-text">
              Trilha de Auditoria do Servidor (Audit Log)
            </h3>
            <span className="text-xs text-theme-muted">Registros imutáveis de transição</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(mounted ? auditLogs : []).map((log) => (
              <div
                key={log.id}
                className="p-3 bg-theme-primary rounded-xl border border-theme-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-theme-text uppercase">
                    Ação: {log.action} • {log.targetUserEmail}
                  </span>
                  <p className="text-theme-muted text-[11px] mt-0.5">{log.notes}</p>
                </div>
                <div className="text-right text-[10px] text-theme-muted font-mono">
                  <span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                  <span className="block text-theme-subtle">por {log.adminEmail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <CatalogAdminPanel />
      </main>

      <Footer />
    </div>
  );
}
