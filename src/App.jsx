/**
 * SyndicPulse — Root application
 *
 * Auth routing:
 *   - Not logged in    → LoginPage
 *   - super_admin      → Full dashboard + building switcher
 *   - syndic_manager   → Dashboard scoped to their building, no switcher
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
    LayoutDashboard, BarChart3, Users, MessageSquare,
    Settings, Bell, Mic, ChevronDown, ChevronLeft, ChevronRight,
    TrendingUp, ShieldCheck, Building2, Landmark, Leaf,
    Zap, ArrowUpRight, ArrowDownRight, CheckCircle2,
    Clock, XCircle, Search, MoreHorizontal,
    CreditCard, Wrench, Phone, Mail, Activity, LogOut,
    Plus, X, Upload, FileText, Check, Download, MessageCircle, Calendar, Pencil, Trash2,
    CalendarCheck, Users2, ClipboardList, Vote,
    UserCog, Key, Eye, EyeOff, Copy,
    Home, TrendingDown,
    Truck, Star, Banknote, Paperclip,
    Megaphone, Info,
    BookOpen, HelpCircle, MapPin, Camera, Palette, RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'

import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AIVoiceAgent from './components/AIVoiceAgent.jsx'

import {
    BUILDINGS,
    RESIDENTS_BLD1, TICKETS_BLD1, EXPENSES_BLD1, DISPUTES_BLD1,
    RECENT_PAYMENTS_BLD1, COLLECTION_HISTORY_BLD1,
    RESIDENTS_BLD2, TICKETS_BLD2, EXPENSES_BLD2, DISPUTES_BLD2,
    RECENT_PAYMENTS_BLD2, COLLECTION_HISTORY_BLD2,
    RESIDENTS_BLD3, TICKETS_BLD3, EXPENSES_BLD3, DISPUTES_BLD3,
    RECENT_PAYMENTS_BLD3, COLLECTION_HISTORY_BLD3,
    MEETINGS_BLD1, MEETINGS_BLD2, MEETINGS_BLD3,
    SUPPLIERS_BLD1, SUPPLIERS_BLD2, SUPPLIERS_BLD3,
    DEMO_USERS,
    generateResidentCode,
} from './lib/mockData.js'

// Generate a random 4-digit PIN for resident portal access
function generatePortalPin(existingPins = []) {
    const used = new Set(existingPins)
    let pin
    do { pin = String(Math.floor(1000 + Math.random() * 9000)) } while (used.has(pin))
    return pin
}

/* ── Payment tracking helpers ─────────────────────────────────────────── */
// Current billing month — update this when connecting real backend
const CURRENT_MONTH = '2026-02'

// Derive paid/pending/overdue from paidThrough date
function computeStatus(paidThrough) {
    if (!paidThrough) return 'overdue'
    const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
    const [py, pm] = paidThrough.split('-').map(Number)
    const behind = (cy - py) * 12 + (cm - pm)
    if (behind <= 0) return 'paid'
    if (behind === 1) return 'pending'
    return 'overdue'
}

function getUnpaidMonthsCount(paidThrough) {
    if (!paidThrough) return 0
    const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
    const [py, pm] = paidThrough.split('-').map(Number)
    return Math.max(0, (cy - py) * 12 + (cm - pm))
}

// Advance a YYYY-MM date by N months
function advancePaidThrough(paidThrough, months) {
    const [y, m] = (paidThrough || CURRENT_MONTH).split('-').map(Number)
    const total = y * 12 + (m - 1) + months
    const ny = Math.floor(total / 12)
    const nm = (total % 12) + 1
    return `${ny}-${String(nm).padStart(2, '0')}`
}

// Format YYYY-MM → "Fév. 2026"
const MONTH_LABELS = ['Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai', 'Jun.', 'Jul.', 'Aoû.', 'Sep.', 'Oct.', 'Nov.', 'Déc.']
function formatMonth(ym) {
    if (!ym) return '—'
    const [y, m] = ym.split('-').map(Number)
    return `${MONTH_LABELS[m - 1]} ${y}`
}

/* ── WhatsApp helper — opens wa.me link with pre-filled message ── */
function openWhatsApp(phone, name, unit, building, status, paidThrough, monthlyFee) {
    const num = phone.replace(/[^0-9]/g, '')
    const buildingName = building?.name ?? building ?? ''
    const bankName    = building?.payment_bank           || '[NOM BANQUE]'
    const rib         = building?.payment_rib            || '[XXXX XXXX XXXX XXXX XXXX XX]'
    const holder      = building?.payment_account_holder || buildingName
    let msg
    if (status === 'overdue') {
        // Compute list of unpaid months from (paidThrough + 1) up to CURRENT_MONTH
        const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
        const unpaidMonths = []
        let [y, m] = (paidThrough || '2000-01').split('-').map(Number)
        m++; if (m > 12) { m = 1; y++ }           // start one month after last paid
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        while (y < cy || (y === cy && m <= cm)) {
            unpaidMonths.push(`${MONTH_NAMES_FR[m - 1]} ${y}`)
            m++; if (m > 12) { m = 1; y++ }
        }
        const count = unpaidMonths.length
        const plural = count > 1 ? 's' : ''
        const lastPaidLabel = (() => {
            const [py, pm] = (paidThrough || '2000-01').split('-').map(Number)
            return `${MONTH_NAMES_FR[pm - 1]} ${py}`
        })()
        const fee = monthlyFee ?? 250
        const totalDue = fee * count
        msg =
            `Bonjour ${name},

Nous vous rappelons que votre cotisation de syndic pour l'appartement ${unit} présente ${count} mois${plural} d'impayé${plural}.

📅 Dernière cotisation enregistrée : ${lastPaidLabel}
❌ Mois${plural} en retard (${count}) : ${unpaidMonths.join(', ')}

💰 Montant dû : *${totalDue.toLocaleString('fr-FR')} MAD* (${count} × ${fee.toLocaleString('fr-FR')} MAD/mois)

Merci de régulariser votre situation dans les meilleurs délais par virement bancaire :

🏦 Banque : ${bankName}
📋 RIB : ${rib}
👤 Titulaire : ${holder}

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
— ${buildingName}`
    } else {
        msg =
            `Bonjour ${name},

Cordialement,
— ${buildingName}`
    }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
}

/* ── Portal PIN lookup (index-derived fallback for mock data residents) ── */
function getResidentPortalPin(r, buildingId) {
    if (r.portalPin) return r.portalPin
    const src = { 'bld-1': RESIDENTS_BLD1, 'bld-2': RESIDENTS_BLD2, 'bld-3': RESIDENTS_BLD3 }[buildingId] ?? []
    const idx = src.findIndex(or => or.id === r.id)
    return idx >= 0 ? String(1000 + idx) : null
}

/* ── Default portal WA template (with {variable} placeholders) ── */
const DEFAULT_PORTAL_WA_TEMPLATE =
`Bonjour {prénom} 👋

Bienvenue dans votre espace résident SyndicPulse — *{résidence}* !

Vous pouvez désormais suivre en toute transparence vos paiements de charges, consulter les avis de la résidence et accéder aux convocations d'assemblée générale.

🔑 *Vos identifiants personnels d'accès :*
🏠 Code résidence : *{code}*
🔐 Votre PIN personnel : *{pin}*

*Pour vous connecter :*
1. Ouvrez https://syndicpulse.vercel.app
2. Cliquez sur « Espace Résident »
3. Saisissez votre code résidence puis votre PIN

⚠️ Ces identifiants sont *strictement personnels*. Veuillez les noter en lieu sûr et ne jamais les partager avec des tiers.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
— Le syndic de {résidence}`

/* ── WhatsApp — send portal credentials to a resident ── */
function openPortalWhatsApp(r, building) {
    const num = r.phone.replace(/[^0-9]/g, '')
    if (!num) return
    const firstName = r.name.split(' ')[0]
    const pin = getResidentPortalPin(r, building.id)
    const tpl = building.wa_portal_template || DEFAULT_PORTAL_WA_TEMPLATE
    const msg = tpl
        .replace(/\{prénom\}/g, firstName)
        .replace(/\{résidence\}/g, building.name)
        .replace(/\{code\}/g, building.accessCode ?? '—')
        .replace(/\{pin\}/g, pin ?? '—')
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
}

/* ── Nav items ── */
const NAV = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'financials', label: 'Finances', icon: BarChart3 },
    { id: 'residents', label: 'Résidents', icon: Users },
    { id: 'disputes', label: 'Litiges', icon: MessageSquare },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'assemblees', label: 'Assemblées', icon: CalendarCheck },
    { id: 'fournisseurs', label: 'Fournisseurs', icon: Truck },
    { id: 'circulaires', label: 'Circulaires', icon: Megaphone },
    { id: 'users', label: 'Utilisateurs', icon: UserCog, adminOnly: true },
]

/* ── Circulaire templates ── */
const CIRCULAIRE_TEMPLATES = [
    {
        key: 'coupure_eau', label: "Coupure d'eau", icon: '💧', color: '#06b6d4',
        fields: [
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'heure_debut', label: 'Heure début', type: 'time', required: true, default: '08:00' },
            { key: 'heure_fin', label: 'Heure fin', type: 'time', required: true, default: '14:00' },
            { key: 'tranches', label: 'Tranches / zones', type: 'text', placeholder: 'Ex: Tranches 2, 3 et 4' },
            { key: 'raison', label: 'Raison', type: 'text', required: true, placeholder: 'Ex: Réparation de la pompe principale' },
        ],
    },
    {
        key: 'coupure_elec', label: "Coupure d'électricité", icon: '⚡', color: '#f59e0b',
        fields: [
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'heure_debut', label: 'Heure début', type: 'time', required: true, default: '09:00' },
            { key: 'heure_fin', label: 'Heure fin', type: 'time', required: true, default: '13:00' },
            { key: 'zones', label: 'Zones concernées', type: 'text', placeholder: 'Ex: Bâtiment A et B' },
            { key: 'raison', label: 'Raison', type: 'text', required: true, placeholder: 'Ex: Travaux ONEE' },
        ],
    },
    {
        key: 'travaux', label: 'Travaux / Maintenance', icon: '🔧', color: '#8b5cf6',
        fields: [
            { key: 'date', label: 'Date de début', type: 'date', required: true },
            { key: 'zone', label: 'Équipement / zone', type: 'text', required: true, placeholder: 'Ex: Ascenseur – Hall principal' },
            { key: 'duree', label: 'Durée estimée', type: 'text', placeholder: 'Ex: 2 à 3 jours' },
            { key: 'raison', label: 'Nature des travaux', type: 'text', required: true, placeholder: 'Ex: Remplacement câblage ascenseur' },
        ],
    },
    {
        key: 'rappel_ag', label: 'Rappel Assemblée', icon: '🏛️', color: '#10b981',
        fields: [
            { key: 'date', label: "Date de l'AG", type: 'date', required: true },
            { key: 'heure', label: 'Heure', type: 'time', required: true, default: '18:00' },
            { key: 'lieu', label: 'Lieu', type: 'text', required: true, placeholder: 'Ex: Salle commune – RDC' },
            { key: 'odj', label: "Ordre du jour", type: 'textarea', placeholder: 'Ex: Approbation comptes, budget 2026, travaux...' },
        ],
    },
    {
        key: 'proprete', label: 'Propreté & Règlement', icon: '🧹', color: '#ec4899',
        fields: [
            { key: 'sujet', label: 'Sujet', type: 'text', required: true, placeholder: 'Ex: Dépôt sauvage dans le hall' },
            { key: 'rappel', label: 'Rappel réglementaire', type: 'textarea', placeholder: 'Rappeler les règles applicables...' },
            { key: 'sanction', label: 'Sanction prévue', type: 'text', placeholder: 'Ex: Mise en demeure' },
        ],
    },
    {
        key: 'objet_trouve', label: 'Objet trouvé', icon: '🔍', color: '#f97316',
        fields: [
            { key: 'objet', label: "Description de l'objet", type: 'text', required: true, placeholder: 'Ex: Clés de voiture, sac à main noir' },
            { key: 'lieu', label: 'Lieu de découverte', type: 'text', required: true, placeholder: 'Ex: Hall principal – RDC' },
            { key: 'date', label: 'Date de découverte', type: 'date', required: true },
            { key: 'contact', label: 'Contact pour récupérer', type: 'text', placeholder: 'Ex: Garderie – bâtiment A, bureau du syndic' },
        ],
    },
    {
        key: 'avis_libre', label: 'Avis personnalisé', icon: '📝', color: '#6366f1',
        fields: [
            { key: 'titre', label: "Titre", type: 'text', required: true, placeholder: 'Ex: Information importante' },
            { key: 'contenu', label: 'Contenu', type: 'textarea', required: true, placeholder: 'Rédigez votre message ici...' },
        ],
    },
]

function buildCirculaireMessage(templateKey, vars, buildingName) {
    const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    const fmtDate = (d) => {
        if (!d) return '—'
        const [y, m, day] = d.split('-')
        return `${parseInt(day)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
    }
    const closing = `\n\nNous nous excusons pour ce désagrément et vous remercions pour votre compréhension.\n\nCordialement,\nLe Bureau du Syndic — ${buildingName}`
    switch (templateKey) {
        case 'coupure_eau':
            return `Avis important — Coupure d'eau\n\nLe bureau du syndic de ${buildingName} informe les résidents${vars.tranches ? ` (${vars.tranches})` : ''} d'une coupure temporaire d'eau le ${fmtDate(vars.date)}, de ${vars.heure_debut ?? '—'} à ${vars.heure_fin ?? '—'}.\n\nRaison : ${vars.raison || '—'}\n\nMerci de prendre les précautions nécessaires.${closing}`
        case 'coupure_elec':
            return `Avis important — Coupure d'électricité\n\nLe bureau du syndic de ${buildingName} informe les résidents${vars.zones ? ` (${vars.zones})` : ''} d'une coupure temporaire d'électricité le ${fmtDate(vars.date)}, de ${vars.heure_debut ?? '—'} à ${vars.heure_fin ?? '—'}.\n\nRaison : ${vars.raison || '—'}\n\nMerci de prendre les précautions nécessaires.${closing}`
        case 'travaux':
            return `Avis — Travaux / Maintenance\n\nLe bureau du syndic de ${buildingName} vous informe de travaux le ${fmtDate(vars.date)}.\n\nÉquipement / zone : ${vars.zone || '—'}\nDurée estimée : ${vars.duree || 'à confirmer'}\nNature des travaux : ${vars.raison || '—'}${closing}`
        case 'rappel_ag':
            return `Rappel — Assemblée Générale\n\nLe bureau du syndic de ${buildingName} vous rappelle que l'Assemblée Générale se tiendra le ${fmtDate(vars.date)} à ${vars.heure ?? '—'}.\n\nLieu : ${vars.lieu || '—'}${vars.odj ? `\n\nOrdre du jour :\n${vars.odj}` : ''}\n\nVotre présence est importante.${closing}`
        case 'proprete':
            return `Avis — Propreté & Règlement intérieur\n\nLe bureau du syndic de ${buildingName} attire votre attention sur : ${vars.sujet || '—'}.${vars.rappel ? `\n\nRappel : ${vars.rappel}` : ''}${vars.sanction ? `\n\nSanction prévue : ${vars.sanction}` : ''}\n\nNous comptons sur votre civisme et coopération.${closing}`
        case 'objet_trouve':
            return `Avis — Objet trouvé\n\nLe bureau du syndic de ${buildingName} informe les résidents qu'un objet a été trouvé :\n\n📦 Objet : ${vars.objet || '—'}\n📍 Lieu : ${vars.lieu || '—'}\n📅 Date : ${fmtDate(vars.date)}\n\n${vars.contact ? `Pour récupérer votre bien, contactez : ${vars.contact}` : 'Contactez le bureau du syndic ou la garderie pour récupérer votre bien.'}\n\nCordialement,\nLe Bureau du Syndic — ${buildingName}`
        case 'avis_libre':
        default:
            return `${vars.titre ? `${vars.titre}\n\n` : ''}${vars.contenu || ''}\n\nCordialement,\nLe Bureau du Syndic — ${buildingName}`
    }
}

function buildCustomMessage(tpl, vars, buildingName) {
    let msg = tpl.messageTemplate || ''
    const allVars = { ...vars, building: buildingName }
    return msg.replace(/\{\{(\w+)\}\}/g, (_, k) => allVars[k] ?? `[${k}]`)
}

function generateCirculaireDoc(building, circ, msgOverride) {
    const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    const fmtDate = (d) => {
        if (!d) return new Date().toLocaleDateString('fr-FR')
        const [y, m, day] = d.split('-')
        return `${parseInt(day)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
    }
    const msg = msgOverride ?? buildCirculaireMessage(circ.template, circ.vars, building.name)
    const logoHtml = buildingLogoHTML(building, 48)
    const arabicTitles = {
        coupure_eau: 'إعلان هام — انقطاع الماء',
        coupure_elec: 'إعلان هام — انقطاع الكهرباء',
        travaux: 'إعلان — أشغال الصيانة',
        rappel_ag: 'تذكير — اجتماع الجمع العام',
        proprete: 'إعلان — النظافة والنظام الداخلي',
        avis_libre: 'إعلان هام',
    }
    const frTitles = {
        coupure_eau: "Avis Important — Coupure d'eau",
        coupure_elec: "Avis Important — Coupure d'électricité",
        travaux: "Avis — Travaux / Maintenance",
        rappel_ag: "Rappel — Assemblée Générale",
        proprete: "Avis — Propreté & Règlement intérieur",
        avis_libre: circ.vars.titre ?? "Avis Important",
    }
    const arTitle = arabicTitles[circ.template] ?? 'إعلان هام'
    const frTitle = frTitles[circ.template] ?? 'Avis Important'
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${frTitle} — ${building.name}</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Times New Roman',serif;background:#fff;color:#1a1a1a;padding:40px 60px;max-width:760px;margin:0 auto}
.header{display:flex;align-items:center;gap:20px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a1a1a}
.bname{font-size:18px;font-weight:bold}.bsub{font-size:13px;color:#555}
.date-right{margin-left:auto;text-align:right;font-size:13px;color:#555}
.title-ar{font-size:20px;font-weight:bold;text-align:center;direction:rtl;margin-bottom:8px;text-decoration:underline;font-family:'Arial',sans-serif}
.title-fr{font-size:18px;font-weight:bold;text-align:center;margin-bottom:28px;text-decoration:underline}
.body{font-size:14px;line-height:2;white-space:pre-wrap;margin-bottom:32px}
.sig{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end}
.stamp{width:90px;height:90px;border:2px solid #aaa;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;color:#aaa;padding:10px}
@media print{body{padding:20px 40px}}
</style></head><body>
<div class="header">${logoHtml}<div><div class="bname">${building.name}</div><div class="bsub">${building.city ?? ''} · Bureau du Syndic</div></div><div class="date-right">${fmtDate(circ.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))}</div></div>
<div class="title-ar">${arTitle}</div>
<div class="title-fr">${frTitle}</div>
<div class="body">${msg.replace(/\n/g, '<br/>')}</div>
<div class="sig"><div><div style="font-size:13px;font-weight:bold">Le Bureau du Syndic</div><div style="font-size:12px;color:#555;margin-top:2px">${building.name}</div><div style="margin-top:24px;border-top:1px solid #555;width:160px;padding-top:6px;font-size:11px;color:#888">Signature</div></div>${cachetHTML(building, 88)}</div>
<script>window.onload=()=>{window.print();}<\/script></body></html>`)
    w.document.close()
}

function generateCustomTemplateGuide() {
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Guide — Modèles personnalisés · SyndicPulse</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#1e293b;padding:0}
.cover{background:linear-gradient(135deg,#0a0f1e 0%,#0d1629 60%,#111d35 100%);color:#fff;padding:52px 60px 44px;position:relative;overflow:hidden}
.cover::before{content:'';position:absolute;top:-60px;right:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(6,182,212,.18) 0%,transparent 70%)}
.cover-logo{display:flex;align-items:center;gap:12px;margin-bottom:36px}
.cover-logo-dot{width:10px;height:10px;background:#06b6d4;border-radius:50%}
.cover-brand{font-size:13px;font-weight:700;letter-spacing:.12em;color:#06b6d4;text-transform:uppercase}
.cover h1{font-size:34px;font-weight:800;line-height:1.15;margin-bottom:10px}
.cover h1 span{color:#06b6d4}
.cover p{font-size:15px;color:rgba(255,255,255,.65);max-width:480px;line-height:1.65}
.cover-badge{display:inline-block;margin-top:22px;padding:6px 14px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.35);border-radius:20px;font-size:11px;font-weight:600;color:#67e8f9;letter-spacing:.04em}
.page{max-width:780px;margin:0 auto;padding:44px 60px 60px}
h2{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:6px;margin-top:40px;display:flex;align-items:center;gap:10px}
h2 .num{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#0e7490;color:#fff;font-size:13px;font-weight:800;flex-shrink:0}
h3{font-size:14px;font-weight:700;color:#334155;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.06em}
p,li{font-size:13.5px;line-height:1.75;color:#475569}
ul{padding-left:20px;margin:6px 0 14px}
li{margin-bottom:4px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px 24px;margin:14px 0;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.card-cyan{border-left:4px solid #06b6d4}
.card-violet{border-left:4px solid #8b5cf6}
.card-green{border-left:4px solid #10b981}
.card-amber{border-left:4px solid #f59e0b}
.step-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
.step-box{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.step-box .step-num{font-size:11px;font-weight:700;color:#06b6d4;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.step-box .step-title{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:4px}
.step-box p{font-size:12.5px;color:#64748b}
.code{font-family:'Courier New',monospace;background:#f1f5f9;color:#7c3aed;padding:2px 7px;border-radius:5px;font-size:12.5px;border:1px solid #e2e8f0}
.code-block{background:#0f172a;color:#e2e8f0;border-radius:12px;padding:18px 22px;margin:12px 0;font-family:'Courier New',monospace;font-size:12px;line-height:1.9;overflow-x:auto}
.code-block .k{color:#67e8f9}.code-block .v{color:#a5f3c9}.code-block .c{color:#64748b}
.tag{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
.tag-cyan{background:#e0f9ff;color:#0e7490}
.tag-violet{background:#f5f3ff;color:#6d28d9}
.tag-green{background:#ecfdf5;color:#047857}
.tag-amber{background:#fffbeb;color:#92400e}
.tag-red{background:#fef2f2;color:#b91c1c}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
th{background:#f8fafc;font-weight:700;color:#475569;padding:10px 14px;border:1px solid #e2e8f0;text-align:left}
td{padding:9px 14px;border:1px solid #e2e8f0;color:#334155;vertical-align:top}
tr:hover td{background:#f8fafc}
.tip{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:10px 0;font-size:13px;color:#78350f;display:flex;gap:10px;align-items:flex-start}
.tip-icon{font-size:16px;flex-shrink:0;margin-top:1px}
.example-form{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:14px 0;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.example-form .form-header{background:linear-gradient(90deg,#0e7490,#0891b2);color:#fff;padding:12px 18px;font-size:13px;font-weight:700}
.example-form .form-body{padding:16px 18px;display:grid;gap:10px}
.form-field{display:grid;gap:4px}
.form-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.form-input{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#334155}
.result-box{background:#0f172a;border-radius:12px;padding:20px 22px;margin:12px 0;font-family:'Courier New',monospace;font-size:12px;line-height:1.85;color:#94a3b8;white-space:pre-wrap}
.result-box .highlight{color:#a5f3c9}
.divider{height:1px;background:#e2e8f0;margin:32px 0}
.footer{background:#0f172a;color:rgba(255,255,255,.45);text-align:center;padding:18px;font-size:11.5px;margin-top:48px}
.footer span{color:#06b6d4;font-weight:600}
@media print{
  body{background:#fff}
  .cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .code-block,.result-box,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  h2{page-break-before:auto}
  .step-grid{page-break-inside:avoid}
}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-logo">
    <div class="cover-logo-dot"></div>
    <span class="cover-brand">SyndicPulse</span>
  </div>
  <h1>Guide des modèles<br/><span>personnalisés</span></h1>
  <p>Créez vos propres templates de circulaires avec des champs variables. Réutilisables, adaptés à chaque résidence, prêts en 5 minutes.</p>
  <div class="cover-badge">📋 Guide d'utilisation — Circulaires</div>
</div>

<div class="page">

  <!-- INTRO -->
  <div class="card card-cyan" style="margin-top:28px">
    <strong style="font-size:14px;color:#0e7490">À quoi servent les modèles personnalisés ?</strong>
    <p style="margin-top:6px">Les modèles personnalisés vous permettent de créer des <strong>templates réutilisables</strong> pour les avis récurrents propres à votre résidence : réunions de quartier, rappels charges, avis de sécurité… En définissant des <strong>champs variables</strong>, il suffit de remplir un formulaire pour générer automatiquement le message complet.</p>
  </div>

  <!-- STEP BY STEP -->
  <h2><span class="num">1</span>Créer un nouveau modèle</h2>
  <p>Depuis la page <strong>Circulaires &amp; Avis</strong>, cliquez sur le bouton <strong>"Modèles"</strong> en haut à droite, puis <strong>"Nouveau modèle"</strong>.</p>

  <div class="step-grid">
    <div class="step-box">
      <div class="step-num">Champ 1</div>
      <div class="step-title">Nom du modèle</div>
      <p>Donnez un nom explicite, ex : <em>Réunion de copropriété</em></p>
    </div>
    <div class="step-box">
      <div class="step-num">Champ 2</div>
      <div class="step-title">Icône &amp; couleur</div>
      <p>Choisissez parmi les icônes et couleurs proposées pour identifier visuellement le modèle.</p>
    </div>
  </div>

  <h2><span class="num">2</span>Définir les champs variables</h2>
  <p>Chaque champ devient une <strong>variable</strong> que vous remplirez à chaque utilisation du modèle. La clé générée automatiquement (ex : <span class="code">{{date}}</span>) s'insère ensuite dans le corps du message.</p>

  <table>
    <tr><th>Type de champ</th><th>Usage recommandé</th><th>Exemple de clé</th></tr>
    <tr><td><span class="tag tag-cyan">Texte court</span></td><td>Lieu, nom, zone, montant</td><td><span class="code">{{lieu}}</span></td></tr>
    <tr><td><span class="tag tag-violet">Texte long</span></td><td>Ordre du jour, consignes, motif</td><td><span class="code">{{ordre_du_jour}}</span></td></tr>
    <tr><td><span class="tag tag-green">Date</span></td><td>Date de l'événement</td><td><span class="code">{{date}}</span></td></tr>
    <tr><td><span class="tag tag-amber">Heure</span></td><td>Heure de début / fin</td><td><span class="code">{{heure}}</span></td></tr>
    <tr><td><span class="tag tag-red">Nombre</span></td><td>Montant, durée en jours</td><td><span class="code">{{montant}}</span></td></tr>
  </table>

  <div class="tip"><span class="tip-icon">💡</span><span>Cochez <strong>"Requis"</strong> pour les champs indispensables — un message d'erreur empêchera la sauvegarde si le champ est vide.</span></div>

  <h2><span class="num">3</span>Rédiger le corps du message</h2>
  <p>Utilisez la syntaxe <span class="code">{'{{clé}}'}</span> pour insérer les variables dans votre message. La variable <span class="code">{'{{building}}'}</span> est toujours disponible et insère automatiquement le nom de la résidence.</p>

  <div class="code-block"><span class="c">// Corps du message avec variables</span>
<span class="v">Chers résidents de </span><span class="k">{{building}}</span><span class="v">,</span>

<span class="v">Nous vous convoquons à une réunion de copropriété</span>
<span class="v">le </span><span class="k">{{date}}</span><span class="v"> à </span><span class="k">{{heure}}</span><span class="v">.</span>

<span class="v">Ordre du jour :</span>
<span class="k">{{ordre_du_jour}}</span>

<span class="v">Votre présence est souhaitée.</span>

<span class="v">Cordialement,</span>
<span class="v">Le Bureau du Syndic</span></div>

  <div class="tip"><span class="tip-icon">⚠️</span><span>La clé dans <span class="code">{'{{clé}}'}</span> doit correspondre <strong>exactement</strong> à la clé affichée sous chaque champ (en violet). Si la clé ne correspond pas, le texte <code>[clé]</code> apparaîtra à la place.</span></div>

  <div class="divider"></div>

  <!-- FULL EXAMPLE -->
  <h2><span class="num">4</span>Exemple complet — Réunion de copropriété</h2>

  <h3>Configuration du modèle</h3>
  <div class="card card-violet">
    <table style="margin:0">
      <tr><th>Paramètre</th><th>Valeur saisie</th></tr>
      <tr><td>Nom du modèle</td><td><strong>Réunion de copropriété</strong></td></tr>
      <tr><td>Icône</td><td>🏛️</td></tr>
      <tr><td>Couleur</td><td>Bleu cyan</td></tr>
    </table>
  </div>

  <h3>Champs définis</h3>
  <table>
    <tr><th>Libellé</th><th>Type</th><th>Requis</th><th>Clé générée</th></tr>
    <tr><td>Date</td><td><span class="tag tag-green">Date</span></td><td>✅</td><td><span class="code">{{date}}</span></td></tr>
    <tr><td>Heure</td><td><span class="tag tag-amber">Heure</span></td><td>✅</td><td><span class="code">{{heure}}</span></td></tr>
    <tr><td>Ordre du jour</td><td><span class="tag tag-violet">Texte long</span></td><td>✅</td><td><span class="code">{{ordre_du_jour}}</span></td></tr>
  </table>

  <h3>Formulaire généré (à remplir à chaque utilisation)</h3>
  <div class="example-form">
    <div class="form-header">🏛️ Réunion de copropriété — Remplir le formulaire</div>
    <div class="form-body">
      <div class="form-field">
        <div class="form-label">Date *</div>
        <div class="form-input">15/03/2026</div>
      </div>
      <div class="form-field">
        <div class="form-label">Heure *</div>
        <div class="form-input">18:00</div>
      </div>
      <div class="form-field">
        <div class="form-label">Ordre du jour *</div>
        <div class="form-input">Approbation budget 2026 · Travaux façade · Divers</div>
      </div>
    </div>
  </div>

  <h3>Message généré automatiquement</h3>
  <div class="result-box"><span class="highlight">Chers résidents de Norwest,</span>

Nous vous convoquons à une réunion de copropriété
le <span class="highlight">15 Mars 2026</span> à <span class="highlight">18:00</span>.

Ordre du jour :
<span class="highlight">Approbation budget 2026 · Travaux façade · Divers</span>

Votre présence est souhaitée.

Cordialement,
Le Bureau du Syndic</div>

  <div class="tip"><span class="tip-icon">📱</span><span>Une fois le message généré, cliquez <strong>"Copier message WA"</strong> pour l'envoyer via WhatsApp Broadcast, ou <strong>"Imprimer / PDF"</strong> pour un affichage papier en salle commune.</span></div>

  <div class="divider"></div>

  <!-- MORE EXAMPLES -->
  <h2><span class="num">5</span>Autres idées de modèles</h2>

  <table>
    <tr><th>Modèle</th><th>Champs suggérés</th></tr>
    <tr>
      <td>🔑 Changement de gardien</td>
      <td><span class="code">{{nom_nouveau}}</span> · <span class="code">{{date_prise_poste}}</span> · <span class="code">{{contact}}</span></td>
    </tr>
    <tr>
      <td>💰 Appel de charges exceptionnel</td>
      <td><span class="code">{{motif}}</span> · <span class="code">{{montant}}</span> · <span class="code">{{date_limite}}</span></td>
    </tr>
    <tr>
      <td>🚗 Règlement parking</td>
      <td><span class="code">{{infraction}}</span> · <span class="code">{{consequence}}</span></td>
    </tr>
    <tr>
      <td>🎉 Félicitations / Fête</td>
      <td><span class="code">{{occasion}}</span> · <span class="code">{{date}}</span> · <span class="code">{{lieu}}</span></td>
    </tr>
    <tr>
      <td>🏊 Fermeture piscine / équipement</td>
      <td><span class="code">{{equipement}}</span> · <span class="code">{{date_debut}}</span> · <span class="code">{{date_fin}}</span> · <span class="code">{{raison}}</span></td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- TIPS -->
  <h2><span class="num">6</span>Bonnes pratiques</h2>

  <div class="card card-green">
    <ul style="margin:0;padding-left:18px">
      <li>Nommez les clés en <strong>minuscules sans accents</strong> — ex : <span class="code">ordre_du_jour</span> plutôt que <em>Ordre du Jour</em></li>
      <li>Utilisez <span class="code">_</span> (underscore) pour séparer les mots dans les clés</li>
      <li>Le champ <strong>texte long</strong> est idéal pour les contenus multi-lignes (listes, consignes)</li>
      <li>Rédigez un <strong>texte indicatif</strong> (placeholder) clair pour guider la saisie</li>
      <li>Vérifiez l'aperçu avant de sauvegarder pour contrôler le rendu final</li>
      <li>Les modèles sont <strong>liés à la résidence active</strong> — chaque bâtiment a ses propres modèles</li>
    </ul>
  </div>

</div>

<div class="footer">
  <span>SyndicPulse</span> · Guide des modèles personnalisés · Circulaires &amp; Avis<br/>
  Généré automatiquement · usage interne
</div>

<script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`)
    w.document.close()
}

/* ── Expense category options with theme colors ── */
const EXPENSE_CATEGORIES = [
    { label: 'Entretien & réparations', color: 'bg-cyan-500' },
    { label: 'Gardiennage', color: 'bg-violet-500' },
    { label: 'Nettoyage', color: 'bg-emerald-500' },
    { label: 'Eau & Électricité', color: 'bg-amber-500' },
    { label: 'Administration', color: 'bg-slate-500' },
    { label: 'Ascenseur', color: 'bg-pink-500' },
    { label: 'Espaces verts', color: 'bg-lime-500' },
    { label: 'Autre', color: 'bg-navy-500' },
]

/* ── Initial expense journal (individual transactions) ── */
const INITIAL_EXPENSE_LOG = [
    { id: 'el1', date: '2026-02-18', category: 'Entretien & réparations', vendor: 'Otis Morocco', amount: 8400, description: 'Révision complète ascenseur Bloc B', hasInvoice: true },
    { id: 'el2', date: '2026-02-15', category: 'Nettoyage', vendor: 'ProNet SARL', amount: 3200, description: 'Nettoyage parties communes — quinzaine', hasInvoice: true },
    { id: 'el3', date: '2026-02-10', category: 'Eau & Électricité', vendor: 'Redal', amount: 1850, description: 'Facture eau communes — Janvier 2026', hasInvoice: true },
    { id: 'el4', date: '2026-02-08', category: 'Entretien & réparations', vendor: 'IBS Plomberie', amount: 3600, description: 'Réparation fuite parking sous-sol', hasInvoice: false },
]

/* ── CSV sample data shown in the import wizard preview ── */
const CSV_SAMPLE = [
    { nom: 'Rachid Benkirane', telephone: '+212 661 234 567', unite: 'C-03', etage: '2', type: 'Propriétaire' },
    { nom: 'Fatima Zahra Alami', telephone: '+212 672 345 678', unite: 'C-04', etage: '2', type: 'Locataire' },
    { nom: 'Youssef El Mansouri', telephone: '+212 655 456 789', unite: 'D-01', etage: '3', type: 'Propriétaire' },
]

/* ══════════════════════════════════════════
   ROOT
══════════════════════════════════════════ */
export default function App() {
    const { user, loading } = useAuth()

    // ── Resident portal session (separate from syndic auth) ──────────────────
    const [residentSession, setResidentSession] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('sp_resident_session')) } catch { return null }
    })

    function handleResidentLogin(session) {
        sessionStorage.setItem('sp_resident_session', JSON.stringify(session))
        setResidentSession(session)
    }
    function handleResidentLogout() {
        sessionStorage.removeItem('sp_resident_session')
        setResidentSession(null)
    }

    if (residentSession) return <ResidentPortal session={residentSession} onLogout={handleResidentLogout} />
    if (loading) return <LoadingScreen />
    if (!user) return <LoginPage onResidentLogin={handleResidentLogin} />
    return <Dashboard />
}

/* ── Loading screen ── */
function LoadingScreen() {
    return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center">
                    <Zap size={20} className="text-sp animate-pulse" />
                </div>
                <p className="text-sm text-slate-400">Chargement de SyndicPulse...</p>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════
   AUTHENTICATED DASHBOARD
══════════════════════════════════════════ */
function Dashboard() {
    const { activeBuilding, setActiveBuilding, accessibleBuildings, canSwitchBuildings } = useAuth()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [isVoiceOpen, setIsVoiceOpen] = useState(false)
    const [showBuildingMenu, setShowBuildingMenu] = useState(false)
    const [toast, setToast] = useState(null) // { message, type }
    const [residentsByBldg, setResidentsByBldg] = useState({})  // shared across tabs
    const [disputesByBldg, setDisputesByBldg] = useState({})  // shared across tabs
    const [meetingsByBldg, setMeetingsByBldg] = useState({})  // shared across tabs
    const [buildingSettingsByBldg, setBuildingSettingsByBldg] = useState({})  // logo + name overrides per building
    const [extraBuildings, setExtraBuildings] = useState([])  // user-added buildings
    const [showBldgSettings, setShowBldgSettings] = useState(false)
    const [showAddBuilding, setShowAddBuilding] = useState(false)
    const [themeMode, setThemeMode] = useState(() => localStorage.getItem('sp_theme') ?? 'navy')
    useEffect(() => { localStorage.setItem('sp_theme', themeMode) }, [themeMode])

    const buildingData = getBuildingData(activeBuilding?.id)

    // Shared residents state — persists when switching tabs, keyed by building ID
    const residents = residentsByBldg[activeBuilding?.id] ?? buildingData.residents
    function setResidents(fn) {
        const bldgId = activeBuilding.id
        setResidentsByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).residents)
                : fn,
        }))
    }

    // Shared disputes state
    const disputes = disputesByBldg[activeBuilding?.id] ?? (() => {
        try {
            const stored = JSON.parse(localStorage.getItem(`sp_disputes_${activeBuilding?.id}`) ?? 'null')
            if (Array.isArray(stored)) return stored
        } catch { }
        return buildingData.disputes
    })()
    function setDisputes(fn) {
        const bldgId = activeBuilding.id
        setDisputesByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).disputes)
                : fn,
        }))
    }

    // Shared meetings state
    const meetings = meetingsByBldg[activeBuilding?.id] ?? buildingData.meetings
    function setMeetings(fn) {
        const bldgId = activeBuilding.id
        setMeetingsByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).meetings)
                : fn,
        }))
    }

    // Shared suppliers state
    const [suppliersByBldg, setSuppliersByBldg] = useState({})
    const suppliers = suppliersByBldg[activeBuilding?.id] ?? (() => {
        try {
            const stored = JSON.parse(localStorage.getItem(`sp_suppliers_${activeBuilding?.id}`) ?? 'null')
            if (Array.isArray(stored)) return stored
        } catch { }
        return buildingData.suppliers
    })()
    function setSuppliers(fn) {
        const bldgId = activeBuilding.id
        setSuppliersByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).suppliers)
                : fn,
        }))
    }

    // Circulaires — persisted in localStorage so ResidentPortal can read them too
    const CIRC_KEY = (id) => `sp_circ_${id}`
    const [circulairesByBldg, setCirculairesByBldg] = useState({})
    const circulaires = circulairesByBldg[activeBuilding?.id] ?? (() => {
        try { return JSON.parse(localStorage.getItem(CIRC_KEY(activeBuilding?.id)) ?? '[]') } catch { return [] }
    })()
    function setCirculaires(fn) {
        const bldgId = activeBuilding.id
        setCirculairesByBldg(prev => {
            const cur = prev[bldgId] ?? (() => { try { return JSON.parse(localStorage.getItem(CIRC_KEY(bldgId)) ?? '[]') } catch { return [] } })()
            const next = typeof fn === 'function' ? fn(cur) : fn
            localStorage.setItem(CIRC_KEY(bldgId), JSON.stringify(next))
            return { ...prev, [bldgId]: next }
        })
    }

    // Custom circulaire templates — persisted in localStorage per building
    const CTPL_KEY = (id) => `sp_ctpls_${id}`
    const [customTplsByBldg, setCustomTplsByBldg] = useState({})
    const customTpls = customTplsByBldg[activeBuilding?.id] ?? (() => {
        try { return JSON.parse(localStorage.getItem(CTPL_KEY(activeBuilding?.id)) ?? '[]') } catch { return [] }
    })()
    function setCustomTpls(fn) {
        const bldgId = activeBuilding.id
        setCustomTplsByBldg(prev => {
            const cur = prev[bldgId] ?? (() => { try { return JSON.parse(localStorage.getItem(CTPL_KEY(bldgId)) ?? '[]') } catch { return [] } })()
            const next = typeof fn === 'function' ? fn(cur) : fn
            localStorage.setItem(CTPL_KEY(bldgId), JSON.stringify(next))
            return { ...prev, [bldgId]: next }
        })
    }

    // Merge user-customized settings (logo, name, manager) on top of base building data
    const activeBuildingMerged = activeBuilding
        ? { ...activeBuilding, ...(buildingSettingsByBldg[activeBuilding.id] ?? {}) }
        : null

    // All buildings: seed list + user-added
    const allBuildings = [...accessibleBuildings, ...extraBuildings].map(b => ({
        ...b, ...(buildingSettingsByBldg[b.id] ?? {}),
    }))

    if (!activeBuilding) return <LoadingScreen />

    function showToast(message, type = 'success', duration = 3500) {
        setToast({ message, type })
        setTimeout(() => setToast(null), duration)
    }

    return (
        <div data-theme={themeMode} className="flex h-screen bg-navy-900 text-slate-100 font-sans overflow-hidden">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeBuilding={activeBuildingMerged}
                buildings={allBuildings}
                canSwitchBuildings={canSwitchBuildings}
                showBuildingMenu={showBuildingMenu}
                setShowBuildingMenu={setShowBuildingMenu}
                onSwitchBuilding={(b) => {
                    setActiveBuilding(extraBuildings.find(e => e.id === b.id) ?? accessibleBuildings.find(a => a.id === b.id) ?? b)
                    setShowBuildingMenu(false)
                    setActiveTab('dashboard')
                }}
                setIsVoiceOpen={setIsVoiceOpen}
                buildingData={buildingData}
                disputes={disputes}
                onOpenSettings={() => setShowBldgSettings(true)}
                onAddBuilding={() => setShowAddBuilding(true)}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar activeTab={activeTab} activeBuilding={activeBuildingMerged} themeMode={themeMode} setThemeMode={setThemeMode} showToast={showToast} />
                <main className="flex-1 overflow-auto p-8">
                    {activeTab === 'dashboard' && <DashboardPage building={activeBuildingMerged} data={buildingData} residents={residents} setIsVoiceOpen={setIsVoiceOpen} setActiveTab={setActiveTab} showToast={showToast} />}
                    {activeTab === 'financials' && <FinancialsPage building={activeBuildingMerged} data={buildingData} residents={residents} setResidents={setResidents} suppliers={suppliers} showToast={showToast} />}
                    {activeTab === 'residents' && <ResidentsPage building={activeBuildingMerged} data={buildingData} residents={residents} setResidents={setResidents} showToast={showToast} />}
                    {activeTab === 'disputes' && <DisputesPage building={activeBuildingMerged} data={buildingData} disputes={disputes} setDisputes={setDisputes} showToast={showToast} />}
                    {activeTab === 'planning' && <PlanningPage building={activeBuildingMerged} data={buildingData} showToast={showToast} />}
                    {activeTab === 'assemblees' && <AssembliesPage building={activeBuildingMerged} residents={residents} meetings={meetings} setMeetings={setMeetings} showToast={showToast} />}
                    {activeTab === 'fournisseurs' && <FournisseursPage building={activeBuildingMerged} suppliers={suppliers} setSuppliers={setSuppliers} showToast={showToast} />}
                    {activeTab === 'circulaires' && <CirculairesPage building={activeBuildingMerged} circulaires={circulaires} setCirculaires={setCirculaires} customTpls={customTpls} setCustomTpls={setCustomTpls} showToast={showToast} />}
                    {activeTab === 'users' && <UsersPage showToast={showToast} />}
                </main>
            </div>

            <AIVoiceAgent isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />

            {showBldgSettings && activeBuildingMerged && (
                <BuildingSettingsModal
                    building={activeBuildingMerged}
                    onClose={() => setShowBldgSettings(false)}
                    onSave={(overrides) => {
                        setBuildingSettingsByBldg(prev => ({
                            ...prev,
                            [activeBuilding.id]: { ...(prev[activeBuilding.id] ?? {}), ...overrides },
                        }))
                        // Persist payment info + reserve fund to localStorage so ResidentPortal can read it
                        try {
                            const bankFields = {
                                payment_rib: overrides.payment_rib,
                                payment_bank: overrides.payment_bank,
                                payment_account_holder: overrides.payment_account_holder,
                                payment_whatsapp: overrides.payment_whatsapp,
                                reserve_fund_mad: overrides.reserve_fund_mad,
                            }
                            localStorage.setItem(`sp_bank_${activeBuilding.id}`, JSON.stringify(bankFields))
                        } catch { }
                        setShowBldgSettings(false)
                    }}
                />
            )}

            {showAddBuilding && (
                <AddBuildingModal
                    onClose={() => setShowAddBuilding(false)}
                    onSave={(newBld) => {
                        setExtraBuildings(prev => [...prev, newBld])
                        setActiveBuilding(newBld)
                        setShowAddBuilding(false)
                        setActiveTab('dashboard')
                    }}
                />
            )}

            {/* Global toast notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold whitespace-nowrap ${toast.type === 'error'
                                ? 'bg-red-950 border-red-500/30 text-red-300'
                                : 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
                            }`}
                    >
                        {toast.type === 'error' ? <X size={15} /> : <Check size={15} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* Return mock data keyed by building id.
   In production: replaced by Supabase queries per page component. */
function getBuildingData(buildingId) {
    if (buildingId === 'bld-1') return {
        residents: RESIDENTS_BLD1,
        tickets: TICKETS_BLD1,
        expenses: EXPENSES_BLD1,
        disputes: DISPUTES_BLD1,
        recentPayments: RECENT_PAYMENTS_BLD1,
        collectionHistory: COLLECTION_HISTORY_BLD1,
        meetings: MEETINGS_BLD1,
        suppliers: SUPPLIERS_BLD1,
    }
    if (buildingId === 'bld-2') return {
        residents: RESIDENTS_BLD2,
        tickets: TICKETS_BLD2,
        expenses: EXPENSES_BLD2,
        disputes: DISPUTES_BLD2,
        recentPayments: RECENT_PAYMENTS_BLD2,
        collectionHistory: COLLECTION_HISTORY_BLD2,
        meetings: MEETINGS_BLD2,
        suppliers: SUPPLIERS_BLD2,
    }
    if (buildingId === 'bld-3') return {
        residents: RESIDENTS_BLD3,
        tickets: TICKETS_BLD3,
        expenses: EXPENSES_BLD3,
        disputes: DISPUTES_BLD3,
        recentPayments: RECENT_PAYMENTS_BLD3,
        collectionHistory: COLLECTION_HISTORY_BLD3,
        meetings: MEETINGS_BLD3,
        suppliers: SUPPLIERS_BLD3,
    }
    return {
        residents: [], tickets: [], expenses: [], disputes: [],
        recentPayments: [], collectionHistory: [], meetings: [], suppliers: [],
    }
}

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
function Sidebar({ activeTab, setActiveTab, activeBuilding, buildings, canSwitchBuildings, showBuildingMenu, setShowBuildingMenu, onSwitchBuilding, setIsVoiceOpen, buildingData, disputes, onOpenSettings, onAddBuilding }) {
    const { logout, user, isSuperAdmin } = useAuth()
    const menuRef = useRef(null)

    useEffect(() => {
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target))
                setShowBuildingMenu(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [setShowBuildingMenu])

    const openDisputeCount = (disputes ?? buildingData?.disputes ?? []).filter(d => d.status === 'open').length

    return (
        <aside className="w-64 flex-shrink-0 bg-navy-800 border-r border-white/5 flex flex-col h-full">

            {/* Platform brand */}
            <div className="px-5 py-5 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sp flex items-center justify-center shadow-glow-cyan">
                        <Zap size={15} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-bold tracking-tight text-white">
                        Syndic<span className="text-sp">Pulse</span>
                    </span>
                    {isSuperAdmin && (
                        <span className="ml-auto text-[9px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                            ADMIN
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 ml-[37px] tracking-wider uppercase">
                    Plateforme de gestion
                </p>
            </div>

            {/* Building switcher (super_admin only) or static label (syndic_manager) */}
            <div className="px-3 py-3 border-b border-white/5" ref={menuRef}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-2">Propriété active</p>

                {canSwitchBuildings ? (
                    <>
                        <button
                            onClick={() => setShowBuildingMenu(v => !v)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-700 hover:bg-navy-600 border border-white/5 transition-all"
                        >
                            <BuildingAvatar building={activeBuilding} size="sm" />
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{activeBuilding.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{activeBuilding.city} · {activeBuilding.total_units} unités</p>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${showBuildingMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showBuildingMenu && (
                            <div className="mt-2 rounded-xl bg-navy-700 border border-white/8 overflow-hidden shadow-2xl">
                                {buildings.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => onSwitchBuilding(b)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-navy-600 transition-colors text-left ${b.id === activeBuilding.id ? 'bg-navy-600' : ''}`}
                                    >
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{b.name}</p>
                                            <p className="text-[11px] text-slate-400">{b.city} · {b.total_units} unités</p>
                                        </div>
                                        {b.id === activeBuilding.id && <CheckCircle2 size={13} className="text-sp flex-shrink-0" />}
                                    </button>
                                ))}
                                <div className="border-t border-white/5 px-3 py-2">
                                    <button onClick={() => { setShowBuildingMenu(false); onAddBuilding?.() }}
                                        className="text-[11px] text-sp hover:text-sp-light transition-colors flex items-center gap-1">
                                        <Building2 size={11} /> Ajouter une propriété
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-700 border border-white/5">
                        <BuildingAvatar building={activeBuilding} size="sm" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{activeBuilding.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{activeBuilding.city} · {activeBuilding.total_units} unités</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {NAV.filter(item => !item.adminOnly || isSuperAdmin).map(item => {
                    const Icon = item.icon
                    const active = activeTab === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                    ? 'nav-active text-sp'
                                    : 'text-slate-400 hover:text-white hover:bg-navy-700'
                                }`}
                        >
                            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                            {item.label}
                            {item.id === 'disputes' && openDisputeCount > 0 && (
                                <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                                    {openDisputeCount}
                                </span>
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 pb-3 space-y-1 border-t border-white/5 pt-3">
                <div className="rounded-xl bg-navy-700 border border-sp/10 p-4 mb-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                        <span className="text-[10px] font-semibold text-sp uppercase tracking-wider">Agent IA Vocal</span>
                        <span className="ml-auto text-[9px] font-bold bg-amber-500/10 text-amber-500/70 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Démo</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                        Darija + Français · {activeBuilding.name}
                    </p>
                    <button
                        onClick={() => setIsVoiceOpen(true)}
                        className="w-full py-2 bg-sp/10 hover:bg-sp/20 text-sp text-xs font-semibold rounded-lg border border-sp/20 transition-all flex items-center justify-center gap-1.5"
                    >
                        <Mic size={12} /> Ouvrir l'agent vocal
                    </button>
                </div>

                <button onClick={() => onOpenSettings?.()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-navy-700 transition-all">
                    <Settings size={18} strokeWidth={1.5} /> Paramètres
                </button>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                    <LogOut size={18} strokeWidth={1.5} /> Se déconnecter
                </button>

                <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? '')}&background=${user?.avatar_bg}&color=${user?.avatar_color}&bold=true&size=32`}
                        alt=""
                        className="w-7 h-7 rounded-lg"
                    />
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{user?.full_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}

/* ══════════════════════════════════════════
   USER GUIDE MODAL
══════════════════════════════════════════ */
const GUIDE_SECTIONS = [
    { id: 'parametres',   label: 'Paramètres',      icon: Settings,       available: true },
    { id: 'dashboard',    label: 'Tableau de bord',  icon: LayoutDashboard,available: true },
    { id: 'residents',    label: 'Résidents',         icon: Users,          available: true },
    { id: 'financials',   label: 'Finances',          icon: BarChart3,      available: true },
    { id: 'disputes',     label: 'Litiges',           icon: MessageSquare,  available: true },
    { id: 'fournisseurs', label: 'Fournisseurs',      icon: Truck,          available: true },
    { id: 'circulaires',  label: 'Circulaires',       icon: Megaphone,      available: true },
    { id: 'assemblees',   label: 'Assemblées',        icon: CalendarCheck,  available: true },
]

function GuideField({ label, description, tip, badge }) {
    return (
        <div className="flex gap-4 py-4 border-b border-white/5 last:border-0">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{label}</span>
                    {badge && <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">{badge}</span>}
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed">{description}</p>
                {tip && <p className="text-[11px] text-sp/70 mt-1.5 flex items-start gap-1.5"><HelpCircle size={10} className="mt-0.5 flex-shrink-0" />{tip}</p>}
            </div>
        </div>
    )
}

function UserGuideModal({ onClose }) {
    const [section, setSection] = useState('parametres')

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl flex overflow-hidden" style={{ height: '82vh' }}>

                {/* Left nav */}
                <div className="w-52 bg-navy-900/60 border-r border-white/8 flex flex-col flex-shrink-0">
                    <div className="px-5 py-4 border-b border-white/8">
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpen size={16} className="text-sp" />
                            <h2 className="text-sm font-bold text-white">Guide utilisateur</h2>
                        </div>
                        <p className="text-[10px] text-slate-500">SyndicPulse · v1.0</p>
                    </div>
                    <nav className="p-3 space-y-0.5 flex-1 overflow-auto">
                        {GUIDE_SECTIONS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => s.available && setSection(s.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-xs ${
                                    s.id === section
                                        ? 'bg-sp/15 text-sp font-semibold border border-sp/20'
                                        : s.available
                                            ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                            : 'text-slate-600 cursor-default'
                                }`}
                            >
                                <s.icon size={13} className="flex-shrink-0" />
                                <span className="flex-1">{s.label}</span>
                                {!s.available && <span className="text-[9px] bg-navy-700 text-slate-600 px-1.5 py-0.5 rounded-full">bientôt</span>}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-white/5">
                        <p className="text-[10px] text-slate-600 leading-relaxed">Guide complet — toutes les sections sont disponibles.</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    <div className="flex items-center justify-between px-7 py-4 border-b border-white/8 sticky top-0 bg-navy-800 z-10">
                        <div>
                            <h3 className="font-bold text-white text-base">{GUIDE_SECTIONS.find(s => s.id === section)?.label}</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Comment configurer et utiliser cette section</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-7 py-6 space-y-6">

                        {section === 'parametres' && <>
                            {/* Intro */}
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Le panneau <span className="text-white font-semibold">Paramètres de la propriété</span> est accessible via l'icône <span className="text-white font-semibold">⚙</span> dans la barre latérale gauche. Les modifications s'appliquent uniquement à l'immeuble actif — chaque immeuble possède ses propres réglages.
                                </p>
                            </div>

                            {/* Section: Identité visuelle */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Identité visuelle</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField
                                        label="Logo de la syndic"
                                        description="Importer une image PNG ou JPG (max 2 Mo). Apparaît dans l'en-tête de tous les documents imprimés : reçus de paiement, convocations AG, feuilles de présence, PV, circulaires et appels de fonds."
                                        tip="Si aucun logo n'est chargé, SyndicPulse génère automatiquement un icône avec les initiales de l'immeuble et sa couleur d'identité."
                                    />
                                    <GuideField
                                        label="Cachet officiel du Syndic"
                                        badge="Nouveau"
                                        description="Importer l'image du tampon officiel du syndic (PNG transparent recommandé). Une fois configuré, il est apposé automatiquement sur chaque document généré : reçus, circulaires, appels de fonds, convocations, feuilles de présence et PV d'assemblée."
                                        tip="Conseil : scanner votre tampon sur fond blanc, puis détourer l'arrière-plan avec un outil gratuit (ex: remove.bg) pour obtenir un PNG transparent — le résultat est bien plus propre sur les documents."
                                    />
                                </div>
                            </div>

                            {/* Section: Informations */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Informations de l'immeuble</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField
                                        label="Nom de la propriété"
                                        description="Nom officiel de la résidence. Utilisé dans tous les titres de documents, dans la barre de navigation latérale et comme identifiant dans les messages WhatsApp générés."
                                    />
                                    <GuideField
                                        label="Ville"
                                        description="Ville de l'immeuble. Apparaît dans les en-têtes de documents officiels et dans le sous-titre de la barre de navigation. Format libre (ex: Tanger, Casablanca — Ain Sebaâ)."
                                    />
                                    <GuideField
                                        label="Gestionnaire"
                                        description="Nom du gestionnaire syndic responsable de cet immeuble. Affiché dans la barre supérieure de l'application et utilisé comme signataire dans les documents officiels."
                                    />
                                    <GuideField
                                        label="Fonds de réserve"
                                        description="Montant en MAD de la trésorerie de réserve de la copropriété — l'épargne accumulée dédiée aux travaux et imprévus. Affiché dans la carte KPI violette de l'onglet Finances → Vue d'ensemble, et inclus dans les exports CSV et PDF du rapport financier."
                                        tip="Mettez à jour ce montant régulièrement (ex: après une assemblée générale ou une dépense exceptionnelle) pour que le tableau de bord reflète la situation réelle de la trésorerie."
                                    />
                                </div>
                            </div>

                            {/* Section: Coordonnées de paiement */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Coordonnées de paiement</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField
                                        label="RIB"
                                        badge="Portail"
                                        description="Numéro de compte bancaire (RIB) du syndicat pour les virements. Affiché dans l'espace portail des résidents en retard ou en attente de paiement, avec un bouton de copie en un clic."
                                    />
                                    <GuideField
                                        label="Banque & Titulaire"
                                        description="Nom de la banque et du titulaire du compte syndical. Présentés au résident à côté du RIB pour confirmer l'exactitude du bénéficiaire avant le virement."
                                    />
                                    <GuideField
                                        label="WhatsApp syndic"
                                        description="Numéro WhatsApp du gestionnaire. Le résident en retard peut cliquer sur 'Contacter le syndic' pour ouvrir WhatsApp avec un message pré-rempli incluant son nom, son appartement, les mois impayés et le montant total dû."
                                        tip="Conseil : utilisez un numéro dédié à la gestion (pas votre numéro personnel) pour filtrer facilement les demandes de paiement."
                                    />
                                </div>
                            </div>

                            {/* Section: Workflow */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow recommandé</h4>
                                <div className="space-y-2">
                                    {[
                                        { step: '1', text: 'Configurer le logo de la syndic — il s\'affiche immédiatement dans tous les nouveaux documents.' },
                                        { step: '2', text: 'Scanner et importer le cachet officiel (PNG transparent) — supprime entièrement la chaîne imprimer → tamponner → scanner → envoyer.' },
                                        { step: '3', text: 'Renseigner les coordonnées de paiement (RIB, banque, WhatsApp) — les résidents en retard pourront payer ou contacter le syndic directement depuis leur portail.' },
                                        { step: '4', text: 'Vérifier le nom, la ville, le gestionnaire et le fonds de réserve — ces informations sont inscrites dans les documents légaux et le tableau de bord financier.' },
                                        { step: '5', text: 'Répéter pour chaque immeuble si vous gérez plusieurs propriétés — chaque immeuble a ses propres paramètres indépendants.' },
                                    ].map(({ step, text }) => (
                                        <div key={step} className="flex gap-3 items-start bg-navy-700/40 rounded-xl px-4 py-3">
                                            <span className="w-6 h-6 rounded-full bg-sp/20 text-sp text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Documents impactés */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Documents utilisant le logo & le cachet</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { doc: 'Reçu de paiement', logo: true, cachet: true },
                                        { doc: 'Circulaire', logo: true, cachet: true },
                                        { doc: 'Appel de fonds', logo: true, cachet: true },
                                        { doc: 'Convocation AG', logo: true, cachet: true },
                                        { doc: 'Feuille de présence', logo: true, cachet: true },
                                        { doc: 'PV d\'assemblée', logo: true, cachet: true },
                                    ].map(({ doc, logo, cachet }) => (
                                        <div key={doc} className="flex items-center justify-between bg-navy-700/40 rounded-lg px-3 py-2.5">
                                            <span className="text-xs text-slate-300 font-medium">{doc}</span>
                                            <div className="flex gap-2">
                                                {logo && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Logo</span>}
                                                {cachet && <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Cachet</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Sauvegarde */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Données & Sauvegarde</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField
                                        label="Exporter la sauvegarde"
                                        badge="Nouveau"
                                        description="Télécharge un fichier JSON horodaté contenant l'intégralité des données de l'immeuble : résidents, paiements, dépenses, litiges, fournisseurs, réunions, circulaires et coordonnées bancaires."
                                        tip="Bonne pratique : téléchargez une sauvegarde chaque vendredi avant de fermer le navigateur. Nommez les fichiers avec la date pour garder un historique (ex: SyndicPulse_Norwest_2026-03-07.json)."
                                    />
                                    <GuideField
                                        label="Restaurer une sauvegarde"
                                        description="Importe un fichier JSON exporté précédemment. SyndicPulse affiche la date de la sauvegarde et demande une confirmation avant d'écraser les données actuelles. La page se recharge automatiquement après la restauration."
                                        tip="En cas de problème (navigateur effacé, changement de poste), la restauration remet l'application dans l'état exact de la dernière sauvegarde en moins de 10 secondes."
                                    />
                                </div>
                            </div>
                        </>}

                        {section === 'dashboard' && <>
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Le <span className="text-white font-semibold">Tableau de bord</span> est la première page à l'ouverture. Il donne une vue instantanée de l'état financier et opérationnel de l'immeuble actif.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Indicateurs clés (KPI)</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Taux de recouvrement" description="Pourcentage de résidents ayant réglé leur charge du mois en cours. Calculé en temps réel à partir des statuts de paiement. Affiché en vert si ≥ 80 %, en orange entre 60–80 %, en rouge en dessous." />
                                    <GuideField label="Charges du mois" description="Total des dépenses enregistrées sur le mois calendaire en cours. Se met à jour automatiquement à chaque ajout dans l'onglet Dépenses." />
                                    <GuideField label="Fonds de réserve" description="Trésorerie de réserve de la copropriété, saisie dans Paramètres. Affiché en violet pour le distinguer des flux mensuels." />
                                    <GuideField label="Résidents en retard" description="Nombre de résidents avec un ou plusieurs mois de charges impayés. Un clic redirige vers la liste Résidents filtrée sur 'En retard'." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Autres éléments</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Prochaine assemblée" description="Affiche la date et le lieu de la prochaine AG planifiée. Mis à jour automatiquement depuis l'onglet Assemblées." />
                                    <GuideField label="Activité récente" description="Journal des dernières actions : paiements enregistrés, circulaires envoyées, litiges créés. Permet un suivi rapide sans naviguer dans chaque section." />
                                    <GuideField label="Switcher d'immeuble" badge="Super Admin" description="Les comptes super administrateur voient un sélecteur d'immeuble dans la barre supérieure pour basculer entre les propriétés gérées. Chaque immeuble a ses propres données indépendantes." />
                                </div>
                            </div>
                        </>}

                        {section === 'residents' && <>
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    L'onglet <span className="text-white font-semibold">Résidents</span> est le registre central de la copropriété. Il concentre la gestion des paiements, les coordonnées des copropriétaires et l'accès au portail résident.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Liste & filtres</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Filtres de statut" description="Boutons Tous / En retard / En attente / Payé en haut de liste. 'En retard' = au moins un mois impayé avant le mois en cours. 'En attente' = mois courant non encore réglé. 'Payé' = à jour." />
                                    <GuideField label="Recherche" description="Barre de recherche en temps réel sur le nom du résident et le numéro d'appartement." />
                                    <GuideField label="Import CSV" description="Bouton 'Importer CSV' pour charger une liste de résidents depuis un fichier tableur. Télécharger le modèle CSV fourni pour respecter le format attendu (colonnes : nom, appartement, téléphone, email, paidThrough)." tip="En cas d'erreur d'import, vérifiez que les colonnes respectent exactement les noms du modèle et que le fichier est encodé en UTF-8." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Actions par résident</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Enregistrer un paiement" description="Bouton vert dans chaque ligne. Ouvre une modale permettant de couvrir 1, 2, 3, 6 ou 12 mois en une seule opération. Un aperçu montre les mois qui seront couverts avant confirmation. Un reçu PDF peut être imprimé immédiatement après." />
                                    <GuideField label="WhatsApp contextuel" description="Bouton WhatsApp (vert) qui génère un message adapté au statut : pour un résident en retard, le message liste explicitement chaque mois impayé et le montant total dû. Pour un résident à jour, ouvre un message blanc de courtoisie." />
                                    <GuideField label="Téléphone & Email" description="Boutons d'action rapide qui ouvrent l'application téléphone ou le client mail avec le contact pré-rempli." />
                                    <GuideField label="Modifier le résident" description="Crayon pour éditer les informations (nom, appartement, téléphone, email, paidThrough). Toute modification sur paidThrough est persistée et reflétée en temps réel dans le portail résident." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Portail résident</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Code portail individuel" badge="Portail" description="Chaque résident reçoit un code unique au format NW-4K8MRX (initiales de l'immeuble + 6 caractères aléatoires). Ce code lui permet de se connecter au portail pour consulter son solde, les coordonnées de paiement et les prochaines réunions." tip="Pour distribuer les codes à tous les résidents : imprimez la liste depuis Paramètres ou envoyez chaque code individuellement via WhatsApp depuis la fiche résident." />
                                    <GuideField label="Nouveaux résidents" description="Le bouton '+ Nouveau résident' génère automatiquement un code portail. Le nouveau résident est immédiatement accessible depuis le portail sans besoin de rechargement." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow recommandé (premier démarrage)</h4>
                                <div className="space-y-2">
                                    {[
                                        { step: '1', text: 'Importer la liste des résidents via CSV ou les saisir manuellement.' },
                                        { step: '2', text: 'Vérifier les statuts de paiement — mettre à jour le champ paidThrough pour chaque résident selon la situation réelle.' },
                                        { step: '3', text: 'Distribuer les codes portail : envoyer chaque code par WhatsApp depuis la fiche du résident.' },
                                        { step: '4', text: 'Chaque mois, filtrer sur "En retard" et utiliser le bouton WhatsApp pour relancer les impayés en une seule action.' },
                                    ].map(({ step, text }) => (
                                        <div key={step} className="flex gap-3 items-start bg-navy-700/40 rounded-xl px-4 py-3">
                                            <span className="w-6 h-6 rounded-full bg-sp/20 text-sp text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>}

                        {section === 'financials' && <>
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    L'onglet <span className="text-white font-semibold">Finances</span> regroupe trois sous-onglets : <span className="text-white font-semibold">Vue d'ensemble</span>, <span className="text-white font-semibold">Recouvrement</span> et <span className="text-white font-semibold">Dépenses</span>.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Vue d'ensemble</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Graphique de recouvrement" description="Histogramme des 6 derniers mois montrant le montant total collecté chaque mois. Utile pour repérer les mois creux et les tendances saisonnières." />
                                    <GuideField label="Résumé financier du mois" description="Synthèse rapide : charges totales vs montant recouvré, solde net du mois." />
                                    <GuideField label="Appel de fonds" description="Génère un document PDF d'appel de fonds officiel à distribuer aux résidents, avec logo, cachet et détail des charges à régler." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Recouvrement</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Matrice de paiement" description="Tableau croisé résidents × mois. Chaque cellule indique le statut (payé ✓ / en attente / en retard). Par défaut affiche les 6 derniers mois. Cliquer sur une cellule en attente ouvre directement la modale de paiement." />
                                    <GuideField label="Filtres de période" description="Pills 3M / 6M / 12M / 24M pour ajuster la plage temporelle de la matrice. Les sélecteurs de dates manuels permettent une plage personnalisée (le pill actif se désactive automatiquement)." />
                                    <GuideField label="Pagination" description="15 résidents par page. Navigation avec les boutons Précédent / Suivant." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dépenses</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Journal des dépenses" description="Liste chronologique de toutes les dépenses enregistrées : date, catégorie, fournisseur, montant, description, statut facture. Les données persistent entre les sessions." />
                                    <GuideField label="Ajouter une dépense" description="Bouton '+ Dépense' : saisir la date, la catégorie, le fournisseur (sélectionné depuis l'annuaire fournisseurs ou saisi librement), le montant et une description. La facture peut être marquée comme reçue ou non." />
                                    <GuideField label="Filtres & export" description="Pills 1M / 3M / 6M / 1an / Tout pour filtrer la période affichée. Bouton 'Exporter CSV' télécharge uniquement les dépenses de la période filtrée — pratique pour la comptabilité mensuelle." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow mensuel recommandé</h4>
                                <div className="space-y-2">
                                    {[
                                        { step: '1', text: 'Début de mois : aller dans Recouvrement → vérifier qui n\'a pas encore payé → relancer via WhatsApp depuis la liste Résidents.' },
                                        { step: '2', text: 'Au fil du mois : enregistrer chaque dépense (prestataires, factures) dans l\'onglet Dépenses.' },
                                        { step: '3', text: 'Fin de mois : exporter le CSV des dépenses du mois pour la comptabilité, générer un Appel de fonds si besoin.' },
                                    ].map(({ step, text }) => (
                                        <div key={step} className="flex gap-3 items-start bg-navy-700/40 rounded-xl px-4 py-3">
                                            <span className="w-6 h-6 rounded-full bg-sp/20 text-sp text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>}

                        {section === 'disputes' && <>
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    L'onglet <span className="text-white font-semibold">Litiges</span> permet de suivre les conflits entre résidents ou avec la copropriété — de l'ouverture à la clôture, avec pièces jointes et suggestions légales automatiques.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Statuts & priorités</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Statuts" description="4 étapes du cycle de vie : Ouvert (rouge) → Médiation (orange) → Résolu (vert) → Clôturé (gris). Le statut est modifiable à tout moment depuis la fiche du litige." />
                                    <GuideField label="Priorités" description="3 niveaux : Élevé (rouge) / Moyen (orange) / Faible (gris). Utilisés pour trier visuellement les litiges urgents en haut de liste." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gestion des litiges</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Créer un litige" description="Bouton '+ Nouveau litige' : saisir le titre, les parties concernées, la description, la priorité et le statut initial. Un identifiant unique (ex: DSP-001) est généré automatiquement." />
                                    <GuideField label="Modifier / clôturer" description="Crayon sur la carte du litige. Confirmation en 2 étapes avant toute modification ou suppression pour éviter les erreurs." />
                                    <GuideField label="Pièces jointes" badge="Nouveau" description="Chaque litige peut stocker jusqu'à 5 fichiers (photos, PDF, courriers) de 5 Mo maximum chacun. Les images s'affichent en miniature, les documents avec une icône de type. Un badge trombone indique le nombre de pièces jointes sur la carte." />
                                    <GuideField label="Suggestion IA" description="Chaque litige affiche une suggestion de résolution basée sur la Loi 18-00 relative à la copropriété au Maroc. Information indicative — consulter un juriste pour les cas complexes." />
                                </div>
                            </div>
                        </>}

                        {section === 'fournisseurs' && <>
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    L'onglet <span className="text-white font-semibold">Fournisseurs</span> est l'annuaire des prestataires de l'immeuble. Il s'intègre directement avec l'enregistrement des dépenses.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Annuaire</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Catégories" description="8 catégories : Ascenseur, Nettoyage, Électricité, Plomberie, Gardiennage, Espaces verts, Peinture, Autre. Chaque catégorie a une couleur d'identification pour un repérage visuel rapide." />
                                    <GuideField label="Fiche fournisseur" description="Chaque fiche contient : nom, catégorie, téléphone (cliquable), email, référence contrat, date de début, note (1–5 étoiles) et notes libres." />
                                    <GuideField label="Recherche & filtre" description="Barre de recherche sur le nom + filtre par catégorie en haut de liste." />
                                    <GuideField label="Notation étoiles" description="Système de notation 1 à 5 étoiles modifiable depuis la fiche. La note moyenne de tous les fournisseurs est affichée dans le KPI en haut de page." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Intégration avec les dépenses</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Sélection automatique" description="Lors de l'ajout d'une dépense dans l'onglet Finances, si des fournisseurs sont enregistrés, un menu déroulant les liste automatiquement. Sélectionner un fournisseur remplit son nom dans le champ vendeur instantanément." tip="Ajoutez vos fournisseurs réguliers avant de saisir les dépenses mensuelles pour gagner du temps et éviter les fautes de frappe dans les noms." />
                                </div>
                            </div>
                        </>}

                        {section === 'circulaires' && <>
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    L'onglet <span className="text-white font-semibold">Circulaires</span> permet de rédiger et diffuser des avis officiels aux résidents en quelques secondes, via WhatsApp Broadcast ou document imprimé.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Templates disponibles</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="💧 Coupure d'eau" description="Avis de coupure temporaire : date, horaires, zones concernées, raison. Message WhatsApp et document imprimable générés automatiquement." />
                                    <GuideField label="⚡ Coupure d'électricité" description="Identique au modèle eau, adapté pour les coupures électriques avec zones de bâtiments." />
                                    <GuideField label="🔧 Travaux / Maintenance" description="Notification de travaux : équipement concerné, date de début, durée estimée, nature des travaux." />
                                    <GuideField label="🏛️ Rappel Assemblée" description="Rappel AG avec date, heure, lieu et ordre du jour. Génère également une convocation officielle imprimable." />
                                    <GuideField label="🧹 Propreté & Règlement" description="Avis de rappel du règlement intérieur : sujet, rappel réglementaire, sanction prévue le cas échéant." />
                                    <GuideField label="🔍 Objet trouvé" badge="Nouveau" description="Annonce un objet trouvé dans les parties communes : description de l'objet, lieu de découverte, date, contact pour récupérer. Message WhatsApp généré automatiquement." />
                                    <GuideField label="📝 Avis personnalisé" description="Template libre : titre + contenu libre. Pour tout avis ne correspondant pas aux modèles prédéfinis." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Historique & actions</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Lancement rapide" description="Grille de raccourcis en haut de page — un clic sur un template ouvre directement le formulaire à l'étape 2, sans passer par le sélecteur." />
                                    <GuideField label="Copier message WhatsApp" description="Bouton copie dans chaque ligne d'historique. Colle le texte prêt à l'emploi dans WhatsApp Broadcast ou un groupe de résidents." />
                                    <GuideField label="Imprimer / PDF" description="Génère un document bilingue (français + titre en arabe) avec logo et cachet, prêt pour l'affichage dans les parties communes ou l'envoi par email." />
                                    <GuideField label="Modifier depuis l'historique" badge="Nouveau" description="Icône crayon sur chaque circulaire archivée. Rouvre le formulaire pré-rempli avec les données existantes — utile pour corriger une erreur ou réutiliser un modèle avec de nouvelles dates." />
                                    <GuideField label="Marquer comme diffusé" description="Bouton ✓ pour indiquer qu'une circulaire a été envoyée aux résidents. Le badge 'Diffusé' apparaît sur la carte et incrémente le compteur dans les KPI." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">KPI circulaires</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="4 indicateurs" description="Ce mois-ci (avis rédigés ce mois) · Diffusés (marqués comme envoyés) · Objets trouvés (count des avis objet trouvé) · Total archivés (cumul historique)." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Module Objets trouvés</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Aperçu du registre centralisé" badge="Prochaine version" description="Un registre visuel des objets trouvés (photo, statut En attente / Réclamé, lieu) sera disponible dans une version à venir. Pour l'instant, utilisez le template 'Objet trouvé' pour notifier les résidents via WhatsApp." />
                                </div>
                            </div>
                        </>}

                        {section === 'assemblees' && <>
                            <div className="bg-sp/5 border border-sp/15 rounded-xl p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    L'onglet <span className="text-white font-semibold">Assemblées</span> gère le cycle complet des réunions de copropriété : planification, convocation, tenue et procès-verbal.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gestion des assemblées</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Créer une assemblée" description="Bouton '+ Nouvelle AG' : titre, date, heure, lieu, ordre du jour, statut initial. L'assemblée apparaît dans le calendrier de planification et dans la carte 'Prochaine AG' du tableau de bord." />
                                    <GuideField label="Statuts" description="3 statuts : À venir (bleu) → En cours (orange) → Terminée (vert). Mettre à jour le statut au fil du déroulement de la réunion." />
                                    <GuideField label="Modifier / supprimer" description="Icône crayon sur chaque assemblée. Confirmation en 2 étapes avant suppression." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Documents générés</h4>
                                <div className="glass-card px-5 py-1">
                                    <GuideField label="Convocation" description="Document officiel à envoyer aux résidents 15 jours avant l'assemblée. Inclut : logo, cachet, date, heure, lieu, ordre du jour complet. S'ouvre dans une fenêtre d'impression navigateur." />
                                    <GuideField label="Feuille de présence" description="Tableau avec la liste de tous les résidents, leur appartement et une colonne signature. À imprimer le jour de l'AG pour l'émargement." />
                                    <GuideField label="Procès-verbal (PV)" description="Modèle de PV pré-rempli avec les informations de l'assemblée : date, lieu, résidents présents, ordre du jour. À compléter avec les décisions prises lors de la réunion puis imprimer pour signature." />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow AG recommandé</h4>
                                <div className="space-y-2">
                                    {[
                                        { step: '1', text: 'J−15 : créer l\'assemblée avec statut "À venir", rédiger l\'ordre du jour complet, imprimer la convocation et la distribuer (WhatsApp + affichage).' },
                                        { step: '2', text: 'Jour J : imprimer la feuille de présence, changer le statut de l\'assemblée en "En cours".' },
                                        { step: '3', text: 'Après l\'AG : imprimer le PV, le faire signer, changer le statut en "Terminée".' },
                                    ].map(({ step, text }) => (
                                        <div key={step} className="flex gap-3 items-start bg-navy-700/40 rounded-xl px-4 py-3">
                                            <span className="w-6 h-6 rounded-full bg-sp/20 text-sp text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                                            <p className="text-[13px] text-slate-300 leading-relaxed">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>}

                    </div>
                </div>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════
   TOP BAR
══════════════════════════════════════════ */
function TopBar({ activeTab, activeBuilding, themeMode, setThemeMode, showToast }) {
    const pageLabel = NAV.find(n => n.id === activeTab)?.label ?? activeTab
    const [showGuide, setShowGuide] = useState(false)
    return (
        <>
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-navy-900/80 backdrop-blur-sm flex-shrink-0">
            <div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-0.5">
                    <span>SyndicPulse</span>
                    <ChevronRight size={10} />
                    <span style={{ color: activeBuilding.color }} className="font-medium">
                        {activeBuilding.name} · {activeBuilding.city}
                    </span>
                    <ChevronRight size={10} />
                    <span className="text-slate-300">{pageLabel}</span>
                </div>
                <h1 className="text-xl font-bold text-white">{pageLabel}</h1>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setThemeMode(t => t === 'navy' ? 'gold' : 'navy')}
                    title={themeMode === 'navy' ? 'Passer au thème Indigo/Or' : 'Passer au thème Marine/Cyan'}
                    className="relative p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-white/5 transition-colors group"
                >
                    <Palette size={17} className="text-slate-400 group-hover:text-sp transition-colors" />
                    {themeMode === 'gold' && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full border border-navy-800" />
                    )}
                </button>
                <button
                    onClick={() => setShowGuide(true)}
                    title="Guide utilisateur"
                    className="relative p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-white/5 transition-colors group"
                >
                    <BookOpen size={17} className="text-slate-400 group-hover:text-sp transition-colors" />
                </button>
                <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="relative p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-white/5 transition-colors">
                    <Bell size={17} className="text-slate-400" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sp rounded-full border border-navy-800" />
                </button>
                <div className="pl-3 border-l border-white/5 text-right">
                    <p className="text-sm font-semibold text-white">{activeBuilding.manager}</p>
                    <p className="text-[11px] text-slate-400">Gestionnaire syndic</p>
                </div>
            </div>
        </header>
        {showGuide && <UserGuideModal onClose={() => setShowGuide(false)} />}
        </>
    )
}

/* ══════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════ */
function DashboardPage({ building, data, residents, setIsVoiceOpen, setActiveTab, showToast }) {
    const [showWAModal, setShowWAModal] = useState(false)
    const [showTransparenceModal, setShowTransparenceModal] = useState(false)
    const overdueResidents = residents.filter(r => computeStatus(r.paidThrough) === 'overdue')

    // ── Transparence score (computed from live data) ──
    const totalRes = residents.length || 1
    const resWithPhone = residents.filter(r => r.phone).length
    const ticketsDone = data.tickets.filter(t => t.status === 'done').length
    const ticketsTotal = data.tickets.length || 1
    const hasExpenses = data.expenses.length > 0
    const hasAG = data.meetings.some(m => ['upcoming', 'held'].includes(m.status))

    const monthlyFee = building.monthly_fee || 850
    const totalImpayees = residents.reduce((sum, r) => {
        const fee = r.monthly_fee ?? monthlyFee
        return sum + getUnpaidMonthsCount(r.paidThrough) * fee
    }, 0)
    const paidCount = residents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const tauxRecouvrement = totalRes > 0 ? Math.round((paidCount / totalRes) * 100) : 100

    const transBreakdown = [
        { label: 'Recouvrement documenté', pts: Math.round((tauxRecouvrement / 100) * 30), max: 30 },
        { label: 'Dépenses tracées', pts: hasExpenses ? (data.expenses.length >= 5 ? 25 : 15) : 0, max: 25 },
        { label: 'Tickets suivis', pts: Math.round((ticketsDone / ticketsTotal) * 20), max: 20 },
        { label: 'Résidents renseignés', pts: Math.round((resWithPhone / totalRes) * 15), max: 15 },
        { label: 'Assemblée planifiée', pts: hasAG ? 10 : 0, max: 10 },
    ]
    const transScore = transBreakdown.reduce((s, b) => s + b.pts, 0)
    const transTier = transScore >= 95 ? 'Gold Elite' : transScore >= 80 ? 'Silver Pro' : transScore >= 60 ? 'Bronze' : 'Standard'

    const overdueCount = overdueResidents.length
    const pendingCount = residents.filter(r => computeStatus(r.paidThrough) === 'pending').length
    const impayesDelta = overdueCount === 0 && pendingCount === 0
        ? 'Tout à jour'
        : [overdueCount > 0 && `${overdueCount} en retard`, pendingCount > 0 && `${pendingCount} en attente`].filter(Boolean).join(' · ')
    const kpis = [
        { label: 'Taux de recouvrement', value: `${tauxRecouvrement}%`, delta: `${paidCount}/${residents.length} rés.`, up: true, icon: TrendingUp, color: 'emerald' },
        { label: 'Charges impayées', value: `${totalImpayees.toLocaleString('fr-FR')} MAD`, delta: impayesDelta, up: overdueCount === 0 && pendingCount === 0, icon: CreditCard, color: 'cyan' },
        { label: 'Tickets ouverts', value: data.tickets.filter(t => t.status !== 'done').length.toString(), delta: 'Stable', up: null, icon: Wrench, color: 'amber' },
        { label: 'Transparence', value: `${transScore}/100`, delta: transTier, up: null, icon: ShieldCheck, color: 'violet' },
    ]

    const statusDot = {
        in_progress: 'bg-sp',
        scheduled: 'bg-slate-500',
        done: 'bg-emerald-500',
    }

    return (
        <>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            Bonjour, <span className="text-sp">{building.manager.split(' ')[0]}</span> 👋
                        </h2>
                        <p className="text-slate-400 mt-0.5 text-sm">
                            Gestion de <span className="font-semibold" style={{ color: building.color }}>{building.name} · {building.city}</span>
                            {' '}— {building.total_units} unités résidentielles
                        </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <p className="font-medium text-slate-300">Février 2026</p>
                        <p>T1 · Semaine 8</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-5">
                    {kpis.map(k => (
                        <KpiCard
                            key={k.label}
                            {...k}
                            onInfo={k.label === 'Transparence' ? () => setShowTransparenceModal(true) : undefined}
                        />
                    ))}
                </div>

                {showTransparenceModal && (
                    <TransparenceModal
                        score={transScore}
                        tier={transTier}
                        breakdown={transBreakdown}
                        onClose={() => setShowTransparenceModal(false)}
                    />
                )}

                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 glass-card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-white">Activité maintenance</h3>
                            <button onClick={() => setActiveTab('planning')} className="text-xs text-sp hover:text-sp-light flex items-center gap-1 transition-colors">
                                Voir planning <ChevronRight size={13} />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {data.tickets.slice(0, 4).map(t => (
                                <div key={t.id} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-navy-700/60 transition-colors group">
                                    <div className={`w-2.5 h-2.5 rounded-full ${statusDot[t.status] ?? 'bg-slate-500'} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-100 truncate">{t.title}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{t.agent} · {t.time}</p>
                                    </div>
                                    <StatusBadge status={t.status} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="glass-card p-6 relative overflow-hidden border-sp/15"
                            style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(17,29,53,0.9))' }}>
                            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-sp/10 blur-2xl pointer-events-none" />
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center">
                                        <Mic size={16} className="text-sp" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Agent Vocal IA</p>
                                        <p className="text-[10px] text-slate-400">Darija · Français</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mb-4 leading-relaxed italic">
                                    "3andi mochkil f l'ascenseur..."
                                </p>
                                <button
                                    onClick={() => setIsVoiceOpen(true)}
                                    className="w-full py-2.5 bg-sp hover:bg-sp-dark text-navy-900 text-xs font-bold rounded-xl transition-all shadow-glow-cyan flex items-center justify-center gap-1.5"
                                >
                                    <Mic size={13} /> Parler à l'IA
                                    <span className="text-[9px] font-bold bg-navy-900/25 px-1.5 py-0.5 rounded-full">Démo</span>
                                </button>
                            </div>
                        </div>

                        <div className="glass-card p-4">
                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-3">Progression mensuelle</p>
                            <div className="space-y-3">
                                <ProgressRow label="Charges encaissées" value={97} color="bg-emerald-500" />
                                <ProgressRow label="SLA maintenance" value={82} color="bg-sp" />
                                <ProgressRow label="Budget utilisé" value={61} color="bg-violet-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-white">Paiements récents</h3>
                        <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="text-xs text-sp hover:text-sp-light flex items-center gap-1 transition-colors">
                            Voir tout <ChevronRight size={13} />
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                                <th className="text-left pb-3 font-semibold">Unité</th>
                                <th className="text-left pb-3 font-semibold">Résident</th>
                                <th className="text-left pb-3 font-semibold">Montant</th>
                                <th className="text-left pb-3 font-semibold">Date</th>
                                <th className="text-left pb-3 font-semibold">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {data.recentPayments.map((p, i) => (
                                <tr key={i} className="hover:bg-navy-700/40 transition-colors">
                                    <td className="py-3 font-mono text-xs text-sp">{p.unit}</td>
                                    <td className="py-3 text-slate-200">{p.name}</td>
                                    <td className="py-3 text-white font-semibold">{p.amount}</td>
                                    <td className="py-3 text-slate-400">{p.date}</td>
                                    <td className="py-3"><PaymentBadge status={p.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {overdueResidents.length > 0 && (
                    <div className="glass-card p-6" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                    <MessageCircle size={16} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-white">Résidents en retard</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        <span className="text-amber-400 font-semibold">{overdueResidents.length} résident{overdueResidents.length > 1 ? 's' : ''}</span> — cotisation en attente de règlement
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowWAModal(true)}
                                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                            >
                                <MessageCircle size={14} /> Envoyer rappel groupé
                            </button>
                        </div>
                    </div>
                )}

            </div>

            <AnimatePresence>
                {showWAModal && (
                    <WhatsAppGroupModal
                        overdueResidents={overdueResidents}
                        building={building}
                        onClose={() => setShowWAModal(false)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}

/* ══════════════════════════════════════════
   FINANCIALS PAGE
══════════════════════════════════════════ */
/* Returns an HTML string (img or SVG initials icon) for use in print documents */
function buildingLogoHTML(building, size = 44) {
    if (building.logo) {
        return `<img src="${building.logo}" style="height:${size}px;width:auto;max-width:${size * 3}px;border-radius:6px;object-fit:contain;flex-shrink:0;" alt="logo"/>`
    }
    const words = (building.name ?? '').trim().split(/\s+/)
    const initials = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : (building.name ?? '??').slice(0, 2).toUpperCase()
    const color = building.color ?? '#06b6d4'
    const r = Math.round(size / 5)
    const fs = Math.round(size * 0.38)
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><rect width="${size}" height="${size}" rx="${r}" fill="${color}" opacity="0.18"/><rect width="${size}" height="${size}" rx="${r}" fill="none" stroke="${color}" stroke-width="1.5"/><text x="${size / 2}" y="${size / 2}" dominant-baseline="central" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fs}" font-weight="bold" fill="${color}">${initials}</text></svg>`
}

/* Returns cachet img if uploaded, else the placeholder circle */
function cachetHTML(building, size = 80) {
    if (building.cachet) {
        return `<img src="${building.cachet}" style="height:${size}px;width:auto;max-width:${Math.round(size * 1.6)}px;object-fit:contain;opacity:0.88;display:block;" alt="cachet"/>`
    }
    return `<div style="width:${size}px;height:${size}px;border:2px dashed #bbb;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;color:#bbb;line-height:1.4;padding:10px">Cachet<br/>du<br/>Syndic</div>`
}

function generatePaymentReceipt(building, resident, form, coveredThrough) {
    const METHOD_LABELS = { especes: 'Espèces', virement: 'Virement bancaire', cheque: 'Chèque' }
    const dateStr = new Date(form.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const receiptNo = `REC-${Date.now().toString(36).toUpperCase()}`
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Reçu de paiement — ${resident.unit}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 48px; max-width: 600px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #0e7490; }
  .brand { font-size: 20px; font-weight: bold; color: #0e7490; }
  .brand span { color: #111; }
  .receipt-no { font-size: 11px; color: #6b7280; text-align: right; }
  .receipt-no strong { display: block; font-size: 14px; color: #111; margin-bottom: 2px; }
  h2 { font-size: 16px; font-weight: bold; text-align: center; color: #0e7490; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
  .row .lbl { color: #6b7280; }
  .row .val { font-weight: 600; color: #111; text-align: right; }
  .amount-box { background: #ecfdf5; border: 2px solid #6ee7b7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
  .amount-box .amt { font-size: 28px; font-weight: bold; color: #065f46; }
  .amount-box .lbl { font-size: 12px; color: #059669; margin-top: 4px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig { text-align: center; }
  .sig .line { width: 160px; border-top: 1px solid #111; margin: 40px auto 6px; }
  .sig .name { font-size: 11px; color: #6b7280; }
  .legal { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 32px; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;gap:12px">
    ${buildingLogoHTML(building, 44)}
    <div>
      <div class="brand">${building.name}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">${building.city}</div>
    </div>
  </div>
  <div class="receipt-no">
    <strong>REÇU N° ${receiptNo}</strong>
    Date : ${dateStr}
  </div>
</div>

<h2>Reçu de paiement de charges</h2>

<div class="amount-box">
  <div class="amt">${Number(form.amount).toLocaleString('fr-FR')} MAD</div>
  <div class="lbl">${form.months} mois couverts · Jusqu'à ${formatMonth(coveredThrough)}</div>
</div>

<div class="row"><span class="lbl">Résident</span><span class="val">${resident.name}</span></div>
<div class="row"><span class="lbl">Unité</span><span class="val">${resident.unit}</span></div>
<div class="row"><span class="lbl">Mode de paiement</span><span class="val">${METHOD_LABELS[form.method] ?? form.method}</span></div>
<div class="row"><span class="lbl">Date de réception</span><span class="val">${dateStr}</span></div>
<div class="row"><span class="lbl">Période couverte</span><span class="val">${form.months} mois</span></div>
<div class="row"><span class="lbl">Payé jusqu'à</span><span class="val">${formatMonth(coveredThrough)}</span></div>
${form.ref ? `<div class="row"><span class="lbl">Référence / N° reçu</span><span class="val">${form.ref}</span></div>` : ''}

<div class="footer">
  <div class="sig">
    ${building.cachet ? `<img src="${building.cachet}" style="height:72px;width:auto;max-width:110px;object-fit:contain;opacity:0.88;display:block;margin-bottom:4px;" alt="cachet"/>` : ''}
    <div class="line"></div>
    <div class="name">Signature du syndic</div>
  </div>
  <div class="sig">
    <div class="line"></div>
    <div class="name">Signature du résident</div>
  </div>
</div>

<div class="legal">Ce reçu est émis par le syndic de ${building.name} conformément à la Loi 18-00. Conservez ce document.</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function exportFinancesCSV(building, residents, expenseLog, data) {
    const BOM = '\uFEFF' // UTF-8 BOM so Excel reads Arabic/French correctly

    // ── Section 1: Header ──────────────────────────────────────────────────────
    const header = [
        [`Rapport financier — ${building.name}`, '', '', '', '', ''],
        [`Immeuble`, building.name, 'Ville', building.city, 'Date', new Date().toLocaleDateString('fr-FR')],
        [],
    ]

    // ── Section 2: Résumé ──────────────────────────────────────────────────────
    const paidCount = residents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const overdueCount = residents.filter(r => computeStatus(r.paidThrough) === 'overdue').length
    const csvMonthlyBudget = data.expenses.reduce((s, e) => s + e.amount, 0)
    const summary = [
        ['RÉSUMÉ', '', '', '', '', ''],
        ['Unités payées', `${paidCount} / ${building.total_units}`, '', 'Unités en retard', overdueCount, ''],
        ['Budget mensuel', `${csvMonthlyBudget.toLocaleString('fr-FR')} MAD`, '', 'Fonds de réserve', `${building.reserve_fund_mad?.toLocaleString('fr-FR') ?? '—'} MAD`, ''],
        [],
    ]

    // ── Section 3: Journal des dépenses ────────────────────────────────────────
    const expHeader = [['JOURNAL DES DÉPENSES', '', '', '', '', '']]
    const expCols = [['Date', 'Catégorie', 'Fournisseur', 'Description', 'Montant (MAD)', 'Facture']]
    const expRows = expenseLog.map(e => [
        e.date, e.category, e.vendor, e.description,
        e.amount, e.hasInvoice ? 'Oui' : 'Non',
    ])
    const expTotal = [['', '', '', 'TOTAL', expenseLog.reduce((s, e) => s + e.amount, 0), '']]

    // ── Section 4: Statut paiements résidents ──────────────────────────────────
    const resHeader = [['STATUT PAIEMENTS RÉSIDENTS', '', '', '', '', '']]
    const resCols = [['Unité', 'Résident', 'Téléphone', 'Statut', 'Payé jusqu\'à', 'Depuis']]
    const resRows = residents.map(r => {
        const st = computeStatus(r.paidThrough)
        return [r.unit, r.name, r.phone, st === 'paid' ? 'Payé' : st === 'pending' ? 'En attente' : 'En retard', formatMonth(r.paidThrough), r.since]
    })

    // ── Section 5: Répartition dépenses ───────────────────────────────────────
    const repHeader = [['RÉPARTITION DES DÉPENSES', '', '', '', '', '']]
    const repCols = [['Catégorie', 'Montant (MAD)', '% Budget', '', '', '']]
    const repRows = data.expenses.map(e => [e.category, e.amount, `${e.pct}%`, '', '', ''])

    const allRows = [
        ...header,
        ...summary,
        ...expHeader, ...expCols, ...expRows, ...expTotal,
        [],
        ...resHeader, ...resCols, ...resRows,
        [],
        ...repHeader, ...repCols, ...repRows,
    ]

    const csv = BOM + allRows.map(row =>
        row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
    ).join('\r\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${building.name.replace(/\s+/g, '_')}_Rapport_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

function exportFinancesPDF(building, residents, expenseLog, data) {
    const paidCount = residents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const overdueList = residents.filter(r => computeStatus(r.paidThrough) === 'overdue')
    const totalExp = expenseLog.reduce((s, e) => s + e.amount, 0)
    const pdfMonthlyBudget = data.expenses.reduce((s, e) => s + e.amount, 0)
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Rapport financier — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
  h1 { font-size: 20px; color: #0e7490; margin-bottom: 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
  h2 { font-size: 13px; font-weight: bold; color: #0e7490; border-bottom: 2px solid #0e7490; padding-bottom: 4px; margin: 24px 0 10px; text-transform: uppercase; letter-spacing: .5px; }
  .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 8px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
  .kpi .val { font-size: 16px; font-weight: bold; color: #0e7490; }
  .kpi .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
  td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .badge-paid    { background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
  .badge-pending { background:#fef9c3; color:#b45309; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
  .badge-overdue { background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
  .total-row td  { font-weight: bold; background: #f8fafc; }
  .footer { margin-top: 32px; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 16px; } button { display:none; } }
</style>
</head>
<body>
<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #0e7490">
  ${buildingLogoHTML(building, 48)}
  <div>
    <h1 style="font-size:20px;color:#0e7490;margin:0">Rapport financier — ${building.name}</h1>
    <p class="meta" style="margin:4px 0 0">${building.city} &nbsp;·&nbsp; Généré le ${dateStr}</p>
  </div>
</div>

<h2>Résumé</h2>
<div class="kpis">
  <div class="kpi"><div class="val">${paidCount} / ${building.total_units}</div><div class="lbl">Unités payées</div></div>
  <div class="kpi"><div class="val" style="color:#dc2626">${overdueList.length}</div><div class="lbl">En retard</div></div>
  <div class="kpi"><div class="val">${pdfMonthlyBudget.toLocaleString('fr-FR')} MAD</div><div class="lbl">Budget mensuel</div></div>
  <div class="kpi"><div class="val" style="color:#7c3aed">${building.reserve_fund_mad?.toLocaleString('fr-FR') ?? '—'} MAD</div><div class="lbl">Fonds de réserve</div></div>
</div>

<h2>Journal des dépenses</h2>
<table>
  <thead><tr><th>Date</th><th>Catégorie</th><th>Fournisseur</th><th>Description</th><th style="text-align:right">Montant</th><th>Facture</th></tr></thead>
  <tbody>
    ${expenseLog.map(e => `
    <tr>
      <td>${e.date}</td><td>${e.category}</td><td>${e.vendor}</td>
      <td>${e.description}</td>
      <td style="text-align:right;font-weight:600">${e.amount.toLocaleString('fr-FR')} MAD</td>
      <td>${e.hasInvoice ? '✓' : '—'}</td>
    </tr>`).join('')}
    <tr class="total-row"><td colspan="4">TOTAL</td><td style="text-align:right">${totalExp.toLocaleString('fr-FR')} MAD</td><td></td></tr>
  </tbody>
</table>

<h2>Statut paiements résidents</h2>
<table>
  <thead><tr><th>Unité</th><th>Résident</th><th>Statut</th><th>Payé jusqu'à</th><th>Téléphone</th></tr></thead>
  <tbody>
    ${residents.map(r => {
        const st = computeStatus(r.paidThrough)
        const badge = st === 'paid' ? 'badge-paid' : st === 'pending' ? 'badge-pending' : 'badge-overdue'
        const label = st === 'paid' ? 'Payé' : st === 'pending' ? 'En attente' : 'En retard'
        return `<tr><td>${r.unit}</td><td>${r.name}</td><td><span class="${badge}">${label}</span></td><td>${formatMonth(r.paidThrough)}</td><td>${r.phone}</td></tr>`
    }).join('')}
  </tbody>
</table>

<h2>Répartition des dépenses</h2>
<table>
  <thead><tr><th>Catégorie</th><th style="text-align:right">Montant (MAD)</th><th style="text-align:right">% Budget</th></tr></thead>
  <tbody>
    ${data.expenses.map(e => `<tr><td>${e.category}</td><td style="text-align:right">${e.amount.toLocaleString('fr-FR')}</td><td style="text-align:right">${e.pct}%</td></tr>`).join('')}
  </tbody>
</table>

<div class="footer">${building.name} &nbsp;·&nbsp; ${building.city} &nbsp;·&nbsp; ${dateStr}</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function FinancialsPage({ building, data, residents, setResidents, suppliers = [], showToast }) {
    const maxBar = Math.max(...data.collectionHistory.map(h => h.value))

    const [subTab, setSubTab] = useState('overview')   // 'overview' | 'recouvrement' | 'depenses'
    const [hoveredBar, setHoveredBar] = useState(null)
    const [expenseLog, setExpenseLog] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(`sp_expenses_${building.id}`) ?? 'null')
            if (Array.isArray(stored)) return stored
        } catch { }
        return INITIAL_EXPENSE_LOG
    })
    useEffect(() => {
        try { localStorage.setItem(`sp_expenses_${building.id}`, JSON.stringify(expenseLog)) } catch { }
    }, [expenseLog, building.id])
    const [showAddExp, setShowAddExp] = useState(false)
    const [showRecPay, setShowRecPay] = useState(false)
    const [showAppelDF, setShowAppelDF] = useState(false)
    const [recPayPreset, setRecPayPreset] = useState(null)  // { residentId } pre-fill from recouvrement grid

    // Dépenses date-range filter (empty string = no bound)
    const [expFrom, setExpFrom] = useState('')
    const [expTo, setExpTo] = useState('')
    const [expActivePill, setExpActivePill] = useState('Tout')   // tracks active preset pill
    function setExpPreset(months, label) {
        setExpActivePill(label)
        if (months === null) { setExpFrom(''); setExpTo(''); return }
        const today = new Date()
        const from = new Date(today); from.setMonth(from.getMonth() - months)
        setExpFrom(from.toISOString().slice(0, 10))
        setExpTo(today.toISOString().slice(0, 10))
    }

    const monthlyFee = building.monthly_fee || 850
    const residentFee = (r) => r.monthly_fee ?? monthlyFee
    const overdue = residents.filter(r => computeStatus(r.paidThrough) === 'overdue').map(r => {
        const months = getUnpaidMonthsCount(r.paidThrough)
        const fee = residentFee(r)
        return {
            id: r.id, unit: r.unit, name: r.name, months, amount: `${(months * fee).toLocaleString('fr-FR')} MAD`,
        }
    })
    const totalImpayeesMAD = residents.reduce((sum, r) => sum + getUnpaidMonthsCount(r.paidThrough) * residentFee(r), 0)
    const paidResi = residents.filter(r => computeStatus(r.paidThrough) === 'paid')
    const totalEncaisseMAD = paidResi.reduce((sum, r) => sum + residentFee(r), 0)

    // Budget mensuel = sum of planned expense categories; % utilisé = current-month actual / budget
    const monthlyBudget = data.expenses.reduce((s, e) => s + e.amount, 0)
    const currentMonthExp = expenseLog.filter(e => e.date?.startsWith(CURRENT_MONTH)).reduce((s, e) => s + e.amount, 0)
    const budgetUsedPct = monthlyBudget > 0 ? Math.min(100, Math.round((currentMonthExp / monthlyBudget) * 100)) : 0
    const monthlySurplus = totalEncaisseMAD - monthlyBudget

    // Dynamic current month label for KPI headers
    const FIN_MONTHS = ['Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
    const curMonthLabel = FIN_MONTHS[parseInt(CURRENT_MONTH.split('-')[1]) - 1]

    // Live collection history — last bar overridden with computed rate from live residents
    const liveCollectionRate = residents.length > 0 ? Math.round((paidResi.length / residents.length) * 100) : 0
    const liveCollectionHistory = data.collectionHistory.map((h, i) =>
        i === data.collectionHistory.length - 1
            ? { ...h, value: liveCollectionRate, isLive: true }
            : h
    )
    const liveMaxBar = Math.max(maxBar, liveCollectionRate)

    // Live expense breakdown — computed from actual expenseLog; falls back to budget allocation if empty
    const liveExpBreakdown = (() => {
        if (expenseLog.length === 0) return data.expenses
        const totals = {}
        expenseLog.forEach(e => { totals[e.category] = (totals[e.category] ?? 0) + e.amount })
        const total = Object.values(totals).reduce((s, v) => s + v, 0)
        const catColorMap = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.label, c.color]))
        return Object.entries(totals)
            .map(([category, amount]) => ({
                category, amount,
                pct: total > 0 ? Math.round((amount / total) * 100) : 0,
                color: catColorMap[category] ?? 'bg-slate-500',
            }))
            .sort((a, b) => b.amount - a.amount)
    })()

    function handleAddExpense(entry) {
        setExpenseLog(prev => [{ ...entry, id: `el-${Date.now()}` }, ...prev])
        showToast(`Dépense enregistrée — ${entry.amount.toLocaleString('fr-FR')} MAD`)
    }

    function handleMarkPaid({ residentId, months }) {
        setResidents(prev => prev.map(r => {
            if (r.id !== residentId) return r
            const updated = { ...r, paidThrough: advancePaidThrough(r.paidThrough, months) }
            // Persist for portal real-time sync
            try {
                const key = `sp_payments_${building.id}`
                const map = JSON.parse(localStorage.getItem(key) ?? '{}')
                localStorage.setItem(key, JSON.stringify({ ...map, [residentId]: updated.paidThrough }))
            } catch { }
            return updated
        }))
        showToast(`Paiement enregistré — ${months} mois couverts`)
    }

    const filteredLog = expenseLog.filter(e =>
        (!expFrom || e.date >= expFrom) &&
        (!expTo || e.date <= expTo)
    )
    const totalExpenseLog = filteredLog.reduce((s, e) => s + e.amount, 0)

    // Dépenses pagination
    const [expPage, setExpPage] = useState(1)
    const EXP_PER_PAGE = 15
    const expTotalPages = Math.max(1, Math.ceil(filteredLog.length / EXP_PER_PAGE))
    const paginatedLog = filteredLog.slice((expPage - 1) * EXP_PER_PAGE, expPage * EXP_PER_PAGE)
    // Reset page when filter changes
    useEffect(() => setExpPage(1), [expFrom, expTo])

    return (
        <div className="space-y-6">
            {/* Sub-tab nav */}
            <div className="flex gap-2 border-b border-white/8 pb-0">
                {[
                    { id: 'overview', label: 'Vue d\'ensemble' },
                    { id: 'recouvrement', label: 'Recouvrement' },
                    { id: 'depenses', label: 'Dépenses' },
                ].map(t => (
                    <button key={t.id} onClick={() => setSubTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${subTab === t.id
                                ? 'border-sp text-sp'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}>
                        {t.label}
                    </button>
                ))}
                {/* Action buttons always visible */}
                <div className="ml-auto flex items-center gap-2 pb-1">
                    <button onClick={() => setShowAddExp(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-lg text-xs font-bold transition-all">
                        <Plus size={13} /> Dépense
                    </button>
                    <button onClick={() => setShowRecPay(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all">
                        <CheckCircle2 size={13} /> Paiement
                    </button>
                    <button onClick={() => setShowAppelDF(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-bold transition-all">
                        <Banknote size={13} /> Appel de fonds
                    </button>
                </div>
            </div>

            {/* ── Sub-tab: Vue d'ensemble ─────────────────────────────── */}
            {subTab === 'overview' && <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-4 gap-5">
                    {[
                        { label: `Total encaissé (${curMonthLabel})`, value: `${totalEncaisseMAD.toLocaleString('fr-FR')} MAD`, sub: `${paidResi.length} / ${building.total_units} unités payées`, color: 'emerald' },
                        { label: 'Charges impayées', value: `${totalImpayeesMAD.toLocaleString('fr-FR')} MAD`, sub: `${overdue.length} unités en retard`, color: 'red' },
                        { label: 'Budget mensuel', value: `${monthlyBudget.toLocaleString('fr-FR')} MAD`, sub: `${budgetUsedPct}% utilisé ce mois`, color: 'cyan' },
                        { label: 'Fonds de réserve', value: `${(building.reserve_fund_mad / 1000).toFixed(0)} 000 MAD`, sub: monthlySurplus >= 0 ? `+${monthlySurplus.toLocaleString('fr-FR')} ce mois` : `${monthlySurplus.toLocaleString('fr-FR')} ce mois`, color: 'violet' },
                    ].map(s => (
                        <StatCard key={s.label} className="glass-card p-5">
                            <p className="text-xs text-slate-400 mb-2 font-medium">{s.label}</p>
                            <p className={`text-xl font-bold ${s.color === 'emerald' ? 'text-emerald-400' :
                                    s.color === 'red' ? 'text-red-400' :
                                        s.color === 'cyan' ? 'text-sp' :
                                            'text-violet-400'
                                }`}>{s.value}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{s.sub}</p>
                        </StatCard>
                    ))}
                </div>

                {/* nothing here — actions moved to tab header */}

                <div className="grid grid-cols-3 gap-6">
                    {/* Collection chart */}
                    <div className="col-span-2 glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-white">Taux de recouvrement — 7 derniers mois</h3>
                            <span className="text-xs text-slate-400 bg-navy-700 px-3 py-1 rounded-full border border-white/5">% unités payées</span>
                        </div>
                        {/*
                        Layout math:
                        - Chart width ≈ 690px (col-span-2 minus card padding)
                        - 7 flex-1 columns → ~92px each
                        - Bar fixed at 32px (w-8) = 35% of column, column acts as gap
                        - Container 140px: labels ~38px → usable bar height = 80px max
                    */}
                        <div className="flex items-end justify-between" style={{ height: '140px' }}>
                            {liveCollectionHistory.map((h, i) => {
                                const BAR_MAX_PX = 80
                                const barPx = Math.max(4, Math.round((h.value / liveMaxBar) * BAR_MAX_PX))
                                const isLast = i === liveCollectionHistory.length - 1
                                const isHovered = hoveredBar === i
                                return (
                                    <div key={h.month} className="flex-1 flex flex-col items-center gap-1 justify-end">
                                        <span className={`text-[10px] font-bold transition-colors ${isLast ? 'text-cyan-300' : isHovered ? 'text-white' : 'text-slate-400'}`}>
                                            {h.value}%
                                        </span>
                                        {isLast && (
                                            <span className="text-[8px] font-bold text-cyan-400 animate-pulse whitespace-nowrap leading-none">● live</span>
                                        )}
                                        <div
                                            className="w-8 rounded-t-md transition-all duration-200"
                                            style={{
                                                height: `${barPx}px`,
                                                background: isLast
                                                    ? isHovered
                                                        ? 'linear-gradient(180deg, #67e8f9, #06b6d4)'
                                                        : 'linear-gradient(180deg, #22d3ee, #0891b2)'
                                                    : isHovered
                                                        ? 'rgba(6,182,212,0.55)'
                                                        : 'rgba(6,182,212,0.22)',
                                                transform: isHovered ? 'scaleX(1.18)' : 'scaleX(1)',
                                            }}
                                            onMouseEnter={() => setHoveredBar(i)}
                                            onMouseLeave={() => setHoveredBar(null)}
                                        />
                                        <span className={`text-[10px] transition-colors ${isHovered ? 'text-slate-300' : 'text-slate-500'}`}>{h.month}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Expense breakdown */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-white">Répartition des dépenses</h3>
                            <span className="text-[10px] text-slate-500 bg-navy-700 border border-white/5 px-2 py-1 rounded-full">
                                {expenseLog.length > 0 ? 'Dépenses réelles' : 'Budget alloué'}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {liveExpBreakdown.map(e => (
                                <div key={e.category}>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-slate-300 font-medium">{e.category}</span>
                                        <span className="text-slate-400">{e.pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden">
                                        <div className={`h-full ${e.color} rounded-full`} style={{ width: `${e.pct}%` }} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">{e.amount.toLocaleString('fr-FR')} MAD</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Overdue table */}
                {overdue.length > 0 && (
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-white">Charges en retard</h3>
                            <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1.5">
                                <Phone size={12} /> Envoyer rappels WhatsApp
                            </button>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                                    <th className="text-left pb-3 font-semibold">Unité</th>
                                    <th className="text-left pb-3 font-semibold">Résident</th>
                                    <th className="text-left pb-3 font-semibold">Mois dus</th>
                                    <th className="text-left pb-3 font-semibold">Montant</th>
                                    <th className="text-left pb-3 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/4">
                                {overdue.map((o) => (
                                    <tr key={o.id} className="hover:bg-navy-700/40 transition-colors">
                                        <td className="py-3 font-mono text-xs text-sp">{o.unit}</td>
                                        <td className="py-3 text-slate-200">{o.name}</td>
                                        <td className="py-3 text-slate-300">{o.months} mois</td>
                                        <td className="py-3 text-red-400 font-semibold">{o.amount}</td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleMarkPaid(o.id)}
                                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle2 size={11} /> Marquer payé
                                                </button>
                                                <span className="text-slate-700">·</span>
                                                <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="text-[11px] text-sp hover:text-sp-light transition-colors flex items-center gap-1">
                                                    <Mic size={11} /> Appel IA
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </>}
            {/* ── Sub-tab: Recouvrement ──────────────────────────────── */}
            {subTab === 'recouvrement' && <RecouvrementTab building={building} residents={residents} setResidents={setResidents} onRecordPayment={(residentId) => { setRecPayPreset({ residentId }); setShowRecPay(true) }} showToast={showToast} />}

            {/* ── Sub-tab: Dépenses ─────────────────────────────────── */}
            {subTab === 'depenses' && (
                <div className="glass-card p-6 space-y-4">
                    {/* Date range + presets */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs text-slate-400 flex-shrink-0">Du</span>
                            <input type="date" value={expFrom} onChange={e => { setExpFrom(e.target.value); setExpActivePill(null) }}
                                className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                            <span className="text-xs text-slate-400 flex-shrink-0">au</span>
                            <input type="date" value={expTo} onChange={e => { setExpTo(e.target.value); setExpActivePill(null) }}
                                className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                            {[['1M', 1], ['3M', 3], ['6M', 6], ['1an', 12], ['Tout', null]].map(([lbl, n]) => (
                                <button key={lbl} onClick={() => setExpPreset(n, lbl)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${expActivePill === lbl
                                            ? 'bg-sp/20 text-sp border-sp/30'
                                            : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/30 hover:text-sp'
                                        }`}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Header row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-white">Journal des dépenses</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {filteredLog.length} entrées{filteredLog.length !== expenseLog.length && ` / ${expenseLog.length} total`} · {totalExpenseLog.toLocaleString('fr-FR')} MAD
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { exportFinancesCSV(building, residents, filteredLog, data); showToast('Export Excel téléchargé') }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 transition-all">
                                <Download size={12} /> Excel
                            </button>
                            <button onClick={() => exportFinancesPDF(building, residents, filteredLog, data)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-all">
                                <FileText size={12} /> PDF
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                                <th className="text-left pb-3 font-semibold">Date</th>
                                <th className="text-left pb-3 font-semibold">Catégorie</th>
                                <th className="text-left pb-3 font-semibold">Fournisseur</th>
                                <th className="text-left pb-3 font-semibold">Description</th>
                                <th className="text-right pb-3 font-semibold">Montant</th>
                                <th className="text-left pb-3 font-semibold">Facture</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {paginatedLog.length === 0 && (
                                <tr><td colSpan={6} className="py-10 text-center text-slate-500 text-sm">Aucune dépense pour cette période.</td></tr>
                            )}
                            {paginatedLog.map((e) => (
                                <motion.tr key={e.id}
                                    initial={e.isNew ? { opacity: 0, y: -8 } : false}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`hover:bg-navy-700/40 transition-colors ${e.isNew ? 'bg-sp/5' : ''}`}
                                >
                                    <td className="py-3 text-slate-400 text-xs">{e.date}</td>
                                    <td className="py-3 text-xs font-medium text-slate-300">{e.category}</td>
                                    <td className="py-3 text-slate-300 text-xs">{e.vendor}</td>
                                    <td className="py-3 text-slate-500 text-xs max-w-xs truncate">{e.description}</td>
                                    <td className="py-3 text-right font-semibold text-white text-xs">{e.amount.toLocaleString('fr-FR')} MAD</td>
                                    <td className="py-3">
                                        {e.hasInvoice
                                            ? <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold"><FileText size={11} /> Jointe</span>
                                            : <span className="text-[10px] text-slate-600">—</span>}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {expTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-[11px] text-slate-500">
                                Page {expPage} / {expTotalPages} · {filteredLog.length} entrées
                            </span>
                            <div className="flex gap-1">
                                <button disabled={expPage === 1} onClick={() => setExpPage(p => p - 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronLeft size={13} />
                                </button>
                                {getPageNumbers(expPage, expTotalPages).map((n, i) =>
                                    n === '…' ? <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-slate-600 text-xs">…</span>
                                        : <button key={n} onClick={() => setExpPage(n)}
                                            className={`w-7 h-7 rounded-lg text-xs font-semibold border transition-all ${expPage === n ? 'bg-sp/20 text-sp border-sp/30' : 'bg-navy-700 text-slate-400 border-white/8 hover:text-slate-200'}`}>
                                            {n}
                                        </button>
                                )}
                                <button disabled={expPage === expTotalPages} onClick={() => setExpPage(p => p + 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showAddExp && (
                    <AddExpenseModal onClose={() => setShowAddExp(false)} onAdd={handleAddExpense} suppliers={suppliers} />
                )}
                {showRecPay && (
                    <RecordPaymentModal
                        building={building} residents={residents}
                        presetResidentId={recPayPreset?.residentId}
                        onClose={() => { setShowRecPay(false); setRecPayPreset(null) }}
                        onRecord={handleMarkPaid}
                    />
                )}
                {showAppelDF && (
                    <AppelDeFondsModal building={building} residents={residents} onClose={() => setShowAppelDF(false)} showToast={showToast} />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   RECOUVREMENT TAB
══════════════════════════════════════════ */
function exportRecouvrementCSV(building, residents, months) {
    const BOM = '\uFEFF'
    const headers = ['Unité', 'Résident', ...months.map(m => formatMonth(m)), 'Total payé'].join(';')
    const rows = residents.map(r => {
        const cells = months.map(m => {
            const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
            const [ry, rm] = m.split('-').map(Number)
            const [py, pm] = (r.paidThrough || '2000-01').split('-').map(Number)
            const monthIdx = (ry - cy) * 12 + (rm - cm)
            const paidIdx = (py - cy) * 12 + (pm - cm)
            if (monthIdx < 0) return paidIdx >= monthIdx ? 'Payé' : 'Impayé'
            if (monthIdx === 0) return paidIdx >= 0 ? 'Payé' : 'En attente'
            return 'N/A'
        })
        const paidCount = cells.filter(c => c === 'Payé').length
        return [r.unit, r.name, ...cells, `${paidCount}/${months.length}`].join(';')
    })
    const csv = BOM + [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `recouvrement_${building.name}_${CURRENT_MONTH}.csv`; a.click()
    URL.revokeObjectURL(url)
}

function exportRecouvrementPDF(building, residents, months) {
    const logoHTML = buildingLogoHTML(building, 48)
    const rows = residents.map(r => {
        const cells = months.map(m => {
            const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
            const [ry, rm] = m.split('-').map(Number)
            const [py, pm] = (r.paidThrough || '2000-01').split('-').map(Number)
            const monthIdx = (ry - cy) * 12 + (rm - cm)
            const paidIdx = (py - cy) * 12 + (pm - cm)
            let st, color
            if (monthIdx < 0) { st = paidIdx >= monthIdx ? '✓' : '✗'; color = paidIdx >= monthIdx ? '#22c55e' : '#ef4444' }
            else if (monthIdx === 0) { st = paidIdx >= 0 ? '✓' : '⏳'; color = paidIdx >= 0 ? '#22c55e' : '#f59e0b' }
            else { st = '–'; color = '#64748b' }
            return `<td style="text-align:center;color:${color};font-weight:bold">${st}</td>`
        }).join('')
        return `<tr><td style="font-family:monospace;color:#06b6d4">${r.unit}</td><td>${r.name}</td>${cells}</tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recouvrement</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e2e8f0;padding:6px 8px}
    th{background:#f8fafc;font-weight:600;text-align:left}</style></head>
    <body><div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
    ${logoHTML}<div><h2 style="margin:0">Tableau de Recouvrement</h2>
    <p style="margin:4px 0 0;color:#64748b">${building.name} · ${building.city} · ${CURRENT_MONTH}</p></div></div>
    <table><thead><tr><th>Unité</th><th>Résident</th>${months.map(m => `<th>${formatMonth(m)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table></body></html>`
    const win = window.open('', '_blank'); win.document.write(html); win.document.close()
    setTimeout(() => win.print(), 400)
}

function RecouvrementTab({ building, residents, setResidents, onRecordPayment, showToast }) {
    // Date range state — default last 6 months
    const [recFrom, setRecFrom] = useState(() => {
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        let m = cm - 5; let y = cy
        while (m <= 0) { m += 12; y-- }
        return `${y}-${String(m).padStart(2, '0')}`
    })
    const [recTo, setRecTo] = useState(CURRENT_MONTH)

    // Build months array from recFrom → recTo (capped at 36 months)
    const months = (() => {
        const result = []
        let [y, m] = recFrom.split('-').map(Number)
        const [ty, tm] = recTo.split('-').map(Number)
        while ((y < ty || (y === ty && m <= tm)) && result.length < 36) {
            result.push(`${y}-${String(m).padStart(2, '0')}`)
            m++; if (m > 12) { m = 1; y++ }
        }
        return result
    })()

    const [recActivePill, setRecActivePill] = useState('6M')   // tracks active preset pill

    function setPreset(n, lbl) {
        setRecActivePill(lbl)
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        let fm = cm - (n - 1); let fy = cy
        while (fm <= 0) { fm += 12; fy-- }
        setRecFrom(`${fy}-${String(fm).padStart(2, '0')}`)
        setRecTo(CURRENT_MONTH)
    }

    const [recActiveFilters, setRecActiveFilters] = useState([])
    function handleRecCardClick(e, status) {
        if (e.ctrlKey || e.metaKey) {
            setRecActiveFilters(prev =>
                prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
            )
        } else {
            setRecActiveFilters(prev =>
                prev.length === 1 && prev[0] === status ? [] : [status]
            )
        }
    }
    useEffect(() => { setRecPage(1) }, [recActiveFilters])

    const buildingFee = building.monthly_fee || 850
    const rFee = (r) => r.monthly_fee ?? buildingFee

    const paid = residents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const pending = residents.filter(r => computeStatus(r.paidThrough) === 'pending').length
    const overdue = residents.filter(r => computeStatus(r.paidThrough) === 'overdue').length
    const rate = residents.length ? Math.round((paid / residents.length) * 100) : 0
    const amountPaid = residents.filter(r => computeStatus(r.paidThrough) === 'paid').reduce((s, r) => s + rFee(r), 0)
    const amountPending = residents.filter(r => computeStatus(r.paidThrough) === 'pending').reduce((s, r) => s + getUnpaidMonthsCount(r.paidThrough) * rFee(r), 0)
    const amountOverdue = residents.filter(r => computeStatus(r.paidThrough) === 'overdue').reduce((s, r) => s + getUnpaidMonthsCount(r.paidThrough) * rFee(r), 0)

    function cellStatus(r, m) {
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        const [ry, rm] = m.split('-').map(Number)
        const [py, pm] = (r.paidThrough || '2000-01').split('-').map(Number)
        const monthIdx = (ry - cy) * 12 + (rm - cm)
        const paidIdx = (py - cy) * 12 + (pm - cm)
        if (monthIdx < 0) return paidIdx >= monthIdx ? 'paid' : 'overdue'
        if (monthIdx === 0) return paidIdx >= 0 ? 'paid' : 'pending'
        return 'future'
    }

    // Residents pagination — respects recActiveFilters
    const [recPage, setRecPage] = useState(1)
    const REC_PER_PAGE = 15
    const filteredResidents = recActiveFilters.length === 0
        ? residents
        : residents.filter(r => recActiveFilters.includes(computeStatus(r.paidThrough)))
    const recTotalPages = Math.max(1, Math.ceil(filteredResidents.length / REC_PER_PAGE))
    const paginatedResidents = filteredResidents.slice((recPage - 1) * REC_PER_PAGE, recPage * REC_PER_PAGE)

    return (
        <div className="space-y-5">
            {/* Stats — clickable filter cards (Ctrl+clic = multi-select) */}
            <div className="grid grid-cols-4 gap-4">
                {/* Taux / Tous */}
                <button
                    onClick={() => setRecActiveFilters([])}
                    className={`glass-card p-4 text-left transition-all rounded-2xl border ${recActiveFilters.length === 0 ? 'border-sp/50 ring-1 ring-sp/30' : 'border-white/5 hover:border-white/15'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">Taux de recouvrement</p>
                        {recActiveFilters.length === 0 && <span className="text-[10px] bg-sp/20 text-sp px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-sp">{rate}%</div>
                    <p className="text-[11px] text-slate-500 mt-1">{residents.length} résidents · {building.name}</p>
                </button>
                {/* Payés */}
                <button
                    onClick={e => handleRecCardClick(e, 'paid')}
                    className={`glass-card p-4 text-left transition-all rounded-2xl border ${recActiveFilters.includes('paid') ? 'border-emerald-500/50 ring-1 ring-emerald-500/25' : 'border-white/5 hover:border-emerald-500/25'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">Unités à jour</p>
                        {recActiveFilters.includes('paid') && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{paid}</div>
                    <p className="text-[11px] text-emerald-500/70 mt-1 font-semibold">{amountPaid.toLocaleString('fr-FR')} MAD encaissés</p>
                </button>
                {/* En attente */}
                <button
                    onClick={e => handleRecCardClick(e, 'pending')}
                    className={`glass-card p-4 text-left transition-all rounded-2xl border ${recActiveFilters.includes('pending') ? 'border-amber-500/50 ring-1 ring-amber-500/25' : 'border-white/5 hover:border-amber-500/25'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">En attente</p>
                        {recActiveFilters.includes('pending') && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{pending}</div>
                    <p className="text-[11px] text-amber-500/70 mt-1 font-semibold">{amountPending.toLocaleString('fr-FR')} MAD dus</p>
                </button>
                {/* En retard */}
                <button
                    onClick={e => handleRecCardClick(e, 'overdue')}
                    className={`glass-card p-4 text-left transition-all rounded-2xl border ${recActiveFilters.includes('overdue') ? 'border-red-500/50 ring-1 ring-red-500/25' : 'border-white/5 hover:border-red-500/25'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">En retard</p>
                        {recActiveFilters.includes('overdue') && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-red-400">{overdue}</div>
                    <p className="text-[11px] text-red-500/70 mt-1 font-semibold">{amountOverdue.toLocaleString('fr-FR')} MAD dus</p>
                </button>
            </div>
            <p className="text-[10px] text-slate-600 -mt-3">Ctrl+clic pour sélectionner plusieurs statuts</p>

            {/* Date range controls */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-slate-400 flex-shrink-0">De</span>
                    <input type="month" value={recFrom} onChange={e => { setRecFrom(e.target.value); setRecActivePill(null) }}
                        max={recTo}
                        className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    <span className="text-xs text-slate-400 flex-shrink-0">à</span>
                    <input type="month" value={recTo} onChange={e => { setRecTo(e.target.value); setRecActivePill(null) }}
                        min={recFrom}
                        className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    {[[3, '3M'], [6, '6M'], [12, '12M'], [24, '24M']].map(([n, lbl]) => (
                        <button key={lbl} onClick={() => setPreset(n, lbl)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${recActivePill === lbl
                                    ? 'bg-sp/20 text-sp border-sp/30'
                                    : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/30 hover:text-sp'
                                }`}>
                            {lbl}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 ml-auto">
                    <button onClick={() => { exportRecouvrementCSV(building, residents, months); showToast('Export recouvrement téléchargé') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 transition-all">
                        <Download size={12} /> Excel
                    </button>
                    <button onClick={() => exportRecouvrementPDF(building, residents, months)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-all">
                        <FileText size={12} /> PDF
                    </button>
                </div>
            </div>

            {/* Matrix */}
            <div className="glass-card overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                            <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#111d35]">Unité</th>
                            <th className="text-left px-4 py-3 font-semibold sticky left-16 bg-[#111d35]">Résident</th>
                            {months.map(m => (
                                <th key={m} className="px-3 py-3 font-semibold text-center whitespace-nowrap">{formatMonth(m)}</th>
                            ))}
                            <th className="px-4 py-3 font-semibold text-center">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                        {paginatedResidents.map(r => {
                            const statuses = months.map(m => cellStatus(r, m))
                            const paidCount = statuses.filter(s => s === 'paid').length
                            return (
                                <tr key={r.id} className="hover:bg-navy-700/40 transition-colors">
                                    <td className="px-4 py-3 font-mono text-sp font-semibold sticky left-0 bg-[#111d35]">{r.unit}</td>
                                    <td className="px-4 py-3 text-slate-200 sticky left-16 bg-[#111d35] whitespace-nowrap">{r.name}</td>
                                    {statuses.map((st, i) => (
                                        <td key={i} className="px-3 py-3 text-center">
                                            {st === 'future' ? (
                                                <span className="text-slate-600">—</span>
                                            ) : (
                                                <button
                                                    onClick={() => st !== 'paid' && onRecordPayment(r.id)}
                                                    title={st !== 'paid' ? 'Cliquer pour enregistrer un paiement' : ''}
                                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold transition-all ${st === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                                            st === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/30 cursor-pointer' :
                                                                'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/30 cursor-pointer'
                                                        }`}
                                                >
                                                    {st === 'paid' ? '✓' : st === 'pending' ? '⏳' : '✗'}
                                                </button>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs font-bold ${paidCount === months.length ? 'text-emerald-400' : paidCount === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                            {paidCount}/{months.length}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {residents.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm">Aucun résident</div>
                )}
                <div className="px-4 py-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500/15 border border-emerald-500/20 inline-flex items-center justify-center text-emerald-400 font-bold">✓</span> Payé</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-500/15 border border-amber-500/20 inline-flex items-center justify-center text-amber-400">⏳</span> En attente</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500/15 border border-red-500/20 inline-flex items-center justify-center text-red-400 font-bold">✗</span> En retard</span>
                    </div>
                    {recTotalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">Page {recPage} / {recTotalPages}</span>
                            <div className="flex gap-1">
                                <button disabled={recPage === 1} onClick={() => setRecPage(p => p - 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronLeft size={13} />
                                </button>
                                {getPageNumbers(recPage, recTotalPages).map((n, i) =>
                                    n === '…' ? <span key={`r${i}`} className="w-7 h-7 flex items-center justify-center text-slate-600 text-xs">…</span>
                                        : <button key={n} onClick={() => setRecPage(n)}
                                            className={`w-7 h-7 rounded-lg text-xs font-semibold border transition-all ${recPage === n ? 'bg-sp/20 text-sp border-sp/30' : 'bg-navy-700 text-slate-400 border-white/8 hover:text-slate-200'}`}>
                                            {n}
                                        </button>
                                )}
                                <button disabled={recPage === recTotalPages} onClick={() => setRecPage(p => p + 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════
   APPEL DE FONDS MODAL
══════════════════════════════════════════ */
function generateAppelDeFondsDoc(building, residents, period, dueDate) {
    const logoHTML = buildingLogoHTML(building, 56)
    const [py, pm] = period.split('-').map(Number)
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    const periodLabel = `${monthNames[pm - 1]} ${py}`
    const rows = residents.map(r => {
        const st = computeStatus(r.paidThrough)
        const statusLabel = st === 'paid' ? 'À jour' : st === 'pending' ? 'En attente' : 'En retard'
        const statusColor = st === 'paid' ? '#22c55e' : st === 'pending' ? '#f59e0b' : '#ef4444'
        const quota = r.quota ?? '—'
        return `<tr>
            <td style="font-family:monospace;color:#0891b2">${r.unit}</td>
            <td>${r.name}</td>
            <td style="text-align:right">${typeof quota === 'number' ? quota.toLocaleString('fr-FR') + ' MAD' : '—'}</td>
            <td style="color:${statusColor};font-weight:600">${statusLabel}</td>
        </tr>`
    }).join('')
    const total = residents.reduce((s, r) => s + (r.quota ?? 0), 0)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Appel de fonds — ${building.name}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#1e293b;max-width:800px;margin:0 auto}
        h1{font-size:20px;margin:0}h2{font-size:14px;color:#64748b;font-weight:400;margin:4px 0 0}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
        th{background:#f1f5f9;padding:8px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0}
        td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
        .total{font-weight:700;background:#f8fafc}
        .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
        .sig{margin-top:60px;display:flex;gap:80px}
        .sig-block{text-align:center;font-size:11px;color:#64748b}
        .sig-line{width:160px;border-top:1px solid #1e293b;margin-bottom:8px}
        @media print{body{padding:20px}.no-print{display:none!important}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px">
        ${logoHTML}
        <div>
            <h1>APPEL DE FONDS</h1>
            <h2>${building.name} · ${building.city}</h2>
            <p style="font-size:12px;color:#475569;margin:6px 0 0">
                Période : <strong>${periodLabel}</strong> · Échéance : <strong>${dueDate || '—'}</strong>
            </p>
        </div>
    </div>
    <p style="font-size:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:10px 14px;color:#0369a1">
        Conformément aux dispositions de la Loi 18-00, vous êtes priés de régler votre quote-part de charges
        de copropriété pour la période de <strong>${periodLabel}</strong> avant le <strong>${dueDate || 'la date indiquée'}</strong>.
    </p>
    <table>
        <thead><tr><th>Unité</th><th>Copropriétaire</th><th style="text-align:right">Quote-part</th><th>Statut</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total"><td colspan="2" style="font-weight:700">Total à collecter</td>
            <td style="text-align:right;font-weight:700">${total.toLocaleString('fr-FR')} MAD</td><td></td></tr></tfoot>
    </table>
    <div class="sig">
        <div class="sig-block">${building.cachet ? `<img src="${building.cachet}" style="height:70px;width:auto;max-width:110px;object-fit:contain;opacity:0.88;display:block;margin-bottom:6px;" alt="cachet"/>` : ''}<div class="sig-line"></div>Le Syndic</div>
    </div>
    <div class="footer">
        <span>Généré par SyndicPulse · ${new Date().toLocaleDateString('fr-FR')}</span>
        <span>${building.name} · ${building.address ?? ''}</span>
    </div>
    </body></html>`
    const win = window.open('', '_blank'); win.document.write(html); win.document.close()
    setTimeout(() => win.print(), 400)
}

function AppelDeFondsModal({ building, residents, onClose, showToast }) {
    const [step, setStep] = useState(1)
    const [period, setPeriod] = useState(CURRENT_MONTH)
    const [dueDate, setDueDate] = useState(() => {
        const [y, m] = CURRENT_MONTH.split('-').map(Number)
        const nd = m === 12 ? `${y + 1}-01-15` : `${y}-${String(m + 1).padStart(2, '0')}-15`
        return nd
    })
    const [wacopied, setWaCopied] = useState(false)

    const unpaid = residents.filter(r => computeStatus(r.paidThrough) !== 'paid')
    const total = residents.reduce((s, r) => s + (r.quota ?? 0), 0)

    function buildWAText() {
        const [py, pm] = period.split('-').map(Number)
        const mNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
        return `📢 *APPEL DE FONDS — ${building.name}*\n\nPériode : ${mNames[pm - 1]}. ${py}\nÉchéance : ${dueDate || '—'}\n\nMerci de régler votre quote-part de charges avant la date limite.\n\n${unpaid.length} unité(s) en attente de règlement.\n\n_Syndic ${building.name}_`
    }

    function copyWA() {
        navigator.clipboard.writeText(buildWAText())
        setWaCopied(true); setTimeout(() => setWaCopied(false), 2500)
        showToast('Message WhatsApp copié')
    }

    return (
        <Modal title="Appel de fonds" subtitle={`${building.name} · générer et envoyer`} onClose={onClose} width="max-w-2xl">
            {step === 1 && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Période *</label>
                            <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date d'échéance</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                    </div>
                    <div className="bg-navy-700 rounded-xl p-4 border border-white/8 space-y-2">
                        <p className="text-xs font-semibold text-slate-400">Résumé</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div><p className="text-lg font-bold text-white">{residents.length}</p><p className="text-[11px] text-slate-500">Unités</p></div>
                            <div><p className="text-lg font-bold text-amber-400">{unpaid.length}</p><p className="text-[11px] text-slate-500">En attente</p></div>
                            <div><p className="text-lg font-bold text-sp">{total.toLocaleString('fr-FR')} MAD</p><p className="text-[11px] text-slate-500">Total attendu</p></div>
                        </div>
                    </div>
                    <button onClick={() => setStep(2)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-navy-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                        <Banknote size={15} /> Générer l'appel de fonds
                    </button>
                </div>
            )}
            {step === 2 && (
                <div className="space-y-5">
                    <div className="rounded-xl border border-white/8 overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0">
                                <tr className="bg-navy-700 text-[10px] text-slate-500 uppercase tracking-wider">
                                    {['Unité', 'Résident', 'Quote-part', 'Statut'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {residents.map(r => {
                                    const st = computeStatus(r.paidThrough)
                                    return (
                                        <tr key={r.id} className="hover:bg-navy-700/40">
                                            <td className="px-3 py-2.5 font-mono text-sp">{r.unit}</td>
                                            <td className="px-3 py-2.5 text-slate-200">{r.name}</td>
                                            <td className="px-3 py-2.5 text-slate-300">{r.quota ? `${r.quota.toLocaleString('fr-FR')} MAD` : '—'}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st === 'paid' ? 'bg-emerald-500/15 text-emerald-400' :
                                                        st === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                                                            'bg-red-500/15 text-red-400'}`}>
                                                    {st === 'paid' ? 'À jour' : st === 'pending' ? 'En attente' : 'En retard'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => generateAppelDeFondsDoc(building, residents, period, dueDate)}
                            className="flex-1 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            <FileText size={14} /> Imprimer / PDF
                        </button>
                        <button onClick={copyWA}
                            className="flex-1 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            {wacopied ? <><Check size={14} /> Copié !</> : <><MessageCircle size={14} /> Message WhatsApp</>}
                        </button>
                    </div>
                    <button onClick={() => setStep(1)} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">← Modifier la période</button>
                </div>
            )}
        </Modal>
    )
}

/* ══════════════════════════════════════════
   FOURNISSEURS PAGE
══════════════════════════════════════════ */
const SUPPLIER_CATS = [
    { key: 'ascenseur', label: 'Ascenseur', color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
    { key: 'nettoyage', label: 'Nettoyage', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
    { key: 'electricite', label: 'Électricité', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    { key: 'plomberie', label: 'Plomberie', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    { key: 'gardiennage', label: 'Gardiennage', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    { key: 'peinture', label: 'Peinture', color: 'bg-pink-500/15 text-pink-400 border-pink-500/20' },
    { key: 'espaces_verts', label: 'Espaces verts', color: 'bg-lime-500/15 text-lime-400 border-lime-500/20' },
    { key: 'autre', label: 'Autre', color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
]
function catInfo(key) { return SUPPLIER_CATS.find(c => c.key === key) ?? SUPPLIER_CATS[7] }

function StarRating({ value, onChange, size = 16 }) {
    const [hover, setHover] = useState(0)
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                    onClick={() => onChange?.(n)}
                    onMouseEnter={() => onChange && setHover(n)}
                    onMouseLeave={() => onChange && setHover(0)}
                    className={`transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <Star size={size} className={`transition-colors ${n <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                        }`} />
                </button>
            ))}
        </div>
    )
}

/* ════════════════════════════════════
   CIRCULAIRES PAGE
════════════════════════════════════ */
function CirculairesPage({ building, circulaires, setCirculaires, customTpls = [], setCustomTpls, showToast }) {
    const [showAdd, setShowAdd] = useState(false)
    const [showManageTpls, setShowManageTpls] = useState(false)
    const [editingCirc, setEditingCirc] = useState(null)

    const allTemplates = [...CIRCULAIRE_TEMPLATES, ...customTpls]

    const MONTHS_S = ['Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
    const fmtDate = (iso) => {
        if (!iso) return '—'
        const d = new Date(iso)
        return `${d.getDate()} ${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`
    }

    function handleAdd(circ) {
        setCirculaires(prev => {
            const next = [circ, ...prev]
            if (circ.template === 'objet_trouve') {
                const objets = next.filter(c => c.template === 'objet_trouve')
                if (objets.length > 200) {
                    const oldestId = objets[objets.length - 1].id
                    return next.filter(c => c.id !== oldestId)
                }
            }
            return next
        })
        showToast('Circulaire enregistrée', 'success')
    }
    function handleDelete(id) {
        setCirculaires(prev => prev.filter(c => c.id !== id))
        showToast('Circulaire supprimée', 'success')
    }
    function handleMarkSent(id) {
        setCirculaires(prev => prev.map(c => c.id === id ? { ...c, diffuse: true } : c))
        showToast('Marqué comme diffusé', 'success')
    }
    function handleCopyWA(circ) {
        const tpl = allTemplates.find(t => t.key === circ.template)
        const msg = tpl?.isCustom
            ? buildCustomMessage(tpl, circ.vars, building.name)
            : buildCirculaireMessage(circ.template, circ.vars, building.name)
        navigator.clipboard.writeText(msg).then(() =>
            showToast('Message copié — collez-le dans WhatsApp Broadcast', 'success'))
    }
    function handlePrint(circ) {
        const tpl = allTemplates.find(t => t.key === circ.template)
        const msgOverride = tpl?.isCustom ? buildCustomMessage(tpl, circ.vars, building.name) : undefined
        generateCirculaireDoc(building, circ, msgOverride)
    }
    function handleEditCirc(updated) {
        setCirculaires(prev => prev.map(c => c.id === updated.id ? updated : c))
        showToast('Circulaire modifiée', 'success')
        setEditingCirc(null)
    }
    function handleReclame(id) {
        setCirculaires(prev => prev.map(c =>
            c.id === id ? { ...c, status: 'réclamé', reclameAt: new Date().toISOString() } : c
        ))
        showToast('Réclamé — Pensez à sauvegarder la photo localement avant suppression automatique', 'warning')
    }
    function daysUntilDelete(reclameAt) {
        if (!reclameAt) return null
        const elapsed = Math.floor((Date.now() - new Date(reclameAt).getTime()) / 86400000)
        return Math.max(0, 14 - elapsed)
    }

    const thisMonth = new Date().toISOString().slice(0, 7)
    const countThisMonth = circulaires.filter(c => c.createdAt?.startsWith(thisMonth)).length
    const countDiffuses = circulaires.filter(c => c.diffuse).length
    const countObjets = circulaires.filter(c => c.template === 'objet_trouve').length

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Circulaires & Avis</h2>
                    <p className="text-xs text-slate-400 mt-1">Rédigez et diffusez les avis aux résidents en quelques clics</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowManageTpls(true)}
                        className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 border border-white/10 text-slate-300 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <Settings size={14} /> Modèles
                    </button>
                    <button onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        <Megaphone size={15} /> Nouvel avis
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Ce mois-ci', val: countThisMonth, color: 'text-cyan-400' },
                    { label: 'Diffusés', val: countDiffuses, color: 'text-emerald-400' },
                    { label: 'Objets trouvés', val: countObjets, color: 'text-orange-400' },
                    { label: 'Total archivés', val: circulaires.length, color: 'text-slate-300' },
                ].map(s => (
                    <StatCard key={s.label} className="glass-card p-4">
                        <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                    </StatCard>
                ))}
            </div>

            {/* Quick-launch templates */}
            <div className="glass-card p-5">
                <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-4">Lancement rapide</p>
                <div className="grid grid-cols-3 gap-3">
                    {CIRCULAIRE_TEMPLATES.map(t => (
                        <button key={t.key} onClick={() => setShowAdd({ defaultTemplate: t.key })}
                            className="flex items-center gap-3 p-3 rounded-xl bg-navy-700/60 border border-white/8 hover:border-white/20 hover:bg-navy-700 transition-all text-left">
                            <span className="text-xl flex-shrink-0">{t.icon}</span>
                            <span className="text-sm font-medium text-slate-200 leading-tight">{t.label}</span>
                        </button>
                    ))}
                    {customTpls.map(t => (
                        <button key={t.key} onClick={() => setShowAdd({ defaultTemplate: t.key })}
                            className="flex items-center gap-3 p-3 rounded-xl bg-navy-700/60 border border-white/8 hover:border-white/20 hover:bg-navy-700 transition-all text-left relative">
                            <span className="text-xl flex-shrink-0">{t.icon}</span>
                            <span className="text-sm font-medium text-slate-200 leading-tight">{t.label}</span>
                            <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full">Custom</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Objets trouvés — table opérationnelle */}
            {(() => {
                const objetsTrouves = circulaires
                    .filter(c => c.template === 'objet_trouve')
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                return (
                    <div className="glass-card overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="text-lg">🔍</span>
                                <p className="text-sm font-semibold text-white">Objets trouvés</p>
                                <span className="text-[10px] text-slate-500">{objetsTrouves.length} / 200</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-500 italic">📷 Photos : prochaine version</span>
                                <button onClick={() => setShowAdd({ defaultTemplate: 'objet_trouve' })}
                                    className="flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 text-orange-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                    <Plus size={12} /> Signaler un objet
                                </button>
                            </div>
                        </div>
                        {objetsTrouves.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-2xl mb-2">🔍</p>
                                <p className="text-sm text-slate-400">Aucun objet enregistré</p>
                                <p className="text-xs text-slate-500 mt-1">Les objets trouvés dans la résidence apparaîtront ici</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {objetsTrouves.map(circ => {
                                    const v = circ.vars
                                    const remaining = daysUntilDelete(circ.reclameAt)
                                    const isArchived = circ.status === 'réclamé' && remaining === 0
                                    return (
                                        <div key={circ.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-navy-700/30 transition-colors">
                                            <span className="text-xl flex-shrink-0">🔍</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{v.objet || '—'}</p>
                                                <p className="text-xs text-slate-400 truncate">{[v.lieu, v.date ? fmtDate(v.date) : null].filter(Boolean).join(' · ')}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {circ.status === 'en_attente' || !circ.status ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">En attente</span>
                                                ) : isArchived ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 border border-white/8">Archivé</span>
                                                ) : (
                                                    <>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Réclamé</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">⏳ {remaining}j</span>
                                                    </>
                                                )}
                                                {(!circ.status || circ.status === 'en_attente') && (
                                                    <button onClick={() => handleReclame(circ.id)}
                                                        title="Marquer comme réclamé"
                                                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors">
                                                        ✓ Réclamé
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(circ.id)} title="Supprimer"
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-white/8 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* History */}
            {circulaires.filter(c => c.template !== 'objet_trouve').length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-5xl mb-4">📢</div>
                    <p className="text-slate-400 text-sm">Aucune circulaire pour l'instant.</p>
                    <p className="text-slate-500 text-xs mt-2">Cliquez "Nouvel avis" pour rédiger votre premier avis.</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-white/5">
                        <p className="text-sm font-semibold text-white">Historique ({circulaires.filter(c => c.template !== 'objet_trouve').length})</p>
                    </div>
                    <div className="divide-y divide-white/5">
                        {circulaires.filter(c => c.template !== 'objet_trouve').map(circ => {
                            const tmpl = allTemplates.find(t => t.key === circ.template) ?? { icon: '📝', label: 'Avis' }
                            const summary = (() => {
                                const v = circ.vars
                                switch (circ.template) {
                                    case 'coupure_eau':  return v.raison ?? (v.date ? `Le ${fmtDate(v.date)}` : '—')
                                    case 'coupure_elec': return v.raison ?? (v.date ? `Le ${fmtDate(v.date)}` : '—')
                                    case 'travaux':      return [v.zone, v.raison].filter(Boolean).join(' · ') || '—'
                                    case 'rappel_ag':    return [v.lieu, v.date ? fmtDate(v.date) : null].filter(Boolean).join(' · ') || '—'
                                    case 'proprete':     return v.sujet ?? '—'
                                    case 'objet_trouve': return [v.objet, v.lieu].filter(Boolean).join(' · ') || '—'
                                    case 'avis_libre':   return v.titre ?? v.contenu?.slice(0, 70) ?? '—'
                                    default: {
                                        const firstField = tmpl.fields?.find(f => (f.type === 'text' || f.type === 'textarea') && v[f.key])
                                        return (firstField ? v[firstField.key]?.slice(0, 70) : null) ?? v.titre ?? v.raison ?? v.sujet ?? v.zone ?? v.contenu?.slice(0, 70) ?? '—'
                                    }
                                }
                            })()
                            return (
                                <div key={circ.id} className="flex items-center gap-4 px-5 py-4 hover:bg-navy-700/30 transition-colors">
                                    <span className="text-2xl flex-shrink-0">{tmpl.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-semibold text-white">{tmpl.label}</span>
                                            {circ.diffuse && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Diffusé</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">{summary}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{fmtDate(circ.createdAt)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button onClick={() => handlePrint(circ)} title="Imprimer / PDF"
                                            className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-navy-600 text-slate-400 hover:text-white border border-white/8 transition-colors">
                                            <FileText size={13} />
                                        </button>
                                        <button onClick={() => handleCopyWA(circ)} title="Copier message WhatsApp"
                                            className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/8 transition-colors">
                                            <Copy size={13} />
                                        </button>
                                        {!circ.diffuse && (
                                            <button onClick={() => handleMarkSent(circ.id)} title="Marquer comme diffusé"
                                                className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/8 transition-colors">
                                                <Check size={13} />
                                            </button>
                                        )}
                                        <button onClick={() => setEditingCirc(circ)} title="Modifier"
                                            className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 border border-white/8 transition-colors">
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={() => handleDelete(circ.id)} title="Supprimer"
                                            className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/8 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {showAdd && (
                <AddCirculaireModal
                    building={building}
                    defaultTemplate={typeof showAdd === 'object' ? showAdd.defaultTemplate : undefined}
                    customTpls={customTpls}
                    onClose={() => setShowAdd(false)}
                    onAdd={handleAdd}
                    showToast={showToast}
                />
            )}
            {editingCirc && (
                <AddCirculaireModal
                    building={building}
                    editCirculaire={editingCirc}
                    customTpls={customTpls}
                    onClose={() => setEditingCirc(null)}
                    onAdd={handleAdd}
                    onEdit={handleEditCirc}
                    showToast={showToast}
                />
            )}
            {showManageTpls && (
                <ManageCustomTemplatesModal
                    customTpls={customTpls}
                    setCustomTpls={setCustomTpls}
                    onClose={() => setShowManageTpls(false)}
                    showToast={showToast}
                />
            )}
        </div>
    )
}

function AddCirculaireModal({ building, defaultTemplate, editCirculaire, customTpls = [], onClose, onAdd, onEdit, showToast }) {
    const ec = editCirculaire
    const [step, setStep] = useState(ec ? 2 : defaultTemplate ? 2 : 1)
    const [selectedTemplate, setSelectedTemplate] = useState(ec?.template ?? defaultTemplate ?? null)
    const [vars, setVars] = useState(ec?.vars ?? {})
    const [preview, setPreview] = useState(false)
    const [copied, setCopied] = useState(false)

    const allTpls = [...CIRCULAIRE_TEMPLATES, ...customTpls]
    const tmpl = allTpls.find(t => t.key === selectedTemplate)

    useEffect(() => {
        if (tmpl && !ec) {
            const defaults = {}
            tmpl.fields.forEach(f => { if (f.default) defaults[f.key] = f.default })
            setVars(defaults)
        }
    }, [selectedTemplate])

    const msgText = tmpl?.isCustom
        ? buildCustomMessage(tmpl, vars, building.name)
        : selectedTemplate ? buildCirculaireMessage(selectedTemplate, vars, building.name) : ''

    function handleSave() {
        const missing = tmpl?.fields.filter(f => f.required && !vars[f.key]) ?? []
        if (missing.length > 0) { showToast(`Champ requis : ${missing[0].label}`, 'error'); return }
        if (ec) {
            onEdit({ ...ec, vars })
        } else {
            onAdd({
                id: `circ-${Date.now()}`,
                template: selectedTemplate,
                vars,
                createdAt: new Date().toISOString(),
                diffuse: false,
                ...(selectedTemplate === 'objet_trouve' ? { status: 'en_attente', reclameAt: null } : {}),
            })
        }
        onClose()
    }

    function copyToClipboard() {
        navigator.clipboard.writeText(msgText).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        })
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1629] border border-white/12 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                            <Megaphone size={15} className="text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{ec ? 'Modifier la circulaire' : 'Nouvel avis'}</p>
                            <p className="text-xs text-slate-400">{step === 1 ? 'Choisir un template' : `${tmpl?.icon ?? ''} ${tmpl?.label ?? ''}`}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-navy-700 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                <div className="p-5">
                    {/* STEP 1 — Template picker */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {CIRCULAIRE_TEMPLATES.map(t => (
                                    <button key={t.key}
                                        onClick={() => { setSelectedTemplate(t.key); setStep(2) }}
                                        className="flex items-start gap-4 p-4 rounded-xl bg-navy-700/60 border border-white/8 hover:border-white/25 hover:bg-navy-700 transition-all text-left">
                                        <span className="text-2xl flex-shrink-0 mt-0.5">{t.icon}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t.label}</p>
                                            <p className="text-xs text-slate-500 mt-1">{t.fields.map(f => f.label).join(' · ')}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {customTpls.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Modèles personnalisés</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {customTpls.map(t => (
                                            <button key={t.key}
                                                onClick={() => { setSelectedTemplate(t.key); setStep(2) }}
                                                className="flex items-start gap-4 p-4 rounded-xl bg-violet-500/8 border border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/15 transition-all text-left">
                                                <span className="text-2xl flex-shrink-0 mt-0.5">{t.icon}</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{t.label}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{t.fields.map(f => f.label).join(' · ') || 'Modèle libre'}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2 — Fill form */}
                    {step === 2 && tmpl && (
                        <div className="space-y-4">
                            {/* Back + template label */}
                            {!defaultTemplate && (
                                <button onClick={() => { setStep(1); setSelectedTemplate(null); setVars({}) }}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors mb-2">
                                    ← Changer de template
                                </button>
                            )}

                            {/* Dynamic fields */}
                            {tmpl.fields.map(field => (
                                <div key={field.key}>
                                    <label className="block text-xs text-slate-400 mb-1.5">
                                        {field.label} {field.required && <span className="text-red-400">*</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={vars[field.key] ?? ''}
                                            onChange={e => setVars(v => ({ ...v, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder ?? ''}
                                            rows={3}
                                            className="w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                                        />
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={vars[field.key] ?? ''}
                                            onChange={e => setVars(v => ({ ...v, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder ?? ''}
                                            className="w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                                        />
                                    )}
                                </div>
                            ))}

                            {/* Photo field — objet trouvé only — coming soon */}
                            {selectedTemplate === 'objet_trouve' && (
                                <div className="rounded-xl bg-navy-700/40 border border-dashed border-white/12 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-semibold text-slate-300">Photo de l'objet</p>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">Prochaine version</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-2 py-5 opacity-40 cursor-not-allowed select-none">
                                        <Camera size={24} className="text-slate-400" />
                                        <p className="text-xs text-slate-400">Joindre une photo de l'objet trouvé</p>
                                        <p className="text-[10px] text-slate-500">Inclus dans la mise à niveau vers le module complet</p>
                                    </div>
                                </div>
                            )}

                            {/* Preview toggle */}
                            <button onClick={() => setPreview(p => !p)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                {preview ? '▼ Masquer l\'aperçu' : '▶ Aperçu du message généré'}
                            </button>
                            {preview && (
                                <div className="bg-black/30 border border-white/8 rounded-xl p-4">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Aperçu message</p>
                                    <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">{msgText}</pre>
                                </div>
                            )}

                            {/* WhatsApp how-to */}
                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-xs text-slate-400">
                                <p className="text-emerald-400 font-semibold mb-1">📱 Comment diffuser sur WhatsApp ?</p>
                                <p>1. Copiez le message ci-dessous → 2. Ouvrez WhatsApp → Nouvelle liste de diffusion → collez le message → envoyez à tous les résidents en une seule fois.</p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => generateCirculaireDoc(building, { template: selectedTemplate, vars, createdAt: new Date().toISOString() }, tmpl?.isCustom ? msgText : undefined)}
                                    className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-navy-700/60 border border-white/12 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white transition-colors">
                                    <FileText size={14} /> Imprimer / PDF
                                </button>
                                <button onClick={copyToClipboard}
                                    className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                                    <Copy size={14} /> {copied ? 'Copié !' : 'Copier message WA'}
                                </button>
                            </div>
                            <button onClick={handleSave}
                                className="w-full py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/25 transition-colors">
                                {ec ? 'Enregistrer les modifications' : 'Enregistrer dans les archives'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════════════
   CUSTOM TEMPLATE MODALS
══════════════════════════════════════════════════════════════════════ */
const CUSTOM_TPL_ICONS = ['📢', '🔔', '📋', '🏛️', '🔧', '💬', '⚠️', '🗓️', '📌', '🏠', '🚿', '⚡', '🧹', '📝', '🔑', '🚗']
const CUSTOM_TPL_COLORS = ['#06b6d4', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#22c55e']
const FIELD_TYPES = [
    { value: 'text', label: 'Texte court' },
    { value: 'textarea', label: 'Texte long' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Heure' },
    { value: 'number', label: 'Nombre' },
]

function toFieldKey(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30)
}

function CustomTemplateEditorModal({ tpl, onSave, onDelete, onClose, showToast }) {
    const isEdit = !!tpl?.id
    const [form, setForm] = useState({
        label:           tpl?.label           ?? '',
        icon:            tpl?.icon            ?? '📢',
        color:           tpl?.color           ?? '#06b6d4',
        messageTemplate: tpl?.messageTemplate ?? 'Chers résidents de {{building}},\n\n{{contenu}}\n\nCordialement,\nLe Bureau du Syndic',
        fields:          tpl?.fields          ?? [{ key: 'contenu', label: 'Contenu', type: 'textarea', required: true, placeholder: 'Rédigez votre message ici...' }],
    })
    const [confirmSave, setConfirmSave] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function addField() {
        setForm(f => ({ ...f, fields: [...f.fields, { key: '', label: '', type: 'text', required: false, placeholder: '' }] }))
    }
    function removeField(i) {
        setForm(f => ({ ...f, fields: f.fields.filter((_, idx) => idx !== i) }))
    }
    function updateField(i, k, v) {
        setForm(f => {
            const fields = f.fields.map((fld, idx) => {
                if (idx !== i) return fld
                const updated = { ...fld, [k]: v }
                if (k === 'label' && !fld._keyManual) updated.key = toFieldKey(v)
                return updated
            })
            return { ...f, fields }
        })
    }
    function setFieldKeyManual(i, v) {
        setForm(f => {
            const fields = f.fields.map((fld, idx) =>
                idx === i ? { ...fld, key: v, _keyManual: true } : fld
            )
            return { ...f, fields }
        })
    }

    function doSave() {
        if (!form.label.trim()) { showToast('Nom du modèle requis', 'error'); return }
        const id = tpl?.id ?? `ctpl-${Date.now()}`
        const cleanFields = form.fields.filter(f => f.key && f.label).map(({ _keyManual, ...rest }) => rest)
        onSave({ ...form, id, key: id, fields: cleanFields, isCustom: true, createdAt: tpl?.createdAt ?? new Date().toISOString() })
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#0d1629] border border-white/12 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                            <Settings size={15} className="text-violet-400" />
                        </div>
                        <p className="text-sm font-bold text-white">{isEdit ? 'Modifier le modèle' : 'Nouveau modèle personnalisé'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={generateCustomTemplateGuide}
                            title="Ouvrir le guide PDF"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-400 hover:bg-violet-500/20 text-xs font-semibold transition-colors">
                            <FileText size={12} /> Guide
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-navy-700 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                    </div>
                </div>
                <div className="p-5 space-y-5">
                    {/* Name + Icon + Color */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-slate-400 mb-1.5">Nom du modèle <span className="text-red-400">*</span></label>
                            <input value={form.label} onChange={e => setField('label', e.target.value)}
                                placeholder="Ex: Réunion de quartier"
                                className="w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Icône</label>
                            <div className="flex flex-wrap gap-2">
                                {CUSTOM_TPL_ICONS.map(ic => (
                                    <button key={ic} onClick={() => setField('icon', ic)}
                                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${form.icon === ic ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-navy-700/60 border-white/8 hover:border-white/20'}`}>
                                        {ic}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Couleur</label>
                            <div className="flex flex-wrap gap-2">
                                {CUSTOM_TPL_COLORS.map(c => (
                                    <button key={c} onClick={() => setField('color', c)}
                                        className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                                        style={{ background: c }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fields editor */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-slate-400">Champs du formulaire</label>
                            <button onClick={addField}
                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                                <Plus size={12} /> Ajouter un champ
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            {form.fields.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-navy-700/40 border border-white/6">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div>
                                            <input value={f.label} onChange={e => updateField(i, 'label', e.target.value)}
                                                placeholder="Libellé" className="w-full bg-navy-700/80 border border-white/8 rounded-lg px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40" />
                                            <p className="text-[10px] text-slate-600 mt-1">Clé : <code className="text-violet-400">{'{{'}{ f.key || '…' }{'}}'}</code></p>
                                        </div>
                                        <select value={f.type} onChange={e => updateField(i, 'type', e.target.value)}
                                            className="bg-navy-700/80 border border-white/8 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/40">
                                            {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                        </select>
                                        <input value={f.placeholder ?? ''} onChange={e => updateField(i, 'placeholder', e.target.value)}
                                            placeholder="Texte indicatif (optionnel)"
                                            className="col-span-2 bg-navy-700/80 border border-white/8 rounded-lg px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40" />
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 pt-0.5">
                                        <label className="flex items-center gap-1 cursor-pointer" title="Requis">
                                            <input type="checkbox" checked={f.required ?? false} onChange={e => updateField(i, 'required', e.target.checked)}
                                                className="w-3.5 h-3.5 rounded accent-cyan-500" />
                                            <span className="text-[10px] text-slate-500">Requis</span>
                                        </label>
                                        <button onClick={() => removeField(i)}
                                            className="p-1 rounded-lg hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {form.fields.length === 0 && (
                                <p className="text-xs text-slate-500 text-center py-3">Aucun champ — le formulaire sera vide.</p>
                            )}
                        </div>
                    </div>

                    {/* Message template */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                            Corps du message
                            <span className="ml-2 text-[10px] text-slate-500">utilisez <code className="text-violet-400">{'{{clé}}'}</code> pour insérer un champ</span>
                        </label>
                        <textarea value={form.messageTemplate} onChange={e => setField('messageTemplate', e.target.value)}
                            rows={7} className="w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none font-mono text-xs leading-relaxed" />
                        <p className="text-[10px] text-slate-500 mt-1">
                            Clés disponibles : <code className="text-violet-400">{'{{building}}'}</code>
                            {form.fields.filter(f => f.key).map(f => (
                                <code key={f.key} className="text-violet-400 ml-1">{`{{${f.key}}}`}</code>
                            ))}
                        </p>
                    </div>

                    {/* Save / Delete */}
                    {confirmDelete ? (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-red-300">Supprimer ce modèle définitivement ?</p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5">Annuler</button>
                                <button onClick={() => { onDelete(tpl.id); onClose() }}
                                    className="text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/25 transition-colors">Supprimer</button>
                            </div>
                        </div>
                    ) : confirmSave ? (
                        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-cyan-300">Confirmer l'enregistrement ?</p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmSave(false)} className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5">Annuler</button>
                                <button onClick={doSave}
                                    className="text-xs font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/25 transition-colors">Confirmer</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            {isEdit && (
                                <button onClick={() => setConfirmDelete(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/15 transition-colors">
                                    <Trash2 size={14} /> Supprimer
                                </button>
                            )}
                            <button onClick={() => setConfirmSave(true)}
                                className="flex-1 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/25 transition-colors">
                                {isEdit ? 'Enregistrer les modifications' : 'Créer le modèle'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function ManageCustomTemplatesModal({ customTpls, setCustomTpls, onClose, showToast }) {
    const [editing, setEditing] = useState(null)   // null | 'new' | template object

    function handleSave(tpl) {
        setCustomTpls(prev => {
            const exists = prev.some(t => t.id === tpl.id)
            return exists ? prev.map(t => t.id === tpl.id ? tpl : t) : [...prev, tpl]
        })
        showToast(`Modèle "${tpl.label}" enregistré`, 'success')
        setEditing(null)
    }
    function handleDelete(id) {
        setCustomTpls(prev => prev.filter(t => t.id !== id))
        showToast('Modèle supprimé', 'success')
    }

    if (editing !== null) {
        return (
            <CustomTemplateEditorModal
                tpl={editing === 'new' ? null : editing}
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={() => setEditing(null)}
                showToast={showToast}
            />
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1629] border border-white/12 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                            <Settings size={15} className="text-violet-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Modèles personnalisés</p>
                            <p className="text-xs text-slate-400">{customTpls.length} modèle{customTpls.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-navy-700 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                <div className="p-5">
                    {customTpls.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="text-4xl mb-3">📋</div>
                            <p className="text-sm text-slate-400 mb-1">Aucun modèle personnalisé</p>
                            <p className="text-xs text-slate-500">Créez des templates réutilisables pour vos avis récurrents.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 mb-4">
                            {customTpls.map(t => (
                                <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-navy-700/40 border border-white/6 hover:border-white/12 transition-colors">
                                    <span className="text-2xl">{t.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white">{t.label}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {t.fields.length > 0 ? t.fields.map(f => f.label).join(' · ') : 'Modèle libre'}
                                        </p>
                                    </div>
                                    <button onClick={() => setEditing(t)}
                                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-navy-700/60 border border-white/8 hover:border-white/20 transition-colors">
                                        <Pencil size={12} /> Modifier
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={() => setEditing('new')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/25 transition-colors">
                        <Plus size={15} /> Nouveau modèle
                    </button>
                </div>
            </div>
        </div>
    )
}

function FournisseursPage({ building, suppliers, setSuppliers, showToast }) {
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('all')
    const [showAdd, setShowAdd] = useState(false)
    const [editing, setEditing] = useState(null)

    useEffect(() => {
        try { localStorage.setItem(`sp_suppliers_${building.id}`, JSON.stringify(suppliers)) } catch { }
    }, [suppliers, building.id])

    const filtered = suppliers.filter(s => {
        const matchCat = catFilter === 'all' || s.category === catFilter
        const matchName = s.name.toLowerCase().includes(search.toLowerCase())
        return matchCat && matchName
    })

    const avgRating = suppliers.length
        ? (suppliers.reduce((a, s) => a + (s.rating || 0), 0) / suppliers.length).toFixed(1)
        : '—'

    function handleAdd(s) {
        setSuppliers(prev => [{ ...s, id: `sup-${Date.now()}` }, ...prev])
        showToast(`${s.name} ajouté`)
    }

    function handleSave(updated) {
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s))
        setEditing(null)
        showToast(`${updated.name} — modifications enregistrées`)
    }

    function handleDelete(id) {
        const s = suppliers.find(x => x.id === id)
        setSuppliers(prev => prev.filter(x => x.id !== id))
        setEditing(null)
        showToast(`${s?.name} supprimé`)
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard className="glass-card p-4 flex items-center gap-3">
                    <Truck size={20} className="text-sp flex-shrink-0" />
                    <div>
                        <p className="text-2xl font-bold text-white">{suppliers.length}</p>
                        <p className="text-xs text-slate-400">Fournisseurs</p>
                    </div>
                </StatCard>
                <StatCard className="glass-card p-4 flex items-center gap-3">
                    <Star size={20} className="text-amber-400 flex-shrink-0" />
                    <div>
                        <p className="text-2xl font-bold text-white">{avgRating}</p>
                        <p className="text-xs text-slate-400">Note moyenne</p>
                    </div>
                </StatCard>
                <StatCard className="glass-card p-4 flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-2xl font-bold text-white">{suppliers.filter(s => s.contractRef).length}</p>
                        <p className="text-xs text-slate-400">Sous contrat</p>
                    </div>
                </StatCard>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all shadow-glow-cyan flex-shrink-0">
                    <Plus size={15} /> Ajouter un fournisseur
                </button>
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-navy-800 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                {/* Category pills */}
                <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setCatFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${catFilter === 'all' ? 'bg-sp/15 border-sp/30 text-sp' : 'bg-navy-800 border-white/8 text-slate-400 hover:border-sp/20'}`}>
                        Tous
                    </button>
                    {SUPPLIER_CATS.map(c => (
                        <button key={c.key} onClick={() => setCatFilter(c.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${catFilter === c.key ? c.color : 'bg-navy-800 border-white/8 text-slate-400 hover:border-white/20'}`}>
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <Truck size={36} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucun fournisseur{catFilter !== 'all' ? ' dans cette catégorie' : ''}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {filtered.map(s => {
                        const ci = catInfo(s.category)
                        return (
                            <div key={s.id} className="glass-card p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ci.color}`}>{ci.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StarRating value={s.rating ?? 0} />
                                        <button onClick={() => setEditing(s)}
                                            className="p-1.5 rounded-lg hover:bg-navy-600 text-slate-500 hover:text-slate-200 transition-colors">
                                            <Pencil size={13} />
                                        </button>
                                    </div>
                                </div>
                                <p className="font-bold text-white text-base">{s.name}</p>
                                <div className="space-y-1.5 text-xs text-slate-400">
                                    {s.phone && <p className="flex items-center gap-2"><Phone size={11} className="flex-shrink-0" />{s.phone}</p>}
                                    {s.email && <p className="flex items-center gap-2"><Mail size={11} className="flex-shrink-0" />{s.email}</p>}
                                    {(s.contractRef || s.since) && (
                                        <p className="flex items-center gap-2">
                                            <FileText size={11} className="flex-shrink-0" />
                                            {s.contractRef ? `Réf: ${s.contractRef}` : ''}
                                            {s.contractRef && s.since ? ' · ' : ''}
                                            {s.since ? `Depuis ${s.since.slice(0, 7).replace('-', '/')}` : ''}
                                        </p>
                                    )}
                                </div>
                                {s.notes && (
                                    <p className="text-[11px] text-slate-500 bg-navy-700/50 rounded-lg px-3 py-2 border border-white/5 line-clamp-2">{s.notes}</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <AnimatePresence>
                {showAdd && <AddSupplierModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
                {editing && <EditSupplierModal supplier={editing} onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} />}
            </AnimatePresence>
        </div>
    )
}

/* ── Supplier modals ───────────────────────────────────────────────────────── */
function SupplierForm({ form, set }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom *</label>
                    <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="Ex: TechLift Maroc"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Catégorie</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors">
                        {SUPPLIER_CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Note</label>
                    <StarRating value={form.rating} onChange={v => set('rating', v)} size={20} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone</label>
                    <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="+212 6XX XXX XXX"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        placeholder="contact@fournisseur.ma"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Réf. contrat</label>
                    <input type="text" value={form.contractRef} onChange={e => set('contractRef', e.target.value)}
                        placeholder="CTR-2025-XXX"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Depuis</label>
                    <input type="month" value={form.since} onChange={e => set('since', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Conditions, historique, remarques..." rows={3}
                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
            </div>
        </div>
    )
}

function AddSupplierModal({ onClose, onAdd }) {
    const EMPTY = { name: '', category: 'autre', phone: '', email: '', contractRef: '', since: '', rating: 0, notes: '' }
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)
    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.name.trim()) return
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onAdd({ ...form })
        setSaving(false)
        onClose()
    }

    return (
        <Modal title="Nouveau fournisseur" onClose={onClose} width="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <SupplierForm form={form} set={set} />
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">Annuler</button>
                    <button type="submit" disabled={saving || !form.name.trim()}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Check size={14} /> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

function EditSupplierModal({ supplier, onClose, onSave, onDelete }) {
    const [form, setForm] = useState({ ...supplier })
    const [confirmDelete, setCD] = useState(false)
    const [confirmSave, setCS] = useState(false)
    const [saving, setSaving] = useState(false)
    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setCS(false) }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onSave({ ...form })
    }

    return (
        <Modal title="Modifier le fournisseur" subtitle={supplier.name} onClose={onClose} width="max-w-2xl">
            <div className="space-y-4">
                <SupplierForm form={form} set={set} />
                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">Annuler</button>
                        <button type="button" onClick={() => setCS(true)} disabled={!form.name.trim()}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            <Check size={14} /> Enregistrer
                        </button>
                    </div>
                ) : (
                    <div className="bg-sp/8 border border-sp/25 rounded-xl p-3.5">
                        <p className="text-xs text-slate-300 text-center mb-3">Confirmer les modifications ?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCS(false)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">Revenir</button>
                            <button onClick={doSave} disabled={saving}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-sp/20 text-sp border border-sp/30 hover:bg-sp/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={12} /> Confirmer</>}
                            </button>
                        </div>
                    </div>
                )}
                {!confirmDelete ? (
                    <button type="button" onClick={() => setCD(true)} className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">Supprimer ce fournisseur</button>
                ) : (
                    <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-3.5">
                        <p className="text-xs text-red-300 text-center mb-3">Supprimer <span className="font-semibold text-white">{supplier.name}</span> définitivement ?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCD(false)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">Annuler</button>
                            <button onClick={() => onDelete(supplier.id)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">Supprimer</button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   RESIDENTS PAGE
══════════════════════════════════════════ */
const RESIDENTS_PAGE_SIZE = 15

function getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = [1]
    if (current > 3) pages.push('...')
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
}

function ResidentsPage({ building, data, residents, setResidents, showToast }) {
    const [search, setSearch] = useState('')
    const [activeFilters, setActiveFilters] = useState([])
    const [page, setPage] = useState(1)
    const [showAddResident, setShowAddResident] = useState(false)
    const [showImportCSV, setShowImportCSV] = useState(false)
    const [showGroupWA, setShowGroupWA] = useState(false)
    const [editingResident, setEditingResident] = useState(null)
    const [copiedCode, setCopiedCode] = useState(null)
    const [showPortalCodes, setShowPortalCodes] = useState(false)

    function handleEditResident(updated) {
        setResidents(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
        // Persist paidThrough correction for portal sync
        if (updated.paidThrough) {
            try {
                const key = `sp_payments_${building.id}`
                const map = JSON.parse(localStorage.getItem(key) ?? '{}')
                localStorage.setItem(key, JSON.stringify({ ...map, [updated.id]: updated.paidThrough }))
            } catch { }
        }
        // Sync extras localStorage so portal PIN changes take effect immediately
        try {
            const eKey = `sp_residents_extra_${building.id}`
            const existing = JSON.parse(localStorage.getItem(eKey) ?? '[]')
            if (existing.some(x => x.id === updated.id)) {
                localStorage.setItem(eKey, JSON.stringify(existing.map(x => x.id === updated.id ? { ...x, ...updated } : x)))
            }
        } catch { }
        setEditingResident(null)
        showToast(`${updated.name} — modifications enregistrées`)
    }

    function handleDeleteResident(id) {
        const r = residents.find(x => x.id === id)
        setResidents(prev => prev.filter(x => x.id !== id))
        // Remove from extras localStorage (runtime-added residents)
        try {
            const eKey = `sp_residents_extra_${building.id}`
            const existing = JSON.parse(localStorage.getItem(eKey) ?? '[]')
            localStorage.setItem(eKey, JSON.stringify(existing.filter(x => x.id !== id)))
        } catch { }
        // Add to revocation list so portal access is denied (covers mock data residents too)
        try {
            const rKey = `sp_revoked_${building.id}`
            const revoked = JSON.parse(localStorage.getItem(rKey) ?? '[]')
            if (!revoked.includes(id)) localStorage.setItem(rKey, JSON.stringify([...revoked, id]))
        } catch { }
        setEditingResident(null)
        showToast(`${r?.name} supprimé(e)`)
    }

    function handleCardClick(e, status) {
        if (e.ctrlKey || e.metaKey) {
            setActiveFilters(prev =>
                prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
            )
        } else {
            setActiveFilters(prev =>
                prev.length === 1 && prev[0] === status ? [] : [status]
            )
        }
    }

    const filtered = residents.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.unit.toLowerCase().includes(search.toLowerCase())
        const matchFilter = activeFilters.length === 0 || activeFilters.includes(computeStatus(r.paidThrough))
        return matchSearch && matchFilter
    })

    // Reset to page 1 whenever filter or search changes
    useEffect(() => { setPage(1) }, [search, activeFilters])

    const totalPages = Math.ceil(filtered.length / RESIDENTS_PAGE_SIZE)
    const paginated = filtered.slice((page - 1) * RESIDENTS_PAGE_SIZE, page * RESIDENTS_PAGE_SIZE)

    const buildingFee = building.monthly_fee || 850
    const rFee = (r) => r.monthly_fee ?? buildingFee

    // Total Solde dû across all filtered (not just current page)
    const totalSoldeDu = filtered.reduce((s, r) => {
        const st = computeStatus(r.paidThrough)
        if (st === 'paid') return s
        return s + getUnpaidMonthsCount(r.paidThrough) * rFee(r)
    }, 0)
    const nonPaidFilteredCount = filtered.filter(r => computeStatus(r.paidThrough) !== 'paid').length

    const counts = {
        all: residents.length,
        paid: residents.filter(r => computeStatus(r.paidThrough) === 'paid').length,
        pending: residents.filter(r => computeStatus(r.paidThrough) === 'pending').length,
        overdue: residents.filter(r => computeStatus(r.paidThrough) === 'overdue').length,
    }
    const amounts = {
        paid: residents.filter(r => computeStatus(r.paidThrough) === 'paid').reduce((s, r) => s + rFee(r), 0),
        pending: residents.filter(r => computeStatus(r.paidThrough) === 'pending').reduce((s, r) => s + getUnpaidMonthsCount(r.paidThrough) * rFee(r), 0),
        overdue: residents.filter(r => computeStatus(r.paidThrough) === 'overdue').reduce((s, r) => s + getUnpaidMonthsCount(r.paidThrough) * rFee(r), 0),
    }

    function handleAddResident(r) {
        setResidents(prev => [r, ...prev])
        // Persist to localStorage so the portal login can validate this new resident's code
        try {
            const key = `sp_residents_extra_${building.id}`
            const existing = JSON.parse(localStorage.getItem(key) ?? '[]')
            localStorage.setItem(key, JSON.stringify([...existing, r]))
        } catch { }
        showToast(`${r.name} ajouté(e) — invitation WhatsApp envoyée`)
        setTimeout(() => setResidents(prev => prev.map(x => x.id === r.id ? { ...x, isNew: false } : x)), 5000)
    }

    function handleImport(newResidents) {
        setResidents(prev => [...prev, ...newResidents])
        showToast(`${newResidents.length} résidents importés avec succès`)
        const ids = new Set(newResidents.map(r => r.id))
        setTimeout(() => setResidents(prev => prev.map(x => ids.has(x.id) ? { ...x, isNew: false } : x)), 5000)
    }

    return (
        <div className="space-y-6">
            {/* Stats — clickable filter cards (Ctrl+clic = multi-select) */}
            <div className="grid grid-cols-4 gap-4">
                {/* Tous */}
                <button
                    onClick={() => setActiveFilters([])}
                    className={`glass-card p-4 text-left transition-all duration-200 rounded-2xl border select-none hover:scale-[1.01] hover:bg-white/[0.025] active:scale-[0.99] ${activeFilters.length === 0 ? 'border-sp/50 ring-1 ring-sp/30' : 'border-white/5 hover:border-white/15'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">Tous les résidents</p>
                        {activeFilters.length === 0 && <span className="text-[10px] bg-sp/20 text-sp px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-slate-200">{counts.all}</div>
                    <p className="text-[11px] text-slate-500 mt-1">{building.total_units} unités · {building.name}</p>
                </button>
                {/* Payés */}
                <button
                    onClick={e => handleCardClick(e, 'paid')}
                    className={`glass-card p-4 text-left transition-all duration-200 rounded-2xl border select-none hover:scale-[1.01] hover:bg-white/[0.025] active:scale-[0.99] ${activeFilters.includes('paid') ? 'border-emerald-500/50 ring-1 ring-emerald-500/25' : 'border-white/5 hover:border-emerald-500/25'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">Payés ce mois</p>
                        {activeFilters.includes('paid') && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{counts.paid}</div>
                    <p className="text-[11px] text-emerald-500/70 mt-1 font-semibold">{amounts.paid.toLocaleString('fr-FR')} MAD encaissés</p>
                </button>
                {/* En attente */}
                <button
                    onClick={e => handleCardClick(e, 'pending')}
                    className={`glass-card p-4 text-left transition-all duration-200 rounded-2xl border select-none hover:scale-[1.01] hover:bg-white/[0.025] active:scale-[0.99] ${activeFilters.includes('pending') ? 'border-amber-500/50 ring-1 ring-amber-500/25' : 'border-white/5 hover:border-amber-500/25'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">En attente</p>
                        {activeFilters.includes('pending') && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{counts.pending}</div>
                    <p className="text-[11px] text-amber-500/70 mt-1 font-semibold">{amounts.pending.toLocaleString('fr-FR')} MAD dus</p>
                </button>
                {/* En retard */}
                <button
                    onClick={e => handleCardClick(e, 'overdue')}
                    className={`glass-card p-4 text-left transition-all duration-200 rounded-2xl border select-none hover:scale-[1.01] hover:bg-white/[0.025] active:scale-[0.99] ${activeFilters.includes('overdue') ? 'border-red-500/50 ring-1 ring-red-500/25' : 'border-white/5 hover:border-red-500/25'}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400">En retard</p>
                        {activeFilters.includes('overdue') && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">actif</span>}
                    </div>
                    <div className="text-2xl font-bold text-red-400">{counts.overdue}</div>
                    <p className="text-[11px] text-red-500/70 mt-1 font-semibold">{amounts.overdue.toLocaleString('fr-FR')} MAD dus</p>
                </button>
            </div>
            <p className="text-[10px] text-slate-600 -mt-3">Ctrl+clic pour sélectionner plusieurs statuts</p>

            {/* Action bar + Search + Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <button
                    onClick={() => setShowAddResident(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all shadow-glow-cyan flex-shrink-0"
                >
                    <Plus size={15} /> Ajouter un résident
                </button>
                <button
                    onClick={() => setShowImportCSV(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-navy-700 hover:bg-navy-600 text-slate-200 rounded-xl text-sm font-semibold transition-all border border-white/8 flex-shrink-0"
                >
                    <Upload size={15} /> Importer CSV / Excel
                </button>
                {counts.overdue > 0 && (
                    <button
                        onClick={() => setShowGroupWA(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-all border border-emerald-500/20 flex-shrink-0"
                    >
                        <MessageCircle size={15} /> Rappel groupé ({counts.overdue} en retard)
                    </button>
                )}
                <div className="flex-1 relative min-w-[200px]">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher un résident ou une unité..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-navy-800 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>
                {activeFilters.length > 0 && (
                    <button
                        onClick={() => setActiveFilters([])}
                        className="flex items-center gap-1.5 px-3 py-2 bg-navy-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold border border-white/8 hover:border-white/20 transition-all flex-shrink-0"
                    >
                        <X size={12} /> Réinitialiser filtre
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                            {['Unité', 'Résident', 'Téléphone', 'Étage', 'Depuis', 'Statut', 'Solde dû'].map(h => (
                                <th key={h} className="text-left px-6 py-4 font-semibold">{h}</th>
                            ))}
                            <th className="text-left px-6 py-4 font-semibold">
                                <div className="flex items-center gap-1.5">
                                    <span>Accès portail</span>
                                    <button
                                        onClick={() => setShowPortalCodes(v => !v)}
                                        title={showPortalCodes ? 'Masquer les codes' : 'Révéler les codes'}
                                        className="p-1 rounded hover:bg-white/10 transition-colors text-slate-600 hover:text-slate-300"
                                    >
                                        {showPortalCodes ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                </div>
                            </th>
                            <th className="text-left px-6 py-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                        {paginated.map(r => (
                            <motion.tr
                                key={r.id}
                                initial={r.isNew ? { opacity: 0, backgroundColor: 'rgba(6,182,212,0.08)' } : false}
                                animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                                transition={{ duration: 0.5 }}
                                className="hover:bg-navy-700/40 transition-colors group"
                            >
                                <td className="px-6 py-3.5 font-mono text-xs text-sp font-semibold">{r.unit}</td>
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=111d35&color=06b6d4&size=28`}
                                            alt="" className="w-7 h-7 rounded-lg flex-shrink-0" />
                                        <div>
                                            <span className="text-slate-200 font-medium">{r.name}</span>
                                            {r.isNew && (
                                                <span className="ml-2 text-[9px] font-bold bg-sp/15 text-sp border border-sp/20 px-1.5 py-0.5 rounded-full">NOUVEAU</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">{r.phone}</td>
                                <td className="px-6 py-3.5 text-slate-400">Ét. {r.floor}</td>
                                <td className="px-6 py-3.5 text-slate-400">{r.since}</td>
                                <td className="px-6 py-3.5">
                                    {(() => {
                                        const st = computeStatus(r.paidThrough)
                                        return (
                                            <div className="space-y-1">
                                                <span className={`inline-block text-xs font-semibold rounded-lg px-2.5 py-1 border ${st === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        st === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {st === 'paid' ? '✓ Payé' : st === 'pending' ? '⏳ En attente' : '⚠ En retard'}
                                                </span>
                                                <p className="text-[10px] text-slate-500">
                                                    jusqu'à {formatMonth(r.paidThrough)}
                                                </p>
                                            </div>
                                        )
                                    })()}
                                </td>
                                <td className="px-6 py-3.5">
                                    {(() => {
                                        const st = computeStatus(r.paidThrough)
                                        if (st === 'paid') return (
                                            <span className="text-slate-600 font-bold text-base leading-none">—</span>
                                        )
                                        const fee = r.monthly_fee ?? building.monthly_fee ?? 250
                                        const months = getUnpaidMonthsCount(r.paidThrough)
                                        const owed = months * fee
                                        return (
                                            <div>
                                                <span className={`text-xs font-bold ${st === 'overdue' ? 'text-red-400' : 'text-amber-400'}`}>
                                                    {owed.toLocaleString('fr-FR')} MAD
                                                </span>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{months} mois × {fee.toLocaleString('fr-FR')} MAD</p>
                                            </div>
                                        )
                                    })()}
                                </td>
                                <td className="px-6 py-3.5">
                                    {(() => {
                                        const code = building.accessCode ?? '—'
                                        const pin = getResidentPortalPin(r, building.id)
                                        const justCopied = copiedCode === r.id
                                        return (
                                            <div className="flex items-center gap-2">
                                                {/* Code + PIN stacked */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider w-5">RES</span>
                                                        <code className="font-mono text-[11px] text-sp font-bold tracking-wide">
                                                            {showPortalCodes ? code : '•'.repeat(Math.min(code.length, 10))}
                                                        </code>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider w-5">PIN</span>
                                                        <code className="font-mono text-[11px] text-amber-400 font-bold tracking-widest">
                                                            {showPortalCodes ? (pin ?? '—') : '••••'}
                                                        </code>
                                                    </div>
                                                </div>
                                                {/* Buttons */}
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`Code: ${code}  PIN: ${pin ?? '—'}`).catch(() => {})
                                                            setCopiedCode(r.id)
                                                            setTimeout(() => setCopiedCode(null), 2000)
                                                        }}
                                                        title="Copier code et PIN"
                                                        className="p-1 rounded-md bg-sp/5 hover:bg-sp/15 border border-sp/15 hover:border-sp/30 text-sp/60 hover:text-sp transition-all"
                                                    >
                                                        {justCopied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                                    </button>
                                                    <button
                                                        onClick={() => openPortalWhatsApp(r, building)}
                                                        title="Envoyer les accès portail par WhatsApp"
                                                        className="p-1 rounded-md bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/15 hover:border-emerald-500/30 text-emerald-500/50 hover:text-emerald-400 transition-all"
                                                    >
                                                        <MessageCircle size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </td>
                                <td className="px-6 py-3.5">
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ActionBtn
                                            color="green"
                                            icon={<MessageCircle size={12} />}
                                            title={computeStatus(r.paidThrough) === 'overdue'
                                                ? 'Envoyer un rappel de paiement WhatsApp'
                                                : 'Ouvrir une conversation WhatsApp'}
                                            onClick={() => openWhatsApp(r.phone, r.name, r.unit, building, computeStatus(r.paidThrough), r.paidThrough, r.monthly_fee)}
                                        />
                                        <ActionBtn icon={<Phone size={12} />} title="Appeler le résident" onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} />
                                        <ActionBtn icon={<Mail size={12} />} title="Envoyer un e-mail" onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} />
                                        <ActionBtn icon={<Pencil size={12} />} title="Modifier le résident" onClick={() => setEditingResident(r)} />
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                    {filtered.length > 0 && (
                        <tfoot>
                            <tr className="border-t border-white/10 bg-navy-800/40">
                                <td colSpan={6} className="px-6 py-3 text-right text-xs text-slate-500 font-semibold">
                                    Total Solde dû
                                    {nonPaidFilteredCount > 0 && <span className="ml-1 text-slate-600">({nonPaidFilteredCount} résident{nonPaidFilteredCount > 1 ? 's' : ''})</span>}
                                </td>
                                <td className="px-6 py-3">
                                    {totalSoldeDu > 0 ? (
                                        <span className="text-sm font-bold text-red-400">{totalSoldeDu.toLocaleString('fr-FR')} MAD</span>
                                    ) : (
                                        <span className="text-sm font-bold text-emerald-400">Tout à jour ✓</span>
                                    )}
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <Users size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun résident trouvé</p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                        <p className="text-xs text-slate-500">
                            {(page - 1) * RESIDENTS_PAGE_SIZE + 1}–{Math.min(page * RESIDENTS_PAGE_SIZE, filtered.length)} sur {filtered.length} résidents
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-navy-700 text-slate-400 hover:text-slate-200 hover:bg-navy-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/8"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {getPageNumbers(page, totalPages).map((p, i) => (
                                p === '...'
                                    ? <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-500 text-xs select-none">…</span>
                                    : <button key={p} onClick={() => setPage(p)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${p === page ? 'bg-sp text-navy-900' : 'bg-navy-700 text-slate-400 hover:text-slate-200 hover:bg-navy-600 border border-white/8'
                                            }`}>{p}</button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-navy-700 text-slate-400 hover:text-slate-200 hover:bg-navy-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/8"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showAddResident && (
                    <AddResidentModal onClose={() => setShowAddResident(false)} onAdd={handleAddResident} building={building} residents={residents} />
                )}
                {showImportCSV && (
                    <ImportCSVModal onClose={() => setShowImportCSV(false)} onImport={handleImport} />
                )}
                {showGroupWA && (
                    <WhatsAppGroupModal
                        overdueResidents={residents.filter(r => computeStatus(r.paidThrough) === 'overdue')}
                        building={building}
                        onClose={() => setShowGroupWA(false)}
                    />
                )}
                {editingResident && (
                    <EditResidentModal
                        resident={editingResident}
                        onSave={handleEditResident}
                        onDelete={handleDeleteResident}
                        onClose={() => setEditingResident(null)}
                        allResidents={residents}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   DISPUTES PAGE
══════════════════════════════════════════ */
function DisputesPage({ building, data, disputes, setDisputes, showToast }) {
    const STATUS_INFO = {
        open: { label: 'Ouvert', cls: 'bg-red-500/15 text-red-400 border-red-500/20', btnCls: 'border-red-500/40 text-red-400 bg-red-500/10' },
        mediation: { label: 'Médiation', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20', btnCls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
        resolved: { label: 'Résolu', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', btnCls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
        closed: { label: 'Clôturé', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/20', btnCls: 'border-slate-500/40 text-slate-400 bg-slate-500/10' },
    }
    const priorityColor = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-slate-400' }
    const priorityLabel = { high: 'ÉLEVÉ', medium: 'MOYEN', low: 'FAIBLE' }

    const [filter, setFilter] = useState('all')
    const [showAdd, setShowAdd] = useState(false)
    const [editingDispute, setEditingDispute] = useState(null)

    useEffect(() => {
        try { localStorage.setItem(`sp_disputes_${building.id}`, JSON.stringify(disputes)) } catch { }
    }, [disputes, building.id])

    const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

    function handleAdd(d) {
        const prefix = building.id === 'bld-1' ? 'DSP' : building.id === 'bld-2' ? 'DSP-A' : 'DSP-J'
        const newId = `${prefix}-${String(disputes.length + 1).padStart(3, '0')}`
        const now = new Date()
        const dateStr = `${now.getDate()} ${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`
        setDisputes(prev => [{
            ...d, id: newId, date: dateStr,
            ai_suggestion: 'Nouveau litige enregistré. Analyse IA en cours selon la Loi 18-00.',
        }, ...prev])
        showToast(`Litige "${d.title}" créé`)
    }

    function handleSaveEdit(d) {
        setDisputes(prev => prev.map(x => x.id === d.id ? d : x))
        showToast('Litige mis à jour')
        setEditingDispute(null)
    }

    function handleDelete(id) {
        setDisputes(prev => prev.filter(x => x.id !== id))
        showToast('Litige supprimé', 'error')
        setEditingDispute(null)
    }

    const FILTER_TABS = [
        { key: 'all', label: 'Tous' },
        { key: 'open', label: 'Ouvert' },
        { key: 'mediation', label: 'Médiation' },
        { key: 'resolved', label: 'Résolu' },
        { key: 'closed', label: 'Clôturé' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">Litiges</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{building.name} · {building.city} — {disputes.length} litige{disputes.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-sp/10 hover:bg-sp/20 text-sp border border-sp/25 rounded-xl px-4 py-2 text-sm font-semibold transition-all">
                    <Plus size={15} /> Nouveau litige
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {['open', 'mediation', 'resolved', 'closed'].map(s => (
                    <div key={s} className="glass-card p-4 flex items-center gap-3 cursor-pointer select-none hover:bg-white/[0.025] hover:border-white/15 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200" onClick={() => setFilter(s)}>
                        <div className={`text-2xl font-bold ${STATUS_INFO[s].cls.split(' ').find(c => c.startsWith('text-'))}`}>
                            {disputes.filter(d => d.status === s).length}
                        </div>
                        <p className="text-xs font-medium text-slate-300">{STATUS_INFO[s].label}</p>
                    </div>
                ))}
            </div>

            {/* AI Banner */}
            <div className="glass-card p-5 flex items-center gap-4 border-sp/15"
                style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.06), transparent)' }}>
                <div className="w-10 h-10 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center flex-shrink-0">
                    <Activity size={20} className="text-sp" />
                </div>
                <div>
                    <p className="text-sm font-bold text-white">Médiation IA — Active</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        SyndicPulse analyse les litiges selon la Loi 18-00 et génère des scripts de médiation en Darija et Français.
                    </p>
                </div>
                <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="ml-auto text-xs bg-sp/10 text-sp border border-sp/20 px-4 py-2 rounded-lg hover:bg-sp/20 transition-colors flex-shrink-0">
                    Voir les logs IA
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
                {FILTER_TABS.map(t => (
                    <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${filter === t.key
                                ? 'bg-sp/15 text-sp border-sp/30'
                                : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/15'
                            }`}>
                        {t.label}
                        {t.key !== 'all' && (
                            <span className="ml-1.5 opacity-60">{disputes.filter(d => d.status === t.key).length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Disputes list */}
            <div className="space-y-4">
                {filtered.length === 0 && (
                    <div className="glass-card p-10 text-center text-slate-500 text-sm">Aucun litige pour ce filtre.</div>
                )}
                {filtered.map(d => (
                    <div key={d.id} className={`glass-card p-6 transition-opacity ${d.status === 'closed' ? 'opacity-55' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-[11px] text-slate-500 bg-navy-700 px-2 py-0.5 rounded">{d.id}</span>
                                <h3 className="font-semibold text-white">{d.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityColor[d.priority]}`}>
                                    {priorityLabel[d.priority]}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${STATUS_INFO[d.status]?.cls ?? STATUS_INFO.closed.cls}`}>
                                    {STATUS_INFO[d.status]?.label ?? 'Clôturé'}
                                </span>
                                <button onClick={() => setEditingDispute(d)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-navy-700 transition-colors ml-1">
                                    <Pencil size={13} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {d.parties.map(p => (
                                <span key={p} className="text-xs bg-navy-700 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5">{p}</span>
                            ))}
                        </div>

                        {d.notes && (
                            <div className="bg-navy-700/60 rounded-xl p-3 border border-white/5 mb-4">
                                <p className="text-xs text-slate-400 leading-relaxed">{d.notes}</p>
                            </div>
                        )}

                        <div className="bg-navy-700/60 rounded-xl p-4 border border-sp/8">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={12} className="text-sp" />
                                <span className="text-[10px] font-bold text-sp uppercase tracking-wider">Suggestion IA</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{d.ai_suggestion}</p>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Clock size={11} /> {d.date}
                                </span>
                                {d.attachments?.length > 0 && (
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Paperclip size={11} /> {d.attachments.length}
                                    </span>
                                )}
                            </div>
                            {d.status !== 'closed' && (
                                <div className="flex gap-2">
                                    {d.status !== 'resolved' && (
                                        <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)}
                                            className="text-xs bg-sp/10 text-sp border border-sp/20 px-3 py-1.5 rounded-lg hover:bg-sp/20 transition-colors flex items-center gap-1">
                                            <Mic size={11} /> Médiation IA
                                        </button>
                                    )}
                                    <button onClick={() => setEditingDispute(d)}
                                        className="text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors">
                                        Modifier
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {showAdd && (
                    <AddDisputeModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />
                )}
                {editingDispute && (
                    <EditDisputeModal
                        dispute={editingDispute}
                        onClose={() => setEditingDispute(null)}
                        onSave={handleSaveEdit}
                        onDelete={handleDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   ADD DISPUTE MODAL
══════════════════════════════════════════ */
const DISPUTE_PRIORITY_BTNS = [
    { key: 'high', label: 'ÉLEVÉ', cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
    { key: 'medium', label: 'MOYEN', cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { key: 'low', label: 'FAIBLE', cls: 'border-slate-500/40 text-slate-400 bg-slate-500/10' },
]

/* ── Pièces jointes — shared by Add/Edit dispute modals ─────────── */
function AttachmentsField({ attachments, setAttachments }) {
    const [fileError, setFileError] = useState('')
    const inputRef = useRef(null)
    const MAX_FILES = 5
    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

    function handleFiles(e) {
        setFileError('')
        const files = Array.from(e.target.files ?? [])
        if (attachments.length + files.length > MAX_FILES) {
            setFileError(`Maximum ${MAX_FILES} fichiers autorisés`)
            e.target.value = ''
            return
        }
        const oversized = files.filter(f => f.size > MAX_SIZE)
        if (oversized.length) {
            setFileError('Fichier trop volumineux (max 5 Mo par fichier)')
            e.target.value = ''
            return
        }
        files.forEach(file => {
            const reader = new FileReader()
            reader.onload = ev => {
                setAttachments(prev => [
                    ...prev,
                    { id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, type: file.type, dataUrl: ev.target.result, size: file.size },
                ])
            }
            reader.readAsDataURL(file)
        })
        e.target.value = ''
    }

    function remove(id) {
        setAttachments(prev => prev.filter(a => a.id !== id))
        setFileError('')
    }

    return (
        <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Pièces jointes</label>
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map(a => (
                        <div key={a.id} className="relative group flex flex-col items-center">
                            {a.type.startsWith('image/') ? (
                                <img src={a.dataUrl} alt={a.name} className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                            ) : (
                                <div className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border border-white/10 bg-navy-700 gap-1">
                                    <FileText size={20} className="text-slate-400" />
                                    <span className="text-[9px] text-slate-500 uppercase">{a.name.split('.').pop()}</span>
                                </div>
                            )}
                            <button type="button" onClick={() => remove(a.id)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={9} className="text-white" />
                            </button>
                            <p className="text-[9px] text-slate-500 mt-0.5 w-16 truncate text-center">{a.name}</p>
                        </div>
                    ))}
                </div>
            )}
            {fileError && <p className="text-[11px] text-red-400 mb-2">{fileError}</p>}
            {attachments.length < MAX_FILES && (
                <>
                    <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFiles} className="hidden" />
                    <button type="button" onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs text-slate-400 border border-dashed border-white/15 rounded-lg px-3 py-2 hover:border-sp/40 hover:text-sp transition-colors">
                        <Paperclip size={12} /> Ajouter un fichier
                    </button>
                </>
            )}
        </div>
    )
}

function AddDisputeModal({ onClose, onAdd }) {
    const [form, setForm] = useState({ title: '', parties: ['', ''], priority: 'medium', notes: '' })
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [attachments, setAttachments] = useState([])

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
    function setParty(i, v) { setForm(f => { const p = [...f.parties]; p[i] = v; return { ...f, parties: p } }) }
    function addParty() { setForm(f => ({ ...f, parties: [...f.parties, ''] })) }
    function removeParty(i) { setForm(f => ({ ...f, parties: f.parties.filter((_, j) => j !== i) })) }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.title.trim()) errs.title = 'Titre requis'
        if (form.parties.filter(p => p.trim()).length === 0) errs.parties = 'Au moins une partie requise'
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 700))
        onAdd({ title: form.title.trim(), parties: form.parties.filter(p => p.trim()), priority: form.priority, notes: form.notes.trim(), status: 'open', attachments })
        setSaving(false)
        onClose()
    }

    return (
        <Modal title="Nouveau litige" subtitle="Enregistrer un nouveau litige" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre *</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        placeholder="Ex: Nuisances sonores — Apt 4A vs 4B"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                    {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Parties impliquées</label>
                    <div className="space-y-2">
                        {form.parties.map((p, i) => (
                            <div key={i} className="flex gap-2">
                                <input type="text" value={p} onChange={e => setParty(i, e.target.value)}
                                    placeholder={`Partie ${i + 1} (ex: Ahmed Tazi, Apt 4A)`}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.parties.length > 1 && (
                                    <button type="button" onClick={() => removeParty(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.parties.length < 4 && (
                            <button type="button" onClick={addParty}
                                className="text-xs text-sp hover:text-sp/80 flex items-center gap-1 transition-colors">
                                <Plus size={12} /> Ajouter une partie
                            </button>
                        )}
                    </div>
                    {errors.parties && <p className="text-[11px] text-red-400 mt-1">{errors.parties}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
                    <div className="flex gap-2">
                        {DISPUTE_PRIORITY_BTNS.map(b => (
                            <button type="button" key={b.key} onClick={() => set('priority', b.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.priority === b.key ? b.cls : 'bg-navy-700 border-white/8 text-slate-500 hover:border-white/15'
                                    }`}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes internes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                        placeholder="Contexte, preuves, détails supplémentaires..." rows={3}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
                </div>

                <AttachmentsField attachments={attachments} setAttachments={setAttachments} />

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Check size={15} /> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   EDIT DISPUTE MODAL
══════════════════════════════════════════ */
function EditDisputeModal({ dispute, onClose, onSave, onDelete }) {
    const EDIT_STATUS_INFO = {
        open: { label: 'Ouvert', cls: 'border-red-500/40 text-red-400 bg-red-500/10' },
        mediation: { label: 'Médiation', cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
        resolved: { label: 'Résolu', cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
        closed: { label: 'Clôturé', cls: 'border-slate-500/40 text-slate-400 bg-slate-500/10' },
    }
    const [form, setForm] = useState({
        title: dispute.title,
        parties: [...dispute.parties],
        priority: dispute.priority,
        status: dispute.status,
        notes: dispute.notes ?? '',
    })
    const [attachments, setAttachments] = useState(dispute.attachments ?? [])
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmSave, setConfirmSave] = useState(false)
    const [saving, setSaving] = useState(false)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setConfirmSave(false) }
    function setParty(i, v) { setForm(f => { const p = [...f.parties]; p[i] = v; return { ...f, parties: p } }); setConfirmSave(false) }
    function addParty() { setForm(f => ({ ...f, parties: [...f.parties, ''] })); setConfirmSave(false) }
    function removeParty(i) { setForm(f => ({ ...f, parties: f.parties.filter((_, j) => j !== i) })); setConfirmSave(false) }

    function handleSubmit(e) {
        e.preventDefault()
        if (!form.title.trim()) return
        setConfirmSave(true)
    }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onSave({ ...dispute, ...form, parties: form.parties.filter(p => p.trim()), attachments })
    }

    return (
        <Modal title="Modifier le litige" subtitle={`Réf. ${dispute.id}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre *</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Parties impliquées</label>
                    <div className="space-y-2">
                        {form.parties.map((p, i) => (
                            <div key={i} className="flex gap-2">
                                <input type="text" value={p} onChange={e => setParty(i, e.target.value)}
                                    placeholder={`Partie ${i + 1}`}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.parties.length > 1 && (
                                    <button type="button" onClick={() => removeParty(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.parties.length < 4 && (
                            <button type="button" onClick={addParty}
                                className="text-xs text-sp hover:text-sp/80 flex items-center gap-1 transition-colors">
                                <Plus size={12} /> Ajouter une partie
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
                    <div className="flex gap-2">
                        {DISPUTE_PRIORITY_BTNS.map(b => (
                            <button type="button" key={b.key} onClick={() => set('priority', b.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.priority === b.key ? b.cls : 'bg-navy-700 border-white/8 text-slate-500 hover:border-white/15'
                                    }`}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(EDIT_STATUS_INFO).map(([key, info]) => (
                            <button type="button" key={key} onClick={() => set('status', key)}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.status === key ? info.cls : 'bg-navy-700 border-white/8 text-slate-500 hover:border-white/15'
                                    }`}>
                                {info.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes internes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                        placeholder="Contexte, preuves, détails supplémentaires..." rows={3}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
                </div>

                <AttachmentsField attachments={attachments} setAttachments={setAttachments} />

                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Annuler
                        </button>
                        <button type="submit"
                            className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            <Check size={15} /> Enregistrer
                        </button>
                    </div>
                ) : (
                    <div className="bg-sp/8 border border-sp/25 rounded-xl p-3.5">
                        <p className="text-xs text-slate-300 text-center mb-3">
                            Confirmer les modifications pour <span className="text-white font-semibold">"{form.title}"</span> ?
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmSave(false)}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                Revenir
                            </button>
                            <button type="button" onClick={doSave} disabled={saving}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-sp/20 text-sp border border-sp/30 hover:bg-sp/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={12} /> Oui, enregistrer</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete zone */}
                <div className="border-t border-white/5 pt-3">
                    {!confirmDelete ? (
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            className="w-full py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5">
                            <Trash2 size={12} /> Supprimer ce litige
                        </button>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <p className="text-xs text-red-300 text-center mb-3">Supprimer définitivement ce litige ?</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                    Revenir
                                </button>
                                <button type="button" onClick={() => onDelete(dispute.id)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                                    Oui, supprimer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   PLANNING PAGE
══════════════════════════════════════════ */
const CATEGORY_META = {
    espaces_verts: { icon: Leaf, label: 'Espaces verts', color: 'text-emerald-400' },
    electricite: { icon: Zap, label: 'Électricité', color: 'text-yellow-400' },
    plomberie: { icon: Activity, label: 'Plomberie', color: 'text-blue-400' },
    nettoyage: { icon: CheckCircle2, label: 'Nettoyage', color: 'text-cyan-400' },
    securite: { icon: ShieldCheck, label: 'Sécurité', color: 'text-violet-400' },
    ascenseur: { icon: Wrench, label: 'Ascenseur', color: 'text-orange-400' },
    peinture: { icon: Wrench, label: 'Peinture', color: 'text-pink-400' },
}

/* Pure display card — used both in kanban and in DragOverlay */
function TicketCard({ t, ghost = false, onEdit }) {
    const cat = CATEGORY_META[t.category] ?? CATEGORY_META.plomberie
    const CatIcon = cat.icon
    return (
        <div className={`glass-card p-4 border-l-4 select-none ${t.status === 'in_progress' ? 'border-l-sp' :
                t.status === 'scheduled' ? 'border-l-amber-400' :
                    'border-l-emerald-500'
            } ${ghost ? 'opacity-30' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                    <CatIcon size={13} className={cat.color} />
                    <span className="text-[10px] text-slate-500 font-medium">{cat.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {t.priority === 'urgent'
                        ? <span className="text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full flex-shrink-0">URGENT</span>
                        : <span className="text-[9px] font-semibold bg-slate-700/60 text-slate-400 border border-white/8 px-1.5 py-0.5 rounded-full flex-shrink-0">NORMAL</span>
                    }
                    {onEdit && (
                        <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); onEdit(t) }}
                            className="p-0.5 rounded text-slate-600 hover:text-slate-300 hover:bg-navy-600 transition-colors flex-shrink-0"
                        >
                            <Pencil size={11} />
                        </button>
                    )}
                </div>
            </div>
            <p className={`text-sm font-semibold mb-2 leading-snug ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                {t.title}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Activity size={11} />
                <span className="truncate">{t.agent}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={11} />
                <span>{t.time}</span>
            </div>
        </div>
    )
}

/* Draggable wrapper around TicketCard */
function DraggableTicketCard({ t, onEdit }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id })
    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{
                transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 999 : 'auto',
                touchAction: 'none',
            }}
        >
            <TicketCard t={t} ghost={isDragging} onEdit={onEdit} />
        </div>
    )
}

/* Droppable kanban column */
function KanbanColumn({ status, label, dot, count, children }) {
    const { setNodeRef, isOver } = useDroppable({ id: status })
    const badgeCls =
        status === 'in_progress' ? 'bg-sp/15 text-sp' :
            status === 'scheduled' ? 'bg-amber-400/15 text-amber-400' :
                'bg-emerald-500/15 text-emerald-400'
    const borderCls =
        status === 'in_progress' ? 'border-b-sp/50' :
            status === 'scheduled' ? 'border-b-amber-400/50' :
                'border-b-emerald-500/50'
    return (
        <div>
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderCls}`}>
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{count}</span>
            </div>
            <div
                ref={setNodeRef}
                className={`min-h-[100px] space-y-3 rounded-xl p-1 transition-all duration-150 ${isOver ? 'bg-white/[0.04] ring-1 ring-white/10 scale-[1.01]' : ''
                    }`}
            >
                {children}
                {count === 0 && !isOver && (
                    <p className="text-xs text-slate-700 text-center py-8">Glissez une tâche ici</p>
                )}
            </div>
        </div>
    )
}

/* Edit ticket modal */
function EditTicketModal({ ticket, onSave, onClose }) {
    const [form, setForm] = useState({
        title: ticket.title,
        agent: ticket.agent,
        time: ticket.time,
        date: ticket.date ?? '',
        category: ticket.category,
        priority: ticket.priority,
    })
    function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }
    const categories = Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k, label: v.label }))
    return (
        <Modal title="Modifier la tâche" subtitle={form.title} onClose={onClose}>
            <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Titre</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Prestataire</label>
                    <input type="text" value={form.agent} onChange={e => set('agent', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Heure</label>
                        <input type="text" placeholder="ex: Lun. 10:00" value={form.time} onChange={e => set('time', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Catégorie</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors">
                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-2 font-medium">Priorité</label>
                    <div className="flex gap-2">
                        <button onClick={() => set('priority', 'normal')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${form.priority !== 'urgent'
                                    ? 'bg-slate-700/60 text-slate-200 border-white/15'
                                    : 'bg-navy-700 text-slate-500 border-white/8 hover:border-white/20'
                                }`}>Normal</button>
                        <button onClick={() => set('priority', 'urgent')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${form.priority === 'urgent'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                    : 'bg-navy-700 text-slate-500 border-white/8 hover:border-red-500/30 hover:text-red-400'
                                }`}>URGENT</button>
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-navy-700 text-slate-300 border border-white/10 hover:bg-navy-600 transition-colors">
                        Annuler
                    </button>
                    <button onClick={() => onSave(form)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-sp hover:bg-sp-dark text-navy-900 transition-all shadow-glow-cyan">
                        Enregistrer
                    </button>
                </div>
            </div>
        </Modal>
    )
}

function PlanningPage({ building, data, showToast }) {
    const [tickets, setTickets] = useState(data.tickets)
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [activeId, setActiveId] = useState(null)
    const [editingTicket, setEditingTicket] = useState(null)

    function handleSaveEdit(form) {
        setTickets(prev => prev.map(t => t.id === editingTicket.id ? { ...t, ...form } : t))
        setEditingTicket(null)
        showToast('Tâche mise à jour')
    }

    const activeTicket = activeId ? tickets.find(t => t.id === activeId) : null

    const counts = {
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        scheduled: tickets.filter(t => t.status === 'scheduled').length,
        done: tickets.filter(t => t.status === 'done').length,
    }

    const filterLabels = { all: 'Tous', in_progress: 'En cours', scheduled: 'Planifié', done: 'Terminé' }

    const columns = [
        { status: 'in_progress', label: 'En cours', dot: 'bg-sp' },
        { status: 'scheduled', label: 'Planifié', dot: 'bg-amber-400' },
        { status: 'done', label: 'Terminé', dot: 'bg-emerald-500' },
    ]

    function handleDragStart({ active }) {
        setActiveId(active.id)
    }

    function handleDragEnd({ active, over }) {
        setActiveId(null)
        if (!over || active.id === over.id) return
        const newStatus = over.id
        if (!['in_progress', 'scheduled', 'done'].includes(newStatus)) return
        setTickets(prev => prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t))
    }

    function handleDragCancel() { setActiveId(null) }

    const filtered = tickets.filter(t => {
        const q = search.toLowerCase()
        return (t.title.toLowerCase().includes(q) || t.agent.toLowerCase().includes(q)) &&
            (filter === 'all' || t.status === filter)
    })

    const showKanban = filter === 'all' && !search

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Planning maintenance</h2>
                    <p className="text-slate-400 mt-0.5 text-sm">
                        <span className="font-semibold" style={{ color: building.color }}>{building.name} · {building.city}</span>
                        {' '}— {tickets.length} tâches au total
                    </p>
                </div>
                <button
                    onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all shadow-glow-cyan"
                >
                    <Plus size={15} /> Nouvelle tâche
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'En cours', value: counts.in_progress, color: 'text-sp', border: 'border-sp/20' },
                    { label: 'Planifié', value: counts.scheduled, color: 'text-amber-400', border: 'border-amber-400/20' },
                    { label: 'Terminé', value: counts.done, color: 'text-emerald-400', border: 'border-emerald-400/20' },
                ].map(s => (
                    <StatCard key={s.label} className={`glass-card p-5 border ${s.border}`}>
                        <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                        <p className="text-sm text-slate-400 font-medium">{s.label}</p>
                    </StatCard>
                ))}
            </div>

            {/* Filter bar + Search */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-2">
                    {Object.entries(filterLabels).map(([f, label]) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-sp text-navy-900' : 'bg-navy-800 text-slate-400 border border-white/8 hover:border-sp/30'
                                }`}
                        >
                            {label}{f !== 'all' && ` (${counts[f] ?? 0})`}
                        </button>
                    ))}
                </div>
                <div className="flex-1 relative min-w-[200px]">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Rechercher une tâche ou un prestataire..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-navy-800 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>
                {showKanban && (
                    <p className="text-[11px] text-slate-600 flex-shrink-0">Glisser-déposer pour changer le statut</p>
                )}
            </div>

            {/* Kanban with DnD */}
            {showKanban ? (
                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                    <div className="grid grid-cols-3 gap-5">
                        {columns.map(col => (
                            <KanbanColumn key={col.status} {...col} count={counts[col.status]}>
                                {tickets.filter(t => t.status === col.status).map(t => (
                                    <DraggableTicketCard key={t.id} t={t} onEdit={setEditingTicket} />
                                ))}
                            </KanbanColumn>
                        ))}
                    </div>
                    <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
                        {activeTicket && (
                            <div className="rotate-2 scale-105 shadow-2xl opacity-95">
                                <TicketCard t={activeTicket} />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            ) : (
                /* List view when filtered or searching */
                <div className="space-y-3">
                    {filtered.map(t => {
                        const cat = CATEGORY_META[t.category] ?? CATEGORY_META.plomberie
                        const CatIcon = cat.icon
                        return (
                            <div key={t.id} className={`glass-card p-4 border-l-4 flex items-center gap-5 ${t.status === 'in_progress' ? 'border-l-sp' :
                                    t.status === 'scheduled' ? 'border-l-amber-400' :
                                        'border-l-emerald-500'
                                }`}>
                                <CatIcon size={16} className={`${cat.color} flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-sm ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                                        {t.title}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">{t.agent} · {t.time}</p>
                                </div>
                                <StatusBadge status={t.status} />
                                {t.priority === 'urgent' && (
                                    <span className="text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full">URGENT</span>
                                )}
                                <button onClick={() => setEditingTicket(t)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-navy-600 transition-colors flex-shrink-0">
                                    <Pencil size={13} />
                                </button>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucune tâche trouvée</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {editingTicket && (
                    <EditTicketModal
                        ticket={editingTicket}
                        onSave={handleSaveEdit}
                        onClose={() => setEditingTicket(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   MODAL WRAPPER
══════════════════════════════════════════ */
function Modal({ title, subtitle, onClose, children, width = 'max-w-lg' }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18 }}
                className={`relative w-full ${width} bg-navy-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
            >
                <div className="flex items-start justify-between p-6 border-b border-white/5 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-white">{title}</h2>
                        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-navy-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </motion.div>
        </div>
    )
}

/* ── Small spinner ── */
function Spinner() {
    return <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
}

/* ══════════════════════════════════════════
   ADD EXPENSE MODAL
══════════════════════════════════════════ */
function AddExpenseModal({ onClose, onAdd, suppliers = [] }) {
    const [form, setForm] = useState({
        category: EXPENSE_CATEGORIES[0].label,
        amount: '',
        vendorId: suppliers.length > 0 ? '' : 'autre',  // '' = not chosen yet, 'autre' = free text
        vendor: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        hasInvoice: false,
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function handleVendorSelect(e) {
        const id = e.target.value
        if (id === 'autre') {
            setForm(f => ({ ...f, vendorId: 'autre', vendor: '' }))
        } else {
            const sup = suppliers.find(s => s.id === id)
            setForm(f => ({ ...f, vendorId: id, vendor: sup ? sup.name : '' }))
        }
        setErrors(p => ({ ...p, vendor: null }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Montant requis'
        if (!form.vendor.trim()) errs.vendor = 'Fournisseur requis'
        if (suppliers.length > 0 && !form.vendorId) errs.vendor = 'Sélectionnez un fournisseur ou "Autre"'
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        const cat = EXPENSE_CATEGORIES.find(c => c.label === form.category)
        onAdd({
            category: form.category,
            amount: parseInt(form.amount),
            color: cat?.color ?? 'bg-slate-500',
            vendor: form.vendor.trim(),
            date: form.date,
            description: form.description,
            hasInvoice: form.hasInvoice,
            isNew: true,
        })
        setSaving(false)
        onClose()
    }

    return (
        <Modal
            title="Ajouter une dépense"
            subtitle="Enregistrée dans le journal de transparence · visible aux résidents"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Catégorie</label>
                    <select
                        value={form.category}
                        onChange={e => set('category', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors"
                    >
                        {EXPENSE_CATEGORIES.map(c => (
                            <option key={c.label} value={c.label}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Montant (MAD) *</label>
                        <input
                            type="number" min="1" placeholder="0"
                            value={form.amount}
                            onChange={e => { set('amount', e.target.value); setErrors(p => ({ ...p, amount: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.amount ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                        {errors.amount && <p className="text-[10px] text-red-400 mt-1">{errors.amount}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date *</label>
                        <input
                            type="date" value={form.date}
                            onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fournisseur / Prestataire *</label>
                    {suppliers.length > 0 ? (
                        <div className="space-y-2">
                            <select
                                value={form.vendorId}
                                onChange={handleVendorSelect}
                                className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors ${errors.vendor ? 'border-red-500/50 text-red-300' : 'border-white/10 focus:border-sp/40 text-slate-200'}`}
                            >
                                <option value="" disabled>— Sélectionner un fournisseur —</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} · {catInfo(s.category).label}</option>
                                ))}
                                <option value="autre">— Autre (prestataire non répertorié) —</option>
                            </select>
                            {form.vendorId === 'autre' && (
                                <input
                                    type="text" placeholder="Nom du prestataire…"
                                    value={form.vendor}
                                    onChange={e => { set('vendor', e.target.value); setErrors(p => ({ ...p, vendor: null })) }}
                                    autoFocus
                                    className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.vendor ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                                />
                            )}
                        </div>
                    ) : (
                        <input
                            type="text" placeholder="ex: Otis Morocco, ProNettoyage SARL…"
                            value={form.vendor}
                            onChange={e => { set('vendor', e.target.value); setErrors(p => ({ ...p, vendor: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.vendor ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                    )}
                    {errors.vendor && <p className="text-[10px] text-red-400 mt-1">{errors.vendor}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                    <textarea
                        placeholder="Détail de la prestation…"
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        rows={2}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none"
                    />
                </div>

                {/* Invoice toggle */}
                <div
                    onClick={() => set('hasInvoice', !form.hasInvoice)}
                    className={`border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${form.hasInvoice ? 'border-sp/50 bg-sp/5' : 'border-white/10 hover:border-sp/30'
                        }`}
                >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${form.hasInvoice ? 'bg-sp/20' : 'bg-navy-600'}`}>
                        {form.hasInvoice ? <Check size={16} className="text-sp" /> : <Upload size={16} className="text-slate-400" />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-200">
                            {form.hasInvoice ? 'Facture jointe ✓' : 'Joindre une facture'}
                        </p>
                        <p className="text-[11px] text-slate-500">PDF, JPG, PNG · Visible aux résidents</p>
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Plus size={15} /> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ── Searchable resident combobox ─────────────────────────────────────── */
function ResidentCombobox({ residents, value, onChange }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef(null)
    const inputRef = useRef(null)

    const selected = residents.find(r => r.id === value)

    const filteredOptions = residents.filter(r => {
        if (!query) return true
        const q = query.toLowerCase()
        return r.name.toLowerCase().includes(q) || r.unit.toLowerCase().includes(q)
    })

    // Close when clicking outside
    useEffect(() => {
        function onDown(e) { if (!containerRef.current?.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [])

    // Auto-focus search input when opening
    useEffect(() => {
        if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 30) }
    }, [open])

    function select(id) { onChange(id); setOpen(false) }

    function stColor(r) {
        const s = computeStatus(r.paidThrough)
        return s === 'paid' ? 'text-emerald-400' : s === 'pending' ? 'text-amber-400' : 'text-red-400'
    }
    function stIcon(r) {
        const s = computeStatus(r.paidThrough)
        return s === 'paid' ? '✓' : s === 'pending' ? '⏳' : '⚠'
    }
    function stLabel(r) {
        const s = computeStatus(r.paidThrough)
        return s === 'paid' ? 'À jour' : s === 'pending' ? 'Attente' : 'Retard'
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-left flex items-center gap-2 hover:border-white/20 focus:outline-none focus:border-sp/40 transition-colors"
            >
                {selected ? (
                    <>
                        <span className={`text-xs flex-shrink-0 ${stColor(selected)}`}>{stIcon(selected)}</span>
                        <span className="font-mono text-[11px] text-sp/80 flex-shrink-0">{selected.unit}</span>
                        <span className="text-slate-200 flex-1 truncate">— {selected.name}</span>
                    </>
                ) : (
                    <span className="text-slate-500 flex-1">Sélectionner un résident…</span>
                )}
                <ChevronDown size={13} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-[#0d1629] border border-white/12 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-white/8">
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Nom ou numéro d'unité…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                                className="w-full bg-navy-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 border border-white/8 focus:border-sp/30 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Results */}
                    <div className="max-h-52 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-4">Aucun résultat</p>
                        ) : filteredOptions.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => select(r.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-colors ${r.id === value ? 'bg-sp/12 text-sp' : 'hover:bg-navy-700 text-slate-300'
                                    }`}
                            >
                                <span className={`flex-shrink-0 w-4 text-center ${stColor(r)}`}>{stIcon(r)}</span>
                                <span className="font-mono text-[10px] text-slate-500 flex-shrink-0 w-10">{r.unit}</span>
                                <span className={`flex-1 truncate ${r.id === value ? 'font-semibold' : ''}`}>{r.name}</span>
                                <span className={`flex-shrink-0 text-[10px] font-semibold ${stColor(r)}`}>{stLabel(r)}</span>
                            </button>
                        ))}
                    </div>

                    {filteredOptions.length > 0 && (
                        <div className="px-3 py-1.5 border-t border-white/5 text-[10px] text-slate-600 text-right">
                            {filteredOptions.length} résultat{filteredOptions.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/* ══════════════════════════════════════════
   RECORD PAYMENT MODAL
══════════════════════════════════════════ */
function RecordPaymentModal({ building, residents, onClose, onRecord, presetResidentId }) {
    const [form, setForm] = useState({
        residentId: presetResidentId ?? residents[0]?.id ?? '',
        months: 1,
        amount: '',
        method: 'especes',
        date: new Date().toISOString().slice(0, 10),
        ref: '',
    })
    const [saving, setSaving] = useState(false)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    const selectedResident = residents.find(r => r.id === form.residentId)
    const coveredThrough = selectedResident
        ? advancePaidThrough(selectedResident.paidThrough, form.months)
        : null

    async function handleSubmit(e) {
        e.preventDefault()
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        onRecord({ residentId: form.residentId, months: form.months })
        if (form.amount && selectedResident) generatePaymentReceipt(building, selectedResident, form, coveredThrough)
        setSaving(false)
        onClose()
    }

    return (
        <Modal
            title="Enregistrer un paiement"
            subtitle="Le statut sera recalculé automatiquement"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Résident *</label>
                    <ResidentCombobox
                        residents={residents}
                        value={form.residentId}
                        onChange={id => set('residentId', id)}
                    />
                    {selectedResident && (
                        <p className="text-[10px] text-slate-500 mt-1.5">
                            Actuellement payé jusqu'à : <span className="text-slate-300 font-medium">{formatMonth(selectedResident.paidThrough)}</span>
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Nombre de mois couverts *</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 6, 12].map(n => (
                            <button type="button" key={n} onClick={() => set('months', n)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.months === n
                                        ? 'bg-sp/15 border-sp/40 text-sp'
                                        : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                    }`}>
                                {n === 12 ? '1 an' : `${n} mois`}
                            </button>
                        ))}
                    </div>
                    {coveredThrough && (
                        <div className="mt-2.5 flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2">
                            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                            <p className="text-xs text-emerald-300">
                                Couvert jusqu'à : <span className="font-bold">{formatMonth(coveredThrough)}</span>
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Montant payé</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            placeholder="ex: 1500"
                            value={form.amount}
                            onChange={e => set('amount', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 pr-14 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">MAD</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mode de paiement</label>
                        <div className="flex flex-col gap-1.5">
                            {[
                                { value: 'especes', label: 'Espèces' },
                                { value: 'virement', label: 'Virement' },
                                { value: 'cheque', label: 'Chèque' },
                            ].map(m => (
                                <button type="button" key={m.value} onClick={() => set('method', m.value)}
                                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.method === m.value
                                            ? 'bg-sp/15 border-sp/40 text-sp'
                                            : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                        }`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date de réception</label>
                            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Référence / N° reçu</label>
                            <input type="text" placeholder="Optionnel" value={form.ref} onChange={e => set('ref', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><CheckCircle2 size={15} /> Confirmer le paiement</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   ADD RESIDENT MODAL
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   WHATSAPP GROUP REMINDER MODAL
══════════════════════════════════════════ */
function WhatsAppGroupModal({ overdueResidents, building, onClose }) {
    const bankName = building.payment_bank           || '[NOM BANQUE]'
    const rib      = building.payment_rib            || '[XXXX XXXX XXXX XXXX XXXX XX]'
    const holder   = building.payment_account_holder || building.name
    const defaultMsg =
        `Bonjour,

Nous vous rappelons que votre cotisation de syndic est actuellement en retard de paiement.

Merci de régulariser votre situation dans les meilleurs délais par virement bancaire :

🏦 Banque : ${bankName}
📋 RIB : ${rib}
👤 Titulaire : ${holder}

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
— ${building.name}`
    const [msg, setMsg] = useState(defaultMsg)

    return (
        <Modal title="Rappel de paiement groupé" subtitle={`${overdueResidents.length} résident${overdueResidents.length > 1 ? 's' : ''} en retard`} onClose={onClose} width="max-w-xl">
            <div className="mb-5">
                <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider font-semibold">Message</label>
                <textarea
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    rows={4}
                    className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-sp/50 resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">Vous pouvez modifier le message avant d'envoyer.</p>
            </div>
            <div className="space-y-2">
                {overdueResidents.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-navy-800 border border-white/5">
                        <div>
                            <p className="text-sm font-medium text-slate-200">{r.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{r.unit} · {r.phone}</p>
                        </div>
                        <button
                            onClick={() => {
                                const num = r.phone.replace(/[^0-9]/g, '')
                                window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
                            }}
                            className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                        >
                            <MessageCircle size={12} /> Envoyer
                        </button>
                    </div>
                ))}
            </div>
        </Modal>
    )
}

function EditResidentModal({ resident, onSave, onDelete, onClose, allResidents = [] }) {
    const [form, setForm] = useState({
        name: resident.name,
        phone: resident.phone === '—' ? '' : resident.phone,
        unit: resident.unit,
        floor: resident.floor?.toString() ?? '',
        type: resident.type ?? 'proprietaire',
        paidThrough: resident.paidThrough ?? '',
        monthly_fee: resident.monthly_fee?.toString() ?? '',
        portalPin: resident.portalPin ?? '',
    })
    const [saving, setSaving] = useState(false)
    const [confirmSave, setConfirmSave] = useState(false)
    const [confirmDel, setConfirmDel] = useState(false)
    const [errors, setErrors] = useState({})
    const [pinCopied, setPinCopied] = useState(false)

    function set(k, v) {
        setForm(f => ({ ...f, [k]: v }))
        setConfirmSave(false) // reset confirm if user keeps editing
    }

    function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.name.trim()) errs.name = 'Nom requis'
        if (!form.unit.trim()) errs.unit = "Numéro d'unité requis"
        if (Object.keys(errs).length) { setErrors(errs); return }
        setConfirmSave(true)
    }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onSave({
            ...resident,
            name: form.name.trim(),
            unit: form.unit.toUpperCase(),
            phone: form.phone || '—',
            floor: parseInt(form.floor) || 0,
            type: form.type,
            paidThrough: form.paidThrough || resident.paidThrough,
            monthly_fee: form.monthly_fee ? parseInt(form.monthly_fee) : resident.monthly_fee,
            ...(form.portalPin ? { portalPin: form.portalPin } : {}),
        })
    }

    return (
        <Modal title="Modifier le résident" subtitle={resident.name} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom complet *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => { set('name', e.target.value); setErrors(p => ({ ...p, name: null })) }}
                        className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                    />
                    {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Numéro d'unité *</label>
                        <input
                            type="text"
                            value={form.unit}
                            onChange={e => { set('unit', e.target.value); setErrors(p => ({ ...p, unit: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.unit ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                        {errors.unit && <p className="text-[10px] text-red-400 mt-1">{errors.unit}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Étage</label>
                        <input
                            type="number" min={0}
                            value={form.floor}
                            onChange={e => set('floor', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone WhatsApp</label>
                    <input
                        type="tel" placeholder="+212 6XX XXX XXX"
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: 'proprietaire', label: 'Propriétaire' },
                            { value: 'locataire', label: 'Locataire' },
                        ].map(t => (
                            <button
                                type="button" key={t.value}
                                onClick={() => set('type', t.value)}
                                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.type === t.value
                                        ? 'bg-sp/15 border-sp/40 text-sp'
                                        : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Charge mensuelle fixe ── */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Charge mensuelle fixe
                        <span className="ml-1.5 text-[10px] font-normal text-slate-500">— peut différer selon l'appartement</span>
                    </label>
                    <div className="relative">
                        <input
                            type="number" min={0} placeholder="250"
                            value={form.monthly_fee}
                            onChange={e => set('monthly_fee', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 pr-14 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold">MAD/mois</span>
                    </div>
                </div>

                {/* ── PIN Portail Résident ── */}
                <div className="border-t border-white/8 pt-4">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        PIN portail résident
                        <span className="ml-2 text-[10px] font-normal text-slate-500">— 4 chiffres, communiqué par WhatsApp</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-sp tracking-[0.3em] text-center select-all">
                            {form.portalPin || '—'}
                        </code>
                        <button type="button"
                            title="Copier le PIN"
                            onClick={() => {
                                if (!form.portalPin) return
                                navigator.clipboard.writeText(form.portalPin).catch(() => {})
                                setPinCopied(true)
                                setTimeout(() => setPinCopied(false), 2000)
                            }}
                            className="p-2.5 bg-navy-700 border border-white/10 rounded-xl hover:border-sp/30 transition-colors flex-shrink-0"
                        >
                            {pinCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
                        </button>
                        <button type="button"
                            title="Générer un nouveau PIN"
                            onClick={() => { set('portalPin', generatePortalPin(allResidents.filter(x => x.id !== resident.id).map(r => r.portalPin).filter(Boolean))); setConfirmSave(false) }}
                            className="p-2.5 bg-navy-700 border border-white/10 rounded-xl hover:border-amber-400/30 hover:text-amber-400 text-slate-400 transition-colors flex-shrink-0"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    {!form.portalPin && (
                        <p className="text-[10px] text-amber-400/70 mt-1.5">Aucun PIN — cliquez sur ↻ pour en générer un.</p>
                    )}
                </div>

                {/* ── Correction du paiement ── */}
                <div className="border-t border-white/8 pt-4">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Payé jusqu'au mois
                        <span className="ml-2 text-[10px] font-normal text-amber-400/80">correction directe</span>
                    </label>
                    <input
                        type="month"
                        value={form.paidThrough}
                        onChange={e => set('paidThrough', e.target.value)}
                        max={CURRENT_MONTH}
                        className="w-full bg-navy-700 border border-amber-500/25 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-400/50 transition-colors"
                    />
                    <p className="text-[10px] text-slate-600 mt-1.5">
                        Actuellement : <span className="text-slate-400 font-medium">{formatMonth(resident.paidThrough)}</span> — modifiez ici pour corriger une erreur de saisie.
                    </p>
                </div>

                {/* Save buttons — step 1: normal, step 2: confirm */}
                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <Spinner /> : <><Check size={14} /> Enregistrer</>}
                        </button>
                    </div>
                ) : (
                    <div className="border border-sp/30 bg-sp/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs text-slate-300 text-center leading-relaxed">
                            Confirmer les modifications pour <span className="font-bold text-white">{form.name.trim() || resident.name}</span> ?
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmSave(false)}
                                className="flex-1 py-2 bg-navy-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                                Revenir
                            </button>
                            <button type="button" onClick={doSave} disabled={saving}
                                className="flex-1 py-2 bg-sp hover:bg-sp-dark text-navy-900 rounded-lg text-xs font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={13} /> Oui, enregistrer</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete zone */}
                <div className={`border rounded-xl transition-all overflow-hidden ${confirmDel ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'}`}>
                    {!confirmDel ? (
                        <button type="button" onClick={() => setConfirmDel(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={13} /> Supprimer ce résident
                        </button>
                    ) : (
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-red-300 text-center leading-relaxed">
                                Supprimer <span className="font-bold text-white">{resident.name}</span> définitivement ?<br />
                                <span className="text-slate-500">Cette action est irréversible.</span>
                            </p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmDel(false)}
                                    className="flex-1 py-2 bg-navy-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                                    Annuler
                                </button>
                                <button type="button" onClick={() => onDelete(resident.id)}
                                    className="flex-1 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1.5">
                                    <Trash2 size={12} /> Confirmer la suppression
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    )
}

function AddResidentModal({ onClose, onAdd, building, residents = [] }) {
    const [form, setForm] = useState({
        name: '',
        phone: '',
        unit: '',
        floor: '',
        type: 'proprietaire',
        monthly_fee: '250',
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const [sendWA, setSendWA] = useState(true)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.name.trim()) errs.name = 'Nom requis'
        if (!form.unit.trim()) errs.unit = "Numéro d'unité requis"
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        const newResident = {
            id: `r-${Date.now()}`,
            unit: form.unit.toUpperCase(),
            name: form.name.trim(),
            phone: form.phone || '—',
            floor: parseInt(form.floor) || 0,
            paidThrough: advancePaidThrough(CURRENT_MONTH, -1),
            since: new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
            type: form.type,
            monthly_fee: parseInt(form.monthly_fee) || 250,
            portalPin: generatePortalPin(residents.map(r => getResidentPortalPin(r, building.id)).filter(Boolean)),
            isNew: true,
        }
        onAdd(newResident)
        if (sendWA && form.phone.trim()) openPortalWhatsApp(newResident, building)
        setSaving(false)
        onClose()
    }

    const hasPhone = form.phone.trim().length > 0

    return (
        <Modal
            title="Ajouter un résident"
            subtitle="Renseignez les informations du nouveau résident"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom complet *</label>
                    <input
                        type="text" placeholder="Prénom et Nom"
                        value={form.name}
                        onChange={e => { set('name', e.target.value); setErrors(p => ({ ...p, name: null })) }}
                        className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                    />
                    {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Numéro d'unité *</label>
                        <input
                            type="text" placeholder="ex: B-07"
                            value={form.unit}
                            onChange={e => { set('unit', e.target.value); setErrors(p => ({ ...p, unit: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.unit ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                        {errors.unit && <p className="text-[10px] text-red-400 mt-1">{errors.unit}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Étage</label>
                        <input
                            type="number" placeholder="ex: 3" min={0}
                            value={form.floor}
                            onChange={e => set('floor', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone WhatsApp</label>
                    <input
                        type="tel" placeholder="+212 6XX XXX XXX"
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: 'proprietaire', label: 'Propriétaire' },
                            { value: 'locataire', label: 'Locataire' },
                        ].map(t => (
                            <button
                                type="button" key={t.value}
                                onClick={() => set('type', t.value)}
                                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.type === t.value
                                        ? 'bg-sp/15 border-sp/40 text-sp'
                                        : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Charge mensuelle fixe
                        <span className="ml-1.5 text-[10px] font-normal text-slate-500">— peut différer selon l'appartement</span>
                    </label>
                    <div className="relative">
                        <input
                            type="number" min={0} placeholder="250"
                            value={form.monthly_fee}
                            onChange={e => set('monthly_fee', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 pr-14 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold">MAD/mois</span>
                    </div>
                </div>

                {/* WhatsApp send toggle */}
                <button
                    type="button"
                    onClick={() => hasPhone && setSendWA(v => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
                        ${!hasPhone ? 'opacity-40 cursor-not-allowed border-white/8 bg-white/[0.02]' :
                          sendWA ? 'bg-emerald-500/8 border-emerald-500/25 cursor-pointer hover:bg-emerald-500/12' :
                          'bg-white/[0.02] border-white/8 cursor-pointer hover:bg-white/[0.04]'}`}
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${sendWA && hasPhone ? 'bg-emerald-500 border-emerald-500' : 'border-white/25'}`}>
                        {sendWA && hasPhone && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium transition-colors ${sendWA && hasPhone ? 'text-emerald-300' : 'text-slate-500'}`}>
                            Envoyer les accès portail par WhatsApp
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                            {hasPhone
                                ? 'Code résidence + PIN — WhatsApp s\'ouvrira avec le message pré-rempli'
                                : 'Saisissez un numéro de téléphone pour activer'}
                        </p>
                    </div>
                    <MessageCircle size={14} className={`flex-shrink-0 transition-colors ${sendWA && hasPhone ? 'text-emerald-400' : 'text-slate-600'}`} />
                </button>

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : sendWA && hasPhone
                            ? <><Plus size={15} /> Ajouter & Envoyer WA</>
                            : <><Plus size={15} /> Ajouter</>
                        }
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   IMPORT CSV / EXCEL MODAL  (3-step wizard)
══════════════════════════════════════════ */

// Column header aliases → internal key mapping (handles French accents + common variants)
const COL_ALIAS = {
    nom: 'nom', name: 'nom', 'nom complet': 'nom', 'full name': 'nom',
    telephone: 'telephone', tel: 'telephone', phone: 'telephone', mobile: 'telephone',
    'téléphone': 'telephone', 'numero': 'telephone', 'numéro': 'telephone',
    unite: 'unite', 'unité': 'unite', unit: 'unite', appartement: 'unite',
    appart: 'unite', appt: 'unite', 'n° appart': 'unite', 'n°appart': 'unite',
    etage: 'etage', 'étage': 'etage', floor: 'etage', niveau: 'etage',
    type: 'type', 'type résident': 'type', 'type resident': 'type',
    quota: 'quota', 'quote-part': 'quota', 'quotepart': 'quota',
}

const COL_LABEL = {
    nom: 'Nom complet', telephone: 'Téléphone WhatsApp',
    unite: 'Unité', etage: 'Étage', type: 'Type de résident', quota: 'Quote-part',
}

function normalizeHeader(h) {
    return COL_ALIAS[
        String(h).toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
            .replace(/[^a-z0-9 °#-]/g, '')                      // keep alphanums + space/dash
            .trim()
    ] || null
}

function mapRowsToObjects(rawHeaders, dataLines) {
    const mapped = rawHeaders.map(h => normalizeHeader(h))
    if (!mapped.includes('nom') || !mapped.includes('unite')) {
        throw new Error('Colonnes obligatoires manquantes : "nom" et "unite" (ou "unité") doivent être présentes.')
    }
    return dataLines
        .filter(row => row.some(c => String(c).trim() !== ''))
        .map(row => {
            const obj = {}
            mapped.forEach((key, i) => { if (key) obj[key] = String(row[i] ?? '').trim() })
            return obj
        })
        .filter(r => r.nom && r.unite)
}

function downloadResidentsTemplate() {
    const headers = 'nom;telephone;unite;etage;type;quota'
    const example = 'Rachid Benkirane;+212 661 234 567;A-01;1;Propriétaire;250'
    const blob = new Blob(['\uFEFF' + headers + '\n' + example + '\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modele_residents_syndicpulse.csv'; a.click()
    URL.revokeObjectURL(url)
}

function ImportCSVModal({ onClose, onImport }) {
    const [step, setStep] = useState(1)
    const [fileName, setFileName] = useState('')
    const [parsedRows, setParsedRows] = useState([])
    const [parseError, setParseError] = useState('')
    const [importing, setImporting] = useState(false)
    const fileRef = useRef(null)

    const detectedCols = parsedRows.length > 0
        ? Object.keys(parsedRows[0]).filter(k => COL_LABEL[k])
        : []
    const previewRows = parsedRows.slice(0, 5)

    async function handleFile(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setParseError('')
        setFileName(file.name)
        try {
            let rows
            if (/\.xlsx?$/i.test(file.name)) {
                // Excel: parse with SheetJS
                const buffer = await file.arrayBuffer()
                const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
                if (data.length < 2) throw new Error('Le fichier Excel est vide ou ne contient pas de données.')
                rows = mapRowsToObjects(data[0].map(String), data.slice(1))
            } else {
                // CSV: parse natively
                const text = await file.text()
                const firstLine = text.split('\n')[0]
                const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','
                const lines = text.trim().split(/\r?\n/).map(l =>
                    l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
                )
                if (lines.length < 2) throw new Error('Le fichier CSV est vide.')
                rows = mapRowsToObjects(lines[0], lines.slice(1))
            }
            if (rows.length === 0) throw new Error('Aucun résident valide trouvé (les colonnes "nom" et "unité" sont obligatoires).')
            setParsedRows(rows)
            setStep(2)
        } catch (err) {
            setParseError(err.message || 'Erreur de lecture du fichier.')
            fileRef.current.value = ''
        }
    }

    async function handleImport() {
        setImporting(true)
        await new Promise(r => setTimeout(r, 900))
        onImport(parsedRows.map((row, i) => ({
            id: `csv-${Date.now()}-${i}`,
            unit: row.unite,
            name: row.nom,
            phone: row.telephone || '',
            floor: parseInt(row.etage) || 0,
            paidThrough: advancePaidThrough(CURRENT_MONTH, -1),
            since: formatMonth(CURRENT_MONTH),
            type: (row.type || 'propriétaire').toLowerCase(),
            quota: row.quota ? parseFloat(row.quota) : null,
            isNew: true,
        })))
        setImporting(false)
        setStep(3)
    }

    const STEPS = [
        { n: 1, label: 'Sélectionner fichier' },
        { n: 2, label: 'Vérifier la correspondance' },
        { n: 3, label: 'Confirmation' },
    ]

    return (
        <Modal
            title="Importer depuis Excel / CSV"
            subtitle="Migrez vos données existantes en quelques secondes"
            onClose={onClose}
            width="max-w-2xl"
        >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
                {STEPS.map(({ n, label }, idx) => (
                    <div key={n} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step > n ? 'bg-emerald-500 text-white' :
                                step === n ? 'bg-sp text-navy-900' :
                                    'bg-navy-600 text-slate-500'
                            }`}>
                            {step > n ? <Check size={12} /> : n}
                        </div>
                        <span className={`text-xs ${step === n ? 'text-slate-200 font-semibold' : 'text-slate-500'}`}>{label}</span>
                        {idx < STEPS.length - 1 && <div className={`w-8 h-px ${step > n ? 'bg-emerald-500' : 'bg-navy-600'}`} />}
                    </div>
                ))}
            </div>

            {/* Step 1: Drop zone */}
            {step === 1 && (
                <div>
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-white/15 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-sp/40 hover:bg-sp/3 transition-all group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-navy-700 border border-white/8 flex items-center justify-center group-hover:border-sp/20 transition-all">
                            <Upload size={24} className="text-slate-400 group-hover:text-sp transition-colors" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-200 mb-1">Glissez votre fichier ici</p>
                            <p className="text-xs text-slate-500">ou cliquez pour parcourir</p>
                            <p className="text-[11px] text-slate-600 mt-1">Excel (.xlsx / .xls) · CSV · max 10 Mo</p>
                        </div>
                        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                    </div>
                    {parseError && (
                        <div className="mt-3 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300">{parseError}</p>
                        </div>
                    )}
                    <div className="mt-4 flex items-center justify-between px-1">
                        <p className="text-xs text-slate-500">Colonnes requises : <span className="font-mono text-slate-400">nom, unite</span></p>
                        <button onClick={downloadResidentsTemplate} className="text-xs text-sp hover:text-sp-light flex items-center gap-1.5 transition-colors">
                            <Download size={12} /> Télécharger le modèle CSV
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Column mapping + data preview */}
            {step === 2 && (
                <div className="space-y-5">
                    {/* File info */}
                    <div className="flex items-center gap-3 bg-navy-700 rounded-xl px-4 py-3 border border-white/5">
                        <FileText size={16} className="text-sp flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{fileName}</p>
                            <p className="text-[11px] text-slate-500">
                                {parsedRows.length} résident{parsedRows.length > 1 ? 's' : ''} détecté{parsedRows.length > 1 ? 's' : ''} · {detectedCols.length} colonnes mappées automatiquement
                            </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                            Valide
                        </span>
                    </div>

                    {/* Column mapping */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2.5">Correspondance des colonnes détectées</p>
                        <div className="space-y-2">
                            {detectedCols.map(key => (
                                <div key={key} className="flex items-center gap-3 text-xs">
                                    <span className="font-mono text-slate-500 bg-navy-700 px-2 py-1 rounded text-[11px] w-28 text-center truncate">{key}</span>
                                    <ChevronRight size={10} className="text-slate-600 flex-shrink-0" />
                                    <span className="text-slate-300 font-medium flex-1">{COL_LABEL[key]}</span>
                                    <Check size={12} className="text-emerald-400 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data preview */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2.5">
                            Aperçu{parsedRows.length > 5 ? ` (5 premiers sur ${parsedRows.length})` : ''}
                        </p>
                        <div className="rounded-xl border border-white/8 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-navy-700">
                                        {['Unité', 'Nom', 'Téléphone', 'Ét.', 'Type'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {previewRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-navy-700/40">
                                            <td className="px-3 py-2.5 font-mono text-sp font-semibold">{row.unite}</td>
                                            <td className="px-3 py-2.5 text-slate-200">{row.nom}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.telephone || '—'}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.etage || '—'}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.type || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => { setStep(1); fileRef.current && (fileRef.current.value = '') }}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Retour
                        </button>
                        <button onClick={handleImport} disabled={importing}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                            {importing
                                ? <><Spinner /> Importation en cours…</>
                                : `Importer ${parsedRows.length} résident${parsedRows.length > 1 ? 's' : ''}`
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="text-center py-4 space-y-5">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white">
                            {parsedRows.length} résident{parsedRows.length > 1 ? 's' : ''} importé{parsedRows.length > 1 ? 's' : ''} !
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Ils apparaissent dans la liste avec le statut{' '}
                            <span className="text-amber-400 font-semibold">En attente</span>.
                        </p>
                    </div>
                    <div className="bg-navy-700 rounded-xl p-4 text-left space-y-2.5 border border-white/5 max-h-48 overflow-y-auto">
                        {parsedRows.map((row, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-sm">
                                <span className="font-mono text-[11px] text-sp bg-sp/10 px-1.5 py-0.5 rounded flex-shrink-0">{row.unite}</span>
                                <span className="text-slate-200 truncate">{row.nom}</span>
                                <CheckCircle2 size={13} className="text-emerald-400 ml-auto flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                    <button onClick={onClose}
                        className="w-full py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all">
                        Fermer
                    </button>
                </div>
            )}
        </Modal>
    )
}

/* ══════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   BUILDING SETTINGS MODAL
══════════════════════════════════════════ */
function BuildingSettingsModal({ building, onClose, onSave }) {
    const [form, setForm] = useState({
        name: building.name ?? '',
        city: building.city ?? '',
        manager: building.manager ?? '',
        logo: building.logo ?? null,
        cachet: building.cachet ?? null,
        reserve_fund_mad: building.reserve_fund_mad ?? '',
        payment_rib: building.payment_rib ?? '',
        payment_bank: building.payment_bank ?? '',
        payment_account_holder: building.payment_account_holder ?? '',
        payment_whatsapp: building.payment_whatsapp ?? '',
        wa_portal_template: building.wa_portal_template || DEFAULT_PORTAL_WA_TEMPLATE,
    })
    const [confirmSave, setConfirmSave] = useState(false)
    const [saving, setSaving] = useState(false)
    const [logoPreview, setLogoPreview] = useState(building.logo ?? null)
    const [cachetPreview, setCachetPreview] = useState(building.cachet ?? null)
    const fileRef = useRef(null)
    const cachetRef = useRef(null)
    const portalTplRef = useRef(null)
    const [confirmRestore, setConfirmRestore] = useState(false)
    const [pendingRestore, setPendingRestore] = useState(null)

    function handleExport() {
        const bldgId = building.id
        const data = {}
        const map = {
            expenses: `sp_expenses_${bldgId}`, disputes: `sp_disputes_${bldgId}`,
            suppliers: `sp_suppliers_${bldgId}`, payments: `sp_payments_${bldgId}`,
            meetings: `sp_meetings_${bldgId}`, residents_extra: `sp_residents_extra_${bldgId}`,
            circulaires: `sp_circ_${bldgId}`, bank: `sp_bank_${bldgId}`,
        }
        for (const [key, lsKey] of Object.entries(map)) {
            try { data[key] = JSON.parse(localStorage.getItem(lsKey) ?? 'null') } catch { data[key] = null }
        }
        const backup = { app: 'SyndicPulse', version: '1.0', building: { id: building.id, name: building.name }, exportedAt: new Date().toISOString(), data }
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `SyndicPulse_${building.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    function handleRestoreFile(e) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const backup = JSON.parse(ev.target.result)
                if (backup.app !== 'SyndicPulse') { alert("Fichier invalide — ce n'est pas une sauvegarde SyndicPulse."); return }
                setPendingRestore(backup)
                setConfirmRestore(true)
            } catch { alert('Fichier JSON invalide.') }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    function doRestore() {
        if (!pendingRestore) return
        const bldgId = pendingRestore.building.id
        const d = pendingRestore.data ?? {}
        const write = (key, val) => { try { if (val !== null) localStorage.setItem(key, JSON.stringify(val)) } catch { } }
        write(`sp_expenses_${bldgId}`, d.expenses)
        write(`sp_disputes_${bldgId}`, d.disputes)
        write(`sp_suppliers_${bldgId}`, d.suppliers)
        write(`sp_payments_${bldgId}`, d.payments)
        write(`sp_meetings_${bldgId}`, d.meetings)
        write(`sp_residents_extra_${bldgId}`, d.residents_extra)
        write(`sp_circ_${bldgId}`, d.circulaires)
        write(`sp_bank_${bldgId}`, d.bank)
        setConfirmRestore(false)
        setPendingRestore(null)
        onClose()
        window.location.reload()
    }

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setConfirmSave(false) }

    function handleLogoChange(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => { set('logo', ev.target.result); setLogoPreview(ev.target.result) }
        reader.readAsDataURL(file)
    }

    function handleCachetChange(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => { set('cachet', ev.target.result); setCachetPreview(ev.target.result) }
        reader.readAsDataURL(file)
    }

    function handleSubmit(e) { e.preventDefault(); if (!form.name.trim()) return; setConfirmSave(true) }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 500))
        onSave({ ...form })
    }

    const logoColor = building.color ?? '#06b6d4'
    const logoInitials = form.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??'

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
                {/* Fixed header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
                    <h2 className="text-base font-bold text-white">Paramètres de la propriété</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Logo section */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Logo de la syndic</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: logoColor + '22' }}>
                                {logoPreview
                                    ? <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-xl font-bold" style={{ color: logoColor }}>{logoInitials}</span>
                                }
                            </div>
                            <div className="space-y-2">
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="px-3 py-1.5 bg-sp/10 hover:bg-sp/20 text-sp text-xs font-semibold rounded-lg border border-sp/20 transition-all flex items-center gap-1.5">
                                    <Upload size={12} /> {logoPreview ? 'Changer le logo' : 'Importer un logo'}
                                </button>
                                {logoPreview && (
                                    <button type="button" onClick={() => { set('logo', null); setLogoPreview(null) }}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all">
                                        Supprimer le logo
                                    </button>
                                )}
                                <p className="text-[10px] text-slate-500">PNG, JPG — max 2 Mo</p>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        </div>
                    </div>

                    {/* Cachet du Syndic */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cachet officiel du Syndic</label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-white/20 flex items-center justify-center flex-shrink-0 bg-navy-700/50">
                                {cachetPreview
                                    ? <img src={cachetPreview} alt="cachet" className="w-full h-full object-contain p-1" />
                                    : <span className="text-[9px] text-slate-500 text-center leading-tight px-2">Cachet<br/>du<br/>Syndic</span>
                                }
                            </div>
                            <div className="space-y-2">
                                <button type="button" onClick={() => cachetRef.current?.click()}
                                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg border border-amber-500/20 transition-all flex items-center gap-1.5">
                                    <Upload size={12} /> {cachetPreview ? 'Changer le cachet' : 'Importer le cachet'}
                                </button>
                                {cachetPreview && (
                                    <button type="button" onClick={() => { set('cachet', null); setCachetPreview(null) }}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all">
                                        Supprimer le cachet
                                    </button>
                                )}
                                <p className="text-[10px] text-slate-500">PNG transparent recommandé — max 2 Mo</p>
                                <p className="text-[10px] text-slate-500/70">Apposé automatiquement sur les reçus, circulaires et PV</p>
                            </div>
                            <input ref={cachetRef} type="file" accept="image/*" className="hidden" onChange={handleCachetChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nom de la propriété</label>
                            <input value={form.name} onChange={e => set('name', e.target.value)} required
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Ville</label>
                            <input value={form.city} onChange={e => set('city', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Gestionnaire</label>
                            <input value={form.manager} onChange={e => set('manager', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Fonds de réserve</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={form.reserve_fund_mad}
                                    onChange={e => set('reserve_fund_mad', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Ex. 84500"
                                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50 pr-14"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">MAD</span>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1">Provision pour travaux et imprévus de la copropriété</p>
                        </div>
                    </div>

                    {/* ── Coordonnées de paiement ── */}
                    <div className="border-t border-white/8 pt-5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Coordonnées de paiement</p>
                        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">Affichées aux résidents en retard dans leur espace portail pour faciliter le règlement de leurs charges.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">RIB</label>
                                <input value={form.payment_rib} onChange={e => set('payment_rib', e.target.value)}
                                    placeholder="ex : 011 780 0123456789 0100"
                                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sp/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Banque</label>
                                    <input value={form.payment_bank} onChange={e => set('payment_bank', e.target.value)}
                                        placeholder="ex : Attijariwafa Bank"
                                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Titulaire</label>
                                    <input value={form.payment_account_holder} onChange={e => set('payment_account_holder', e.target.value)}
                                        placeholder="ex : Syndicat Résidence X"
                                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">WhatsApp syndic</label>
                                <input value={form.payment_whatsapp} onChange={e => set('payment_whatsapp', e.target.value)}
                                    placeholder="ex : +212661234567"
                                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sp/50" />
                                <p className="text-[10px] text-slate-600 mt-1">Le résident peut vous contacter via un message pré-rempli avec son solde dû</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Modèles WhatsApp ── */}
                    <div className="border-t border-white/8 pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modèles WhatsApp</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                            Personnalisez le message d'envoi des accès portail. Cliquez sur une variable pour l'insérer à la position du curseur.
                        </p>

                        {/* Portal credentials template */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Message d'accueil portail</label>
                                <button type="button"
                                    onClick={() => set('wa_portal_template', DEFAULT_PORTAL_WA_TEMPLATE)}
                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                                    title="Restaurer le message par défaut"
                                >
                                    <RefreshCw size={10} /> Défaut
                                </button>
                            </div>
                            {/* Variable chips */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {['{prénom}', '{résidence}', '{code}', '{pin}'].map(v => (
                                    <button key={v} type="button"
                                        onClick={() => {
                                            const ta = portalTplRef.current
                                            if (!ta) return
                                            const s = ta.selectionStart ?? form.wa_portal_template.length
                                            const e = ta.selectionEnd ?? s
                                            const newVal = form.wa_portal_template.slice(0, s) + v + form.wa_portal_template.slice(e)
                                            set('wa_portal_template', newVal)
                                            setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length, s + v.length) }, 0)
                                        }}
                                        className="text-[10px] font-mono bg-sp/10 text-sp border border-sp/20 px-2 py-0.5 rounded-md hover:bg-sp/20 transition-colors"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                ref={portalTplRef}
                                rows={11}
                                value={form.wa_portal_template}
                                onChange={e => set('wa_portal_template', e.target.value)}
                                spellCheck={false}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-slate-300 font-mono leading-relaxed focus:outline-none focus:border-sp/40 resize-none transition-colors"
                            />
                            <p className="text-[10px] text-slate-600 mt-1">{form.wa_portal_template.length} caractères</p>
                        </div>
                    </div>

                    {/* ── Sécurité du compte ── */}
                    <div className="border-t border-white/8 pt-5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Sécurité du compte</p>
                        <div className="flex items-center justify-between rounded-xl bg-navy-700/50 border border-white/8 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-600/30 border border-white/8 flex items-center justify-center flex-shrink-0">
                                    <Key size={15} className="text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-400">Changer le mot de passe</p>
                                    <p className="text-[10px] text-slate-600 mt-0.5">Modifier le mot de passe de connexion</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500/70 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                                Prochainement
                            </span>
                        </div>
                    </div>

                    {/* ── Données & Sauvegarde ── */}
                    <div className="border-t border-white/8 pt-5 space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Données & Sauvegarde</p>

                        {/* Export */}
                        <div className="flex items-center justify-between rounded-xl bg-navy-700/50 border border-white/8 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <Download size={15} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Exporter la sauvegarde</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Télécharge toutes les données en fichier JSON</p>
                                </div>
                            </div>
                            <button type="button" onClick={handleExport}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                                Télécharger
                            </button>
                        </div>

                        {/* Restore */}
                        <div className="rounded-xl bg-navy-700/50 border border-white/8 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                        <Upload size={15} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Restaurer une sauvegarde</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Importe un fichier JSON exporté précédemment</p>
                                    </div>
                                </div>
                                <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-colors">
                                    Importer
                                    <input type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
                                </label>
                            </div>
                            {confirmRestore && pendingRestore && (
                                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/25 p-3">
                                    <p className="text-xs text-red-300 font-medium mb-2">
                                        Restaurer la sauvegarde du {new Date(pendingRestore.exportedAt).toLocaleDateString('fr-MA')} pour {pendingRestore.building.name} ? Toutes les données actuelles seront remplacées.
                                    </p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => { setConfirmRestore(false); setPendingRestore(null) }}
                                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 rounded-lg transition-colors">
                                            Annuler
                                        </button>
                                        <button type="button" onClick={doRestore}
                                            className="px-3 py-1.5 text-xs font-semibold bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors">
                                            Oui, restaurer
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>{/* end scrollable body */}

                {/* Fixed footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-white/8 bg-navy-800">
                    {confirmSave ? (
                        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-4 flex items-center justify-between gap-3">
                            <p className="text-sm text-cyan-300 font-medium">Confirmer les modifications ?</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmSave(false)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 rounded-lg transition-colors">
                                    Revenir
                                </button>
                                <button type="button" onClick={doSave} disabled={saving}
                                    className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
                                    {saving ? 'Enregistrement…' : <><Check size={12} /> Oui, enregistrer</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                                Annuler
                            </button>
                            <button type="submit"
                                className="px-4 py-2 text-sm font-semibold bg-sp hover:bg-sp-light text-white rounded-xl transition-colors flex items-center gap-1.5">
                                <Check size={14} /> Enregistrer
                            </button>
                        </div>
                    )}
                </div>
                </form>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════
   ADD BUILDING MODAL
══════════════════════════════════════════ */
const BUILDING_COLORS = ['#22c55e', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#ef4444', '#8b5cf6', '#14b8a6']

function AddBuildingModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        name: '', city: '', address: '', manager: '',
        total_units: '', monthly_charge: '',
        color: BUILDING_COLORS[0],
        logo: null,
    })
    const [saving, setSaving] = useState(false)
    const [logoPreview, setLogoPreview] = useState(null)
    const fileRef = useRef(null)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function handleLogoChange(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => { set('logo', ev.target.result); setLogoPreview(ev.target.result) }
        reader.readAsDataURL(file)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.name.trim() || !form.city.trim() || !form.manager.trim()) return
        setSaving(true)
        await new Promise(r => setTimeout(r, 700))
        onSave({
            id: `bld-${Date.now()}`,
            name: form.name.trim(),
            city: form.city.trim(),
            address: form.address.trim(),
            manager: form.manager.trim(),
            total_units: Number(form.total_units) || 0,
            monthly_charge_mad: Number(form.monthly_charge) || 0,
            reserve_fund_mad: 0,
            color: form.color,
            icon: 'Building2',
            logo: form.logo,
            collection_rate: 100,
        })
    }

    const logoInitials = form.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??'

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                    <h2 className="text-base font-bold text-white">Ajouter une propriété</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Logo + color */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Logo de la syndic</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: form.color + '22' }}>
                                {logoPreview
                                    ? <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-xl font-bold" style={{ color: form.color }}>{logoInitials}</span>
                                }
                            </div>
                            <div className="space-y-2 flex-1">
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="px-3 py-1.5 bg-sp/10 hover:bg-sp/20 text-sp text-xs font-semibold rounded-lg border border-sp/20 transition-all flex items-center gap-1.5">
                                    <Upload size={12} /> {logoPreview ? 'Changer le logo' : 'Importer un logo'}
                                </button>
                                {logoPreview && (
                                    <button type="button" onClick={() => { set('logo', null); setLogoPreview(null) }}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all">
                                        Supprimer
                                    </button>
                                )}
                                <p className="text-[10px] text-slate-500">Optionnel — une icône générée sera utilisée si absent</p>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Couleur :</span>
                            {BUILDING_COLORS.map(c => (
                                <button key={c} type="button" onClick={() => set('color', c)}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-125' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nom de la propriété <span className="text-red-400">*</span></label>
                            <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="ex. Résidence Al Amal"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Ville <span className="text-red-400">*</span></label>
                            <input value={form.city} onChange={e => set('city', e.target.value)} required placeholder="ex. Marrakech"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Gestionnaire <span className="text-red-400">*</span></label>
                            <input value={form.manager} onChange={e => set('manager', e.target.value)} required placeholder="ex. Karim Alami"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Adresse</label>
                            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="ex. Bd Mohammed V, 40000"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nombre d'unités</label>
                            <input type="number" min="1" value={form.total_units} onChange={e => set('total_units', e.target.value)} placeholder="ex. 24"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cotisation mensuelle (MAD)</label>
                            <input type="number" min="0" value={form.monthly_charge} onChange={e => set('monthly_charge', e.target.value)} placeholder="ex. 1500"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving || !form.name.trim() || !form.city.trim() || !form.manager.trim()}
                            className="px-4 py-2 text-sm font-semibold bg-sp hover:bg-sp-light text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5">
                            {saving ? 'Création…' : <><Plus size={14} /> Créer la propriété</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const BUILDING_ICON_MAP = { Building2, Landmark, Leaf }

function BuildingAvatar({ building, size = 'sm' }) {
    const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
    const iconSize = size === 'sm' ? 15 : 18
    const Icon = BUILDING_ICON_MAP[building.icon] ?? Building2
    if (building.logo) {
        return (
            <div className={`${dim} rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden`}
                style={{ border: `1px solid ${building.color}55` }}>
                <img src={building.logo} alt="" className="w-full h-full object-cover" />
            </div>
        )
    }
    return (
        <div className={`${dim} rounded-lg flex items-center justify-center flex-shrink-0`}
            style={{ backgroundColor: building.color + '33', border: `1px solid ${building.color}55` }}>
            <Icon size={iconSize} style={{ color: building.color }} strokeWidth={1.5} />
        </div>
    )
}

function KpiCard({ label, value, delta, up, icon: Icon, color, onInfo }) {
    const colorMap = {
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
        cyan:    { bg: 'bg-sp/10', border: 'border-sp/20', text: 'text-sp' },
        amber:   { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
        violet:  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
    }
    const c = colorMap[color] ?? colorMap.cyan
    return (
        <div className="glass-card p-5 group transition-all duration-200 hover:bg-white/[0.025] hover:scale-[1.01] hover:border-white/15 relative">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={18} className={c.text} strokeWidth={1.5} />
                </div>
                {up !== null ? (
                    <div className={`flex items-center gap-1 text-[11px] font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {delta}
                    </div>
                ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>{delta}</span>
                )}
            </div>
            <p className="text-slate-400 text-xs font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>

            {/* ⓘ button — only rendered when onInfo is provided */}
            {onInfo && (
                <button
                    onClick={e => { e.stopPropagation(); onInfo() }}
                    title="Comment ce score est calculé"
                    className="absolute bottom-3.5 right-3.5 w-6 h-6 rounded-full flex items-center justify-center bg-violet-500/10 border border-violet-500/20 text-violet-400/60 hover:text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Info size={12} />
                </button>
            )}
        </div>
    )
}

/* ── StatCard — hover always; click-selected only when onClick is provided ── */
function StatCard({ children, className = '', onClick }) {
    const [selected, setSelected] = useState(false)
    const isSelected = !!onClick && selected
    return (
        <div
            onClick={onClick ? () => { setSelected(s => !s); onClick() } : undefined}
            className={`transition-all duration-200
                ${onClick ? 'cursor-pointer select-none' : ''}
                ${isSelected
                    ? 'bg-white/[0.04] border-white/25 scale-[1.02] shadow-md'
                    : 'hover:bg-white/[0.025] hover:scale-[1.01] hover:border-white/15'
                } ${className}`}
        >
            {children}
        </div>
    )
}

/* ── Transparence Score Modal ── */
function TransparenceModal({ score, tier, breakdown, onClose }) {
    const tierMeta = {
        'Gold Elite': { emoji: '🥇', cls: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', min: 95 },
        'Silver Pro': { emoji: '🥈', cls: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/20', min: 80 },
        'Bronze': { emoji: '🥉', cls: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', min: 60 },
        'Standard': { emoji: '📋', cls: 'text-slate-400', bg: 'bg-slate-600/10', border: 'border-slate-600/20', min: 0 },
    }
    const descriptions = {
        'Recouvrement documenté': 'Basé sur le taux de recouvrement actuel de la résidence.',
        'Dépenses tracées': 'Toutes les dépenses sont enregistrées dans le journal avec catégorie et fournisseur.',
        'Tickets suivis': 'Proportion de tickets de maintenance clôturés vs. ouverts.',
        'Résidents renseignés': 'Pourcentage de résidents avec un numéro de téléphone renseigné.',
        'Assemblée planifiée': 'Au moins une assemblée générale planifiée ou tenue cette année.',
    }
    const tm = tierMeta[tier] ?? tierMeta['Standard']
    const tiers = ['Gold Elite', 'Silver Pro', 'Bronze', 'Standard']
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-[#0d1629] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <ShieldCheck size={18} className="text-violet-400" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Score de Transparence</p>
                            <p className="text-[11px] text-slate-500">Comment votre score est calculé</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 transition-colors">
                        <X size={15} />
                    </button>
                </div>

                {/* Score hero */}
                <div className="px-5 py-5 flex items-center gap-4 border-b border-white/8">
                    <div>
                        <p className="text-4xl font-bold text-white">{score}<span className="text-slate-600 text-2xl font-normal">/100</span></p>
                    </div>
                    <div className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full ${tm.bg} border ${tm.border}`}>
                        <span className="text-base leading-none">{tm.emoji}</span>
                        <span className={`text-xs font-bold ${tm.cls}`}>{tier}</span>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="px-5 py-4 space-y-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Détail des critères</p>
                    {breakdown.map(item => (
                        <div key={item.label}>
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-[12px] font-semibold text-slate-300">{item.label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{descriptions[item.label] ?? ''}</p>
                                </div>
                                <span className="text-sm font-bold text-violet-300 ml-3 whitespace-nowrap">
                                    {item.pts}<span className="text-slate-600 font-normal text-xs">/{item.max}</span>
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-400 rounded-full transition-all"
                                    style={{ width: `${Math.round((item.pts / item.max) * 100)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tier reference */}
                <div className="px-5 py-4 border-t border-white/8 bg-white/2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Paliers de transparence</p>
                    <div className="grid grid-cols-2 gap-2">
                        {tiers.map(t => {
                            const m = tierMeta[t]
                            const isCurrent = t === tier
                            return (
                                <div key={t} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isCurrent ? `${m.bg} border ${m.border}` : 'opacity-40'}`}>
                                    <span className="text-sm leading-none">{m.emoji}</span>
                                    <div>
                                        <p className={`text-[11px] font-bold ${isCurrent ? m.cls : 'text-slate-400'}`}>{t}</p>
                                        <p className="text-[9px] text-slate-600">≥ {m.min} pts</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }) {
    const map = {
        in_progress: 'bg-sp/15 text-sp border-sp/20',
        scheduled: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
        done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    }
    const label = { in_progress: 'En cours', scheduled: 'Planifié', done: 'Terminé' }
    return (
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${map[status] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
            {label[status] ?? status}
        </span>
    )
}

function PaymentBadge({ status }) {
    const map = {
        paid: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: 'Payé', icon: CheckCircle2 },
        pending: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20', label: 'En attente', icon: Clock },
        overdue: { cls: 'bg-red-500/15 text-red-400 border-red-500/20', label: 'En retard', icon: XCircle },
    }
    const { cls, label, icon: Icon } = map[status] ?? map.pending
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
            <Icon size={10} strokeWidth={2.5} /> {label}
        </span>
    )
}

function ProgressRow({ label, value, color }) {
    return (
        <div>
            <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-300 font-semibold">{value}%</span>
            </div>
            <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
            </div>
        </div>
    )
}

function ActionBtn({ icon, onClick, color = 'sp', title }) {
    const hoverMap = {
        sp: 'hover:bg-sp/20 hover:text-sp',
        green: 'hover:bg-emerald-500/20 hover:text-emerald-400',
        blue: 'hover:bg-blue-500/20 hover:text-blue-400',
        amber: 'hover:bg-amber-500/20 hover:text-amber-400',
    }
    return (
        <button onClick={onClick} title={title}
            className={`p-1.5 rounded-lg bg-navy-600 ${hoverMap[color] ?? hoverMap.sp} text-slate-400 transition-all`}>
            {icon}
        </button>
    )
}

/* ══════════════════════════════════════════
   AG DOCUMENT GENERATORS
══════════════════════════════════════════ */
function fmtDate(iso) {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d} ${MONTH_LABELS[Number(m) - 1]} ${y}`
}

function generateConvocation(building, residents, meeting) {
    const deadlineDate = new Date(meeting.date)
    deadlineDate.setDate(deadlineDate.getDate() - 15)
    const waText = `📢 *Convocation — Assemblée Générale*\n*${building.name} · ${building.city}*\n\nVous êtes convoqué(e) à l'Assemblée Générale le :\n📅 *${fmtDate(meeting.date)}* à *${meeting.time}*\n📍 ${meeting.location}\n\n*Ordre du jour :*\n${meeting.agenda.map((a, i) => `${i + 1}. ${a.title}`).join('\n')}\n\n⚠️ Votre présence est indispensable (quorum requis).\nEn cas d'absence, vous pouvez donner procuration à un autre copropriétaire.\n\n— Syndic ${building.name}`

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Convocation AG — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; max-width: 680px; margin: 0 auto; }
  .header { border-bottom: 2px solid #0e7490; padding-bottom: 16px; margin-bottom: 28px; }
  .brand { font-size: 18px; font-weight: bold; color: #0e7490; }
  h1 { font-size: 17px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px; }
  .sub { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 28px; }
  .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .info-row { display: flex; gap: 12px; margin-bottom: 8px; }
  .info-row:last-child { margin-bottom: 0; }
  .info-lbl { font-weight: 600; min-width: 80px; color: #0e7490; }
  .agenda { margin-bottom: 28px; }
  .agenda h3 { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0e7490; margin-bottom: 12px; letter-spacing: .5px; }
  .agenda-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .agenda-num { font-weight: bold; color: #0e7490; min-width: 24px; }
  .legal { font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-bottom: 28px; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig { text-align: center; }
  .sig .line { width: 160px; border-top: 1px solid #111; margin: 36px auto 6px; }
  .sig .name { font-size: 11px; color: #6b7280; }
  /* WhatsApp panel — hidden on print */
  .wa-panel { margin-top: 40px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; }
  .wa-panel h3 { color: #166534; font-size: 13px; font-weight: bold; margin-bottom: 12px; }
  .wa-text { font-family: monospace; font-size: 12px; white-space: pre-wrap; background: #fff; border: 1px solid #d1fae5; border-radius: 6px; padding: 12px; color: #111; }
  .wa-btn { margin-top: 10px; background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: bold; cursor: pointer; }
  @media print { .wa-panel { display: none; } body { padding: 32px; } }
</style>
</head>
<body>
<div class="header">
  <div class="brand" style="display:flex;align-items:center;gap:10px">${buildingLogoHTML(building, 36)}<span>${building.name}</span></div>
  <div style="font-size:11px;color:#6b7280;margin-top:3px">${building.name} &nbsp;·&nbsp; ${building.city} &nbsp;·&nbsp; Loi 18-00 relative au statut de la copropriété</div>
</div>

<h1>Convocation à l'Assemblée Générale</h1>
<p class="sub">${meeting.title}</p>

<div class="info-box">
  <div class="info-row"><span class="info-lbl">Date :</span><span>${fmtDate(meeting.date)}</span></div>
  <div class="info-row"><span class="info-lbl">Heure :</span><span>${meeting.time}</span></div>
  <div class="info-row"><span class="info-lbl">Lieu :</span><span>${meeting.location}</span></div>
  <div class="info-row"><span class="info-lbl">Convoqués :</span><span>Tous les copropriétaires de ${building.name}</span></div>
</div>

<div class="agenda">
  <h3>Ordre du jour</h3>
  ${meeting.agenda.map((a, i) => `<div class="agenda-item"><span class="agenda-num">${i + 1}.</span><span>${a.title}</span></div>`).join('')}
</div>

<div class="legal">
  Conformément à l'article 25 de la Loi 18-00, cette convocation est adressée à tous les copropriétaires au moins 15 jours avant la tenue de l'assemblée. En cas d'empêchement, vous pouvez donner procuration écrite à un autre copropriétaire. Le quorum est atteint si la majorité des copropriétaires est présente ou représentée.
</div>

<div class="sig-row">
  <div class="sig">${building.cachet ? `<img src="${building.cachet}" style="height:70px;width:auto;max-width:110px;object-fit:contain;opacity:0.88;display:block;margin:0 auto 4px;" alt="cachet"/>` : ''}<div class="line"></div><div class="name">Le Syndic — ${building.name}</div></div>
  <div class="sig"><div class="line"></div><div class="name">Date d'envoi</div></div>
</div>

<div class="wa-panel">
  <h3>💬 Message WhatsApp (copier-coller dans le groupe)</h3>
  <div class="wa-text" id="watext">${waText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <button class="wa-btn" onclick="navigator.clipboard.writeText(document.getElementById('watext').innerText).then(()=>this.textContent='✓ Copié !')">📋 Copier le message</button>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function generateAttendanceSheet(building, residents, meeting) {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Feuille de présence — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
  .header { border-bottom: 2px solid #0e7490; padding-bottom: 12px; margin-bottom: 24px; display:flex; justify-content:space-between; }
  h1 { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #6b7280; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0e7490; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .sig-cell { width: 140px; }
  .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:flex-start;gap:10px">
    ${buildingLogoHTML(building, 36)}
    <div>
      <h1>Feuille de présence — AG</h1>
      <div class="meta">${building.name} · ${building.city} &nbsp;|&nbsp; ${fmtDate(meeting.date)} à ${meeting.time} &nbsp;|&nbsp; ${meeting.location}</div>
    </div>
  </div>
  <div style="font-size:11px;color:#6b7280;text-align:right">Total copropriétaires : ${residents.length}<br/>Quorum (50%+1) : ${Math.ceil(residents.length / 2)}</div>
</div>

<table>
  <thead><tr><th>#</th><th>Unité</th><th>Copropriétaire</th><th>Présent(e)</th><th>Procuration donnée à</th><th>Signature</th></tr></thead>
  <tbody>
    ${residents.map((r, i) => `<tr><td>${i + 1}</td><td>${r.unit}</td><td>${r.name}</td><td style="text-align:center">☐</td><td class="sig-cell">&nbsp;</td><td class="sig-cell">&nbsp;</td></tr>`).join('')}
  </tbody>
</table>

<div class="footer">
  <div>Présents : ______ / ${residents.length} &nbsp;&nbsp; Quorum atteint : ☐ Oui &nbsp; ☐ Non</div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${building.cachet ? `<img src="${building.cachet}" style="height:52px;width:auto;max-width:80px;object-fit:contain;opacity:0.88;" alt="cachet"/>` : ''}Signature du Syndic : _______________________</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function generatePV(building, meeting) {
    const quorumOk = meeting.attendance ? meeting.attendance.present >= Math.ceil(meeting.attendance.total / 2) : false
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Procès-verbal AG — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; max-width: 700px; margin: 0 auto; }
  .header { border-bottom: 2px solid #0e7490; padding-bottom: 14px; margin-bottom: 28px; }
  h1 { font-size: 17px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .sub { text-align: center; color: #6b7280; font-size: 12px; }
  h2 { font-size: 13px; font-weight: bold; color: #0e7490; text-transform: uppercase; letter-spacing: .5px; margin: 24px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .info-row { display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; }
  .info-lbl { font-weight: 600; min-width: 120px; }
  .vote-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .vote-title { font-weight: bold; margin-bottom: 8px; }
  .vote-row { display: flex; gap: 24px; font-size: 12px; margin-bottom: 4px; }
  .vote-row span { min-width: 120px; }
  .result { font-weight: bold; margin-top: 6px; font-size: 12px; }
  .adopted { color: #16a34a; }
  .rejected { color: #dc2626; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 48px; gap: 20px; }
  .sig { text-align: center; flex: 1; }
  .sig .line { border-top: 1px solid #111; margin: 40px 0 6px; }
  .sig .name { font-size: 11px; color: #6b7280; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">${buildingLogoHTML(building, 36)}<span style="font-size:13px;font-weight:bold;color:#0e7490">${building.name}</span></div>
  <div style="font-size:11px;color:#6b7280">${building.name} &nbsp;·&nbsp; ${building.city} · Loi 18-00 relative au statut de la copropriété</div>
</div>

<h1>Procès-verbal</h1>
<p class="sub">${meeting.title}</p>

<h2>Informations de séance</h2>
<div class="info-row"><span class="info-lbl">Date :</span><span>${fmtDate(meeting.date)}</span></div>
<div class="info-row"><span class="info-lbl">Heure :</span><span>${meeting.time}</span></div>
<div class="info-row"><span class="info-lbl">Lieu :</span><span>${meeting.location}</span></div>
<div class="info-row"><span class="info-lbl">Présents :</span><span>${meeting.attendance?.present ?? '—'} / ${meeting.attendance?.total ?? '—'} copropriétaires</span></div>
<div class="info-row"><span class="info-lbl">Quorum :</span><span style="font-weight:bold;color:${quorumOk ? '#16a34a' : '#dc2626'}">${quorumOk ? '✓ Atteint' : '✗ Non atteint'}</span></div>

<h2>Résultats des votes</h2>
${meeting.agenda.map((a, i) => {
        const v = (meeting.votes ?? []).find(x => x.agendaId === a.id)
        const total = v ? (v.pour + v.contre + v.abstention) : 0
        const adopted = v && v.pour > v.contre
        return `<div class="vote-item">
  <div class="vote-title">${i + 1}. ${a.title}</div>
  ${v ? `
  <div class="vote-row"><span>✅ Pour :</span><span>${v.pour} voix</span></div>
  <div class="vote-row"><span>❌ Contre :</span><span>${v.contre} voix</span></div>
  <div class="vote-row"><span>⬜ Abstention :</span><span>${v.abstention} voix</span></div>
  <div class="result ${adopted ? 'adopted' : 'rejected'}">${adopted ? '✓ POINT ADOPTÉ' : '✗ POINT REJETÉ'}</div>
  ` : '<div style="color:#9ca3af;font-size:12px">Votes non enregistrés</div>'}
</div>`
    }).join('')}

${meeting.notes ? `<h2>Notes</h2><p style="font-size:12px;color:#374151;line-height:1.6">${meeting.notes}</p>` : ''}

<div class="sig-row">
  <div class="sig">${building.cachet ? `<img src="${building.cachet}" style="height:70px;width:auto;max-width:110px;object-fit:contain;opacity:0.88;display:block;margin:0 auto 4px;" alt="cachet"/>` : ''}<div class="line"></div><div class="name">Le Syndic</div></div>
  <div class="sig"><div class="line"></div><div class="name">Témoin 1</div></div>
  <div class="sig"><div class="line"></div><div class="name">Témoin 2</div></div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

/* ══════════════════════════════════════════
   ASSEMBLÉES PAGE
══════════════════════════════════════════ */
function AssembliesPage({ building, residents, meetings, setMeetings, showToast }) {
    const [filter, setFilter] = useState('all')
    const [showAdd, setShowAdd] = useState(false)
    const [editingMeeting, setEditingMeeting] = useState(null)

    // Sync meetings to localStorage so ResidentPortal always sees the latest list
    useEffect(() => {
        try { localStorage.setItem(`sp_meetings_${building.id}`, JSON.stringify(meetings)) } catch { }
    }, [meetings, building.id])

    const filtered = filter === 'all' ? meetings : meetings.filter(m => m.status === filter)
    const upcoming = meetings.filter(m => m.status === 'upcoming')
    const completed = meetings.filter(m => m.status === 'completed')
    const next = upcoming.sort((a, b) => a.date.localeCompare(b.date))[0]

    function daysUntil(iso) {
        const diff = Math.ceil((new Date(iso) - new Date()) / 86400000)
        if (diff < 0) return `il y a ${Math.abs(diff)} j`
        if (diff === 0) return "aujourd'hui"
        return `dans ${diff} j`
    }

    function handleAdd(m) {
        const newId = `ag-${building.id.replace('bld-', '')}-${Date.now().toString(36)}`
        setMeetings(prev => [{ ...m, id: newId, status: 'upcoming', convocationSent: false, votes: [], attendance: null, notes: '' }, ...prev])
        showToast(`AG "${m.title}" planifiée`)
    }

    function handleSaveEdit(m) {
        setMeetings(prev => prev.map(x => x.id === m.id ? m : x))
        showToast('AG mise à jour')
        setEditingMeeting(null)
    }

    function handleDelete(id) {
        setMeetings(prev => prev.filter(x => x.id !== id))
        showToast('AG supprimée', 'error')
        setEditingMeeting(null)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">Assemblées Générales</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{building.name} · {upcoming.length} à venir · {completed.length} terminée{completed.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-sp/10 hover:bg-sp/20 text-sp border border-sp/25 rounded-xl px-4 py-2 text-sm font-semibold transition-all">
                    <Plus size={15} /> Planifier une AG
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div onClick={() => setFilter('upcoming')} className="glass-card p-4 flex items-center gap-3 cursor-pointer select-none hover:bg-white/[0.025] hover:border-sp/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                    <CalendarCheck size={22} className="text-sp flex-shrink-0" />
                    <div>
                        <p className="text-xl font-bold text-sp">{upcoming.length}</p>
                        <p className="text-xs text-slate-400">À venir</p>
                    </div>
                </div>
                <div onClick={() => setFilter('completed')} className="glass-card p-4 flex items-center gap-3 cursor-pointer select-none hover:bg-white/[0.025] hover:border-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                    <ClipboardList size={22} className="text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-xl font-bold text-emerald-400">{completed.length}</p>
                        <p className="text-xs text-slate-400">Terminées</p>
                    </div>
                </div>
                <StatCard className="glass-card p-4 flex items-center gap-3">
                    <Calendar size={22} className="text-amber-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-400">{next ? fmtDate(next.date) : '—'}</p>
                        <p className="text-xs text-slate-400">{next ? `Prochaine · ${daysUntil(next.date)}` : 'Aucune planifiée'}</p>
                    </div>
                </StatCard>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5">
                {[{ key: 'all', label: 'Toutes' }, { key: 'upcoming', label: 'À venir' }, { key: 'completed', label: 'Terminées' }].map(t => (
                    <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${filter === t.key ? 'bg-sp/15 text-sp border-sp/30' : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/15'
                            }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* AG cards */}
            <div className="space-y-4">
                {filtered.length === 0 && (
                    <div className="glass-card p-10 text-center text-slate-500 text-sm">Aucune assemblée pour ce filtre.</div>
                )}
                {filtered.map(m => (
                    <div key={m.id} className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${m.status === 'upcoming'
                                        ? 'bg-sp/15 text-sp border-sp/25'
                                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                    }`}>
                                    {m.status === 'upcoming' ? 'À venir' : 'Terminée'}
                                </span>
                                {m.convocationSent && (
                                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                        <Check size={10} /> Convocation envoyée
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setEditingMeeting(m)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-navy-700 transition-colors ml-2">
                                <Pencil size={13} />
                            </button>
                        </div>

                        <h3 className="font-bold text-white text-base mb-1">{m.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(m.date)} · {m.time}</span>
                            <span className="flex items-center gap-1"><ClipboardList size={11} /> {m.agenda.length} point{m.agenda.length !== 1 ? 's' : ''} à l'ordre du jour</span>
                            {m.status === 'upcoming' && <span className="text-amber-400 font-semibold">{daysUntil(m.date)}</span>}
                            {m.status === 'completed' && m.attendance && (
                                <span className="flex items-center gap-1"><Users2 size={11} /> {m.attendance.present} / {m.attendance.total} présents</span>
                            )}
                        </div>

                        {/* Agenda preview */}
                        <div className="space-y-1 mb-5">
                            {m.agenda.slice(0, 3).map((a, i) => (
                                <div key={a.id} className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="w-4 h-4 rounded-full bg-navy-600 text-[9px] font-bold text-slate-300 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                    {a.title}
                                </div>
                            ))}
                            {m.agenda.length > 3 && <p className="text-[11px] text-slate-600 pl-6">+{m.agenda.length - 3} autre{m.agenda.length - 3 > 1 ? 's' : ''} point{m.agenda.length - 3 > 1 ? 's' : ''}…</p>}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap border-t border-white/5 pt-4">
                            {m.status === 'upcoming' && (<>
                                <button onClick={() => generateConvocation(building, residents, m)}
                                    className="flex items-center gap-1.5 text-xs bg-sp/10 text-sp border border-sp/20 px-3 py-1.5 rounded-lg hover:bg-sp/20 transition-colors">
                                    <FileText size={12} /> Générer convocation
                                </button>
                                <button onClick={() => generateAttendanceSheet(building, residents, m)}
                                    className="flex items-center gap-1.5 text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors">
                                    <Users2 size={12} /> Feuille de présence
                                </button>
                            </>)}
                            {m.status === 'completed' && (<>
                                <button onClick={() => generatePV(building, m)}
                                    className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">
                                    <ClipboardList size={12} /> Voir le PV
                                </button>
                                <button onClick={() => generateAttendanceSheet(building, residents, m)}
                                    className="flex items-center gap-1.5 text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors">
                                    <Users2 size={12} /> Feuille de présence
                                </button>
                            </>)}
                            <button onClick={() => setEditingMeeting(m)}
                                className="flex items-center gap-1.5 text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors ml-auto">
                                <Pencil size={12} /> Modifier
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {showAdd && <AddAGModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
                {editingMeeting && (
                    <EditAGModal
                        meeting={editingMeeting}
                        onClose={() => setEditingMeeting(null)}
                        onSave={handleSaveEdit}
                        onDelete={handleDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   ADD AG MODAL
══════════════════════════════════════════ */
function AddAGModal({ onClose, onAdd }) {
    const year = new Date().getFullYear()
    const [form, setForm] = useState({
        title: `Assemblée Générale Ordinaire ${year}`,
        date: '',
        time: '19:00',
        location: 'Salle commune — RDC',
        agenda: [{ id: 'n1', title: 'Approbation des comptes' }, { id: 'n2', title: 'Budget prévisionnel' }],
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
    function setAgenda(i, v) { setForm(f => { const a = [...f.agenda]; a[i] = { ...a[i], title: v }; return { ...f, agenda: a } }) }
    function addPoint() { setForm(f => ({ ...f, agenda: [...f.agenda, { id: `n${Date.now()}`, title: '' }] })) }
    function removePoint(i) { setForm(f => ({ ...f, agenda: f.agenda.filter((_, j) => j !== i) })) }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.date) errs.date = 'Date requise'
        if (form.agenda.filter(a => a.title.trim()).length === 0) errs.agenda = 'Au moins un point requis'
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onAdd({ ...form, agenda: form.agenda.filter(a => a.title.trim()) })
        setSaving(false)
        onClose()
    }

    return (
        <Modal title="Planifier une AG" subtitle="Nouvelle assemblée générale" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date *</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        {errors.date && <p className="text-[11px] text-red-400 mt-1">{errors.date}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Heure</label>
                        <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Lieu</label>
                    <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ordre du jour</label>
                    <div className="space-y-2">
                        {form.agenda.map((a, i) => (
                            <div key={a.id} className="flex gap-2">
                                <span className="w-5 h-9 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}.</span>
                                <input type="text" value={a.title} onChange={e => setAgenda(i, e.target.value)}
                                    placeholder={`Point ${i + 1}`}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.agenda.length > 1 && (
                                    <button type="button" onClick={() => removePoint(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.agenda.length < 8 && (
                            <button type="button" onClick={addPoint}
                                className="text-xs text-sp hover:text-sp/80 flex items-center gap-1 transition-colors">
                                <Plus size={12} /> Ajouter un point
                            </button>
                        )}
                    </div>
                    {errors.agenda && <p className="text-[11px] text-red-400 mt-1">{errors.agenda}</p>}
                </div>
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Check size={15} /> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   EDIT AG MODAL
══════════════════════════════════════════ */
function EditAGModal({ meeting, onClose, onSave, onDelete }) {
    const [form, setForm] = useState({
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        location: meeting.location,
        status: meeting.status,
        convocationSent: meeting.convocationSent,
        agenda: meeting.agenda.map(a => ({ ...a })),
        attendance: meeting.attendance ? { ...meeting.attendance } : { present: '', total: '' },
        votes: meeting.votes.map(v => ({ ...v })),
        notes: meeting.notes ?? '',
    })
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmSave, setConfirmSave] = useState(false)
    const [saving, setSaving] = useState(false)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setConfirmSave(false) }
    function setAgenda(i, v) { setForm(f => { const a = [...f.agenda]; a[i] = { ...a[i], title: v }; return { ...f, agenda: a } }); setConfirmSave(false) }
    function addPoint() { setForm(f => ({ ...f, agenda: [...f.agenda, { id: `e${Date.now()}`, title: '' }] })) }
    function removePoint(i) { setForm(f => ({ ...f, agenda: f.agenda.filter((_, j) => j !== i) })) }
    function setVote(agendaId, field, val) {
        setForm(f => {
            const votes = f.votes.map(v => v.agendaId === agendaId ? { ...v, [field]: Number(val) } : v)
            if (!votes.find(v => v.agendaId === agendaId)) votes.push({ agendaId, pour: 0, contre: 0, abstention: 0, [field]: Number(val) })
            return { ...f, votes }
        })
        setConfirmSave(false)
    }

    function handleSubmit(e) {
        e.preventDefault()
        setConfirmSave(true)
    }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        const att = form.status === 'completed' && form.attendance?.present !== ''
            ? { present: Number(form.attendance.present), total: Number(form.attendance.total) }
            : meeting.attendance
        onSave({ ...meeting, ...form, agenda: form.agenda.filter(a => a.title.trim()), attendance: att })
    }

    return (
        <Modal title="Modifier l'AG" subtitle={`${meeting.title}`} onClose={onClose} width="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Heure</label>
                        <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Lieu</label>
                    <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
                    <div className="flex gap-2">
                        {[{ key: 'upcoming', label: 'À venir', cls: 'border-sp/40 text-sp bg-sp/10' }, { key: 'completed', label: 'Terminée', cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' }].map(s => (
                            <button type="button" key={s.key} onClick={() => set('status', s.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.status === s.key ? s.cls : 'bg-navy-700 border-white/8 text-slate-500'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => set('convocationSent', !form.convocationSent)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.convocationSent ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 bg-navy-700'}`}>
                        {form.convocationSent && <Check size={11} className="text-white" />}
                    </button>
                    <span className="text-xs text-slate-400">Convocation envoyée aux résidents</span>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ordre du jour</label>
                    <div className="space-y-2">
                        {form.agenda.map((a, i) => (
                            <div key={a.id} className="flex gap-2">
                                <span className="w-5 h-9 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}.</span>
                                <input type="text" value={a.title} onChange={e => setAgenda(i, e.target.value)}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.agenda.length > 1 && (
                                    <button type="button" onClick={() => removePoint(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.agenda.length < 8 && (
                            <button type="button" onClick={addPoint} className="text-xs text-sp hover:text-sp/80 flex items-center gap-1">
                                <Plus size={12} /> Ajouter un point
                            </button>
                        )}
                    </div>
                </div>

                {form.status === 'completed' && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Présents</label>
                                <input type="number" min="0" value={form.attendance?.present ?? ''} onChange={e => set('attendance', { ...form.attendance, present: e.target.value })}
                                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Total copropriétaires</label>
                                <input type="number" min="0" value={form.attendance?.total ?? ''} onChange={e => set('attendance', { ...form.attendance, total: e.target.value })}
                                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Résultats des votes</label>
                            <div className="space-y-2">
                                {form.agenda.filter(a => a.title.trim()).map(a => {
                                    const v = form.votes.find(x => x.agendaId === a.id) ?? { pour: 0, contre: 0, abstention: 0 }
                                    return (
                                        <div key={a.id} className="bg-navy-700/60 rounded-xl p-3 border border-white/5">
                                            <p className="text-xs font-semibold text-slate-300 mb-2">{a.title}</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[['pour', 'Pour', 'text-emerald-400'], ['contre', 'Contre', 'text-red-400'], ['abstention', 'Abstention', 'text-slate-400']].map(([field, label, cls]) => (
                                                    <div key={field}>
                                                        <label className={`block text-[10px] font-semibold ${cls} mb-1`}>{label}</label>
                                                        <input type="number" min="0" value={v[field] ?? 0}
                                                            onChange={e => setVote(a.id, field, e.target.value)}
                                                            className="w-full bg-navy-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                        placeholder="Observations, décisions complémentaires..."
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
                </div>

                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Annuler
                        </button>
                        <button type="submit"
                            className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            <Check size={15} /> Enregistrer
                        </button>
                    </div>
                ) : (
                    <div className="bg-sp/8 border border-sp/25 rounded-xl p-3.5">
                        <p className="text-xs text-slate-300 text-center mb-3">
                            Confirmer les modifications pour <span className="text-white font-semibold">"{form.title}"</span> ?
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmSave(false)}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                Revenir
                            </button>
                            <button type="button" onClick={doSave} disabled={saving}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-sp/20 text-sp border border-sp/30 hover:bg-sp/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={12} /> Oui, enregistrer</>}
                            </button>
                        </div>
                    </div>
                )}

                <div className="border-t border-white/5 pt-3">
                    {!confirmDelete ? (
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            className="w-full py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5">
                            <Trash2 size={12} /> Supprimer cette AG
                        </button>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <p className="text-xs text-red-300 text-center mb-3">Supprimer définitivement cette AG ?</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                    Revenir
                                </button>
                                <button type="button" onClick={() => onDelete(meeting.id)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                                    Oui, supprimer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   USERS PAGE  (super_admin only)
══════════════════════════════════════════ */
function UsersPage({ showToast }) {
    const [showCreate, setShowCreate] = useState(false)
    const [, forceUpdate] = useState(0)

    function getAllUsers() {
        const created = JSON.parse(localStorage.getItem('sp_created_users') ?? '[]')
        return [...DEMO_USERS, ...created]
    }

    const users = getAllUsers()

    const ROLE_META = {
        super_admin: { label: 'Super Admin', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
        syndic_manager: { label: 'Syndic', cls: 'bg-sp/15 text-sp border-sp/20' },
    }

    function handleCreated() {
        forceUpdate(n => n + 1)
        showToast?.('Compte créé avec succès.', 'success')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{users.length} compte{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 font-bold text-sm rounded-xl transition-all shadow-glow-cyan">
                    <Plus size={16} /> Créer un compte
                </button>
            </div>

            {/* Users table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-4 py-2.5 border-b border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nom / Email</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rôle</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accès bâtiments</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut</span>
                </div>
                {users.map(u => {
                    const meta = ROLE_META[u.role] ?? ROLE_META.syndic_manager
                    const isDemo = DEMO_USERS.some(d => d.id === u.id)
                    return (
                        <div key={u.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-4 py-3.5 border-b border-white/4 hover:bg-white/2 transition-colors items-center">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: `#${u.avatar_bg ?? '0d1629'}`, color: `#${u.avatar_color ?? '06b6d4'}`, border: `1px solid #${u.avatar_color ?? '06b6d4'}33` }}>
                                    {(u.full_name ?? u.email).slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-200 truncate">{u.full_name ?? '—'}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit ${meta.cls}`}>
                                {meta.label}
                            </span>
                            <span className="text-xs text-slate-400">{u.accessible_building_ids?.length ?? 0} bâtiment{(u.accessible_building_ids?.length ?? 0) > 1 ? 's' : ''}</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDemo ? 'bg-slate-700 text-slate-400 border border-white/8' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'}`}>
                                    {isDemo ? 'Démo' : 'Actif'}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <AnimatePresence>
                {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   CREATE USER MODAL  (super_admin only)
══════════════════════════════════════════ */
function CreateUserModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ fullName: '', syndicName: '', buildingIds: '' })
    const [saving, setSaving] = useState(false)
    const [done, setDone] = useState(null) // { email, password }
    const [showPwd, setShowPwd] = useState(false)
    const [copied, setCopied] = useState(false)

    // Auto-derive email from syndicName
    const emailSlug = form.syndicName.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '')
        || 'syndic'
    const derivedEmail = `syndic_manager@${emailSlug}.ma`

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function generatePassword() {
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
        const lower = 'abcdefghjkmnpqrstuvwxyz'
        const digits = '23456789'
        return (
            upper[Math.floor(Math.random() * upper.length)] +
            lower[Math.floor(Math.random() * lower.length)] +
            digits[Math.floor(Math.random() * digits.length)] +
            upper[Math.floor(Math.random() * upper.length)] +
            lower[Math.floor(Math.random() * lower.length)] +
            digits[Math.floor(Math.random() * digits.length)]
        )
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.syndicName.trim()) return
        setSaving(true)
        await new Promise(r => setTimeout(r, 800))

        const pwd = generatePassword()
        const bldIds = form.buildingIds.split(',').map(s => s.trim()).filter(Boolean)
        const newUser = {
            id: `usr-${Date.now()}`,
            email: derivedEmail,
            password: pwd,
            full_name: form.fullName.trim() || derivedEmail,
            role: 'syndic_manager',
            org_id: `org-${Date.now()}`,
            accessible_building_ids: bldIds.length ? bldIds : ['bld-1'],
            avatar_bg: '0d1629',
            avatar_color: '06b6d4',
        }

        const existing = JSON.parse(localStorage.getItem('sp_created_users') ?? '[]')
        localStorage.setItem('sp_created_users', JSON.stringify([...existing, newUser]))

        setSaving(false)
        setDone({ email: derivedEmail, password: pwd })
        onCreated?.()
    }

    function copyCredentials() {
        navigator.clipboard.writeText(`Email: ${done.email}\nMot de passe: ${done.password}`).catch(() => { })
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Modal title="Créer un compte" subtitle="Nouveau gestionnaire de syndic" onClose={onClose} width="max-w-md">
            {!done ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom du syndic <span className="text-red-400">*</span></label>
                        <input type="text" value={form.syndicName} onChange={e => set('syndicName', e.target.value)}
                            placeholder="ex : Norwest, Résidence Atlas…"
                            required
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                        <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                            <Mail size={11} className="text-sp" /> Email généré : <span className="text-sp font-mono">{derivedEmail}</span>
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom complet du gestionnaire</label>
                        <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                            placeholder="ex : Omar Benali"
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">IDs de bâtiments accessibles</label>
                        <input type="text" value={form.buildingIds} onChange={e => set('buildingIds', e.target.value)}
                            placeholder="ex : bld-1, bld-2"
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                        <p className="text-[11px] text-slate-500 mt-1">Séparez les IDs par une virgule. Défaut : bld-1</p>
                    </div>

                    <div className="rounded-xl bg-sp/5 border border-sp/15 p-3">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            <span className="text-sp font-bold">Convention :</span> Email au format <span className="font-mono text-sp">syndic_manager@syndicname.ma</span>. Le mot de passe temporaire généré devra être communiqué au gestionnaire.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-semibold text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving || !form.syndicName.trim()}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp-dark disabled:opacity-50 text-navy-900 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                            {saving
                                ? <><span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" /> Création…</>
                                : <><Key size={14} /> Créer le compte</>
                            }
                        </button>
                    </div>
                </form>
            ) : (
                /* ── Success state — show credentials ── */
                <div className="space-y-4">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                        <p className="text-sm font-bold text-emerald-400 mb-1">Compte créé avec succès ✓</p>
                        <p className="text-xs text-slate-400">Communiquez ces identifiants au gestionnaire de façon sécurisée.</p>
                    </div>
                    <div className="rounded-xl bg-navy-700 border border-white/8 p-4 space-y-3">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Email</p>
                            <p className="font-mono text-sm text-sp">{done.email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Mot de passe temporaire</p>
                            <div className="flex items-center gap-3">
                                <code className="font-mono text-base font-bold text-white tracking-widest flex-1">
                                    {showPwd ? done.password : '••••••'}
                                </code>
                                <button type="button" onClick={() => setShowPwd(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick={copyCredentials}
                        className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors bg-sp/10 hover:bg-sp/20 text-sp border-sp/20">
                        {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier les identifiants</>}
                    </button>
                    <button onClick={onClose}
                        className="w-full py-2.5 text-sm font-semibold text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                        Fermer
                    </button>
                </div>
            )}
        </Modal>
    )
}

/* ══════════════════════════════════════════
   RESIDENT PORTAL  (read-only transparency)
══════════════════════════════════════════ */
function ResidentPortal({ session, onLogout }) {
    const { buildingId, resident: sessionResident } = session
    const building = BUILDINGS.find(b => b.id === buildingId) ?? {}
    const bldgData = getBuildingData(buildingId)
    const expenses = bldgData.expenses ?? []

    // Merge session snapshot with any payment updates persisted by syndic after login
    const resident = (() => {
        try {
            const map = JSON.parse(localStorage.getItem(`sp_payments_${buildingId}`) ?? '{}')
            if (map[sessionResident.id]) return { ...sessionResident, paidThrough: map[sessionResident.id] }
        } catch { }
        return sessionResident
    })()

    // Read meetings from localStorage (reflects syndic add/edit via AssembliesPage useEffect)
    const meetings = (() => {
        try {
            const stored = JSON.parse(localStorage.getItem(`sp_meetings_${buildingId}`) ?? 'null')
            if (Array.isArray(stored)) return stored
        } catch { }
        return bldgData.meetings ?? []
    })()

    const status = computeStatus(resident.paidThrough)

    const nextAG = meetings.find(m => m.status === 'upcoming')

    const [expandedCirc, setExpandedCirc] = useState(null)
    const [copiedBankField, setCopiedBankField] = useState(null)
    const [showPaymentPanel, setShowPaymentPanel] = useState(false)

    // ── Payment info (read localStorage override, fall back to building base data) ──
    const bankInfo = (() => {
        let b = {
            rib: building.payment_rib ?? '',
            bank: building.payment_bank ?? '',
            holder: building.payment_account_holder ?? '',
            whatsapp: building.payment_whatsapp ?? '',
            reserve_fund_mad: building.reserve_fund_mad ?? null,
        }
        try {
            const stored = JSON.parse(localStorage.getItem(`sp_bank_${buildingId}`) ?? '{}')
            if (stored.payment_rib)            b.rib             = stored.payment_rib
            if (stored.payment_bank)           b.bank            = stored.payment_bank
            if (stored.payment_account_holder) b.holder          = stored.payment_account_holder
            if (stored.payment_whatsapp)       b.whatsapp        = stored.payment_whatsapp
            if (stored.reserve_fund_mad != null) b.reserve_fund_mad = stored.reserve_fund_mad
        } catch { }
        return b
    })()

    // Collection rate — applies localStorage payment overrides on top of static resident list
    const portalResidents = (() => {
        try {
            const map = JSON.parse(localStorage.getItem(`sp_payments_${buildingId}`) ?? '{}')
            return (bldgData.residents ?? []).map(r => map[r.id] ? { ...r, paidThrough: map[r.id] } : r)
        } catch { }
        return bldgData.residents ?? []
    })()
    const portalPaidCount = portalResidents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const portalCollectionRate = portalResidents.length > 0
        ? Math.round((portalPaidCount / portalResidents.length) * 1000) / 10
        : 0
    const payFee = resident.monthly_fee ?? building.monthly_fee ?? 850
    const payMonthsOwed = getUnpaidMonthsCount(resident.paidThrough)
    const payAmountOwed = payMonthsOwed * payFee

    function buildContactMsg() {
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        const [py, pm] = (resident.paidThrough ?? '0000-00').split('-').map(Number)
        const months = []
        let y = py, m = pm + 1
        while (y < cy || (y === cy && m <= cm)) {
            months.push(formatMonth(`${y}-${String(m).padStart(2, '0')}`))
            m++; if (m > 12) { m = 1; y++ }
        }
        const monthList = months.map(x => `  • ${x}`).join('\n')
        return encodeURIComponent(
            `Bonjour,\n\nJe suis ${resident.name}, appartement ${resident.unit} à ${building.name ?? ''}.\n\nJe souhaite régler mes charges impayées pour les mois suivants :\n${monthList}\n\nMontant total dû : ${payAmountOwed.toLocaleString('fr-FR')} MAD\n\nMerci de m'indiquer la marche à suivre.\n\nCordialement,\n${resident.name}`
        )
    }
    function copyBankField(key, val) {
        navigator.clipboard.writeText(val).catch(() => {})
        setCopiedBankField(key)
        setTimeout(() => setCopiedBankField(null), 2000)
    }
    let recentCircs = []
    try {
        const allCircs = JSON.parse(localStorage.getItem(`sp_circ_${buildingId}`) ?? '[]')
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        recentCircs = allCircs.filter(c => new Date(c.createdAt).getTime() >= cutoff).slice(0, 5)
    } catch { }

    const STATUS_META = {
        paid: { label: 'À jour', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
        pending: { label: 'En attente', cls: 'bg-amber-500/15  text-amber-400  border-amber-500/20' },
        overdue: { label: 'En retard', cls: 'bg-red-500/15    text-red-400    border-red-500/20' },
    }
    const sm = STATUS_META[status]

    const Icon = BUILDING_ICON_MAP[building.icon] ?? Home

    return (
        <div className="min-h-screen bg-navy-900">

            {/* ── Header ── */}
            <header className="bg-navy-800 border-b border-white/5 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${building.color ?? '#06b6d4'}20`, border: `1px solid ${building.color ?? '#06b6d4'}40` }}>
                            <Icon size={18} style={{ color: building.color ?? '#06b6d4' }} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">{building.name ?? '—'}</p>
                            <p className="text-[11px] text-slate-500">
                                Espace Résident · {resident.unit} · {resident.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={onLogout}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors">
                        <LogOut size={13} /> Se déconnecter
                    </button>
                </div>
            </header>

            {/* ── Content ── */}
            <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                {/* Welcome banner */}
                <div className="rounded-2xl glass-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center flex-shrink-0">
                        <Home size={18} className="text-sp" />
                    </div>
                    <div>
                        <p className="text-base font-bold text-white">Bienvenue, {resident.name.split(' ')[0]} !</p>
                        <p className="text-xs text-slate-400 mt-0.5">Voici les informations de transparence pour votre résidence <span className="text-white font-semibold">{building.name}</span>.</p>
                    </div>
                </div>

                {/* ── Avis en cours (Circulaires) ── */}
                {recentCircs.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/15">
                            <Megaphone size={14} className="text-amber-400" />
                            <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Avis de la résidence</p>
                            <span className="ml-auto text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                                {recentCircs.length} avis
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="divide-y divide-amber-500/10">
                            {recentCircs.map(c => {
                                const tpl = CIRCULAIRE_TEMPLATES.find(t => t.key === c.template)
                                const label = tpl?.label ?? c.template
                                const icon = tpl?.icon ?? '📢'
                                const when = new Date(c.createdAt).toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })
                                const fullMsg = buildCirculaireMessage(c.template, c.vars, building.name ?? '')
                                // First non-empty line as teaser
                                const teaser = fullMsg.split('\n').find(l => l.trim()) ?? label
                                const isOpen = expandedCirc === c.id
                                return (
                                    <div key={c.id}>
                                        {/* Clickable header row */}
                                        <button
                                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-amber-500/8 transition-colors text-left"
                                            onClick={() => setExpandedCirc(isOpen ? null : c.id)}
                                        >
                                            <span className="text-xl leading-none flex-shrink-0">{icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-xs font-bold text-amber-200">{label}</p>
                                                    {c.diffuse && (
                                                        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                                            Diffusé
                                                        </span>
                                                    )}
                                                </div>
                                                {!isOpen && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{teaser}</p>
                                                )}
                                                <p className="text-[10px] text-slate-600 mt-0.5">Publié le {when}</p>
                                            </div>
                                            <ChevronDown
                                                size={14}
                                                className={`text-amber-400/50 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {/* Expanded body */}
                                        {isOpen && (
                                            <div className="px-4 pb-4 pt-1">
                                                <div className="rounded-xl bg-navy-800/60 border border-amber-500/10 p-4">
                                                    <pre className="text-[12px] text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                                                        {fullMsg}
                                                    </pre>
                                                </div>
                                                <p className="text-[10px] text-slate-600 mt-2 text-right">
                                                    Publié le {when} · {building.name}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 2-col grid */}
                <div className="grid lg:grid-cols-2 gap-4">

                    {/* ── Left col — Personal ── */}
                    <div className="space-y-4">

                        {/* Mon appartement */}
                        <div className="glass-card rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Mon appartement</p>
                            <div className="space-y-2.5">
                                {[
                                    ['Unité', resident.unit],
                                    ['Étage', resident.floor != null ? `Étage ${resident.floor}` : '—'],
                                    ['Depuis', resident.since ?? '—'],
                                    ['Quote-part', `${resident.quota ?? '—'}%`],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">{k}</span>
                                        <span className="text-xs font-semibold text-slate-200">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mes charges */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Mes charges</p>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-400">Statut de paiement</span>
                                    {status !== 'paid' ? (
                                        <button
                                            onClick={() => setShowPaymentPanel(v => !v)}
                                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all hover:opacity-80 ${sm.cls}`}
                                        >
                                            {sm.label}
                                            <ChevronDown size={10} className={`transition-transform duration-200 ${showPaymentPanel ? 'rotate-180' : ''}`} />
                                        </button>
                                    ) : (
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sm.cls}`}>{sm.label}</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">À jour jusqu'à</span>
                                    <span className="text-xs font-semibold text-slate-200">{formatMonth(resident.paidThrough)}</span>
                                </div>
                                {status !== 'paid' && !showPaymentPanel && (
                                    <p className="text-[11px] text-slate-500 mt-3">
                                        Merci de régulariser votre situation.{' '}
                                        <button onClick={() => setShowPaymentPanel(true)} className="text-sp hover:underline font-semibold">
                                            Voir comment régler →
                                        </button>
                                    </p>
                                )}
                            </div>

                            {/* ── Accordion: payment details ── */}
                            {status !== 'paid' && showPaymentPanel && (
                                <div className={`border-t ${status === 'overdue' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                                    {/* Amount summary */}
                                    <div className={`flex items-center justify-between px-5 py-3 border-b ${status === 'overdue' ? 'border-red-500/12' : 'border-amber-500/12'}`}>
                                        <div>
                                            <p className={`text-sm font-bold ${status === 'overdue' ? 'text-red-400' : 'text-amber-400'}`}>
                                                {status === 'overdue' ? 'Charges en retard' : 'Mois en attente'}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{payMonthsOwed} mois × {payFee.toLocaleString('fr-FR')} MAD</p>
                                        </div>
                                        <p className={`text-lg font-bold ${status === 'overdue' ? 'text-red-400' : 'text-amber-400'}`}>
                                            {payAmountOwed.toLocaleString('fr-FR')} MAD
                                        </p>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        {/* Bank details */}
                                        {(bankInfo.rib || bankInfo.bank) && (
                                            <div className="rounded-xl bg-navy-800/70 border border-white/8 p-4 space-y-3">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Virement bancaire</p>
                                                {bankInfo.holder && (
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-[11px] text-slate-500 w-20 flex-shrink-0">Titulaire</span>
                                                        <span className="text-[12px] text-slate-200 font-medium flex-1 text-right">{bankInfo.holder}</span>
                                                        <button onClick={() => copyBankField('holder', bankInfo.holder)} title="Copier"
                                                            className="flex-shrink-0 text-slate-500 hover:text-sp transition-colors">
                                                            {copiedBankField === 'holder' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                                        </button>
                                                    </div>
                                                )}
                                                {bankInfo.bank && (
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-[11px] text-slate-500 w-20 flex-shrink-0">Banque</span>
                                                        <span className="text-[12px] text-slate-200 font-medium flex-1 text-right">{bankInfo.bank}</span>
                                                        <button onClick={() => copyBankField('bank', bankInfo.bank)} title="Copier"
                                                            className="flex-shrink-0 text-slate-500 hover:text-sp transition-colors">
                                                            {copiedBankField === 'bank' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                                        </button>
                                                    </div>
                                                )}
                                                {bankInfo.rib && (
                                                    <div className="flex items-center justify-between gap-3 rounded-lg bg-navy-700/50 border border-white/5 px-3 py-2">
                                                        <span className="text-[11px] text-slate-500 w-16 flex-shrink-0 font-semibold">RIB</span>
                                                        <span className="text-[12px] text-slate-100 font-mono font-bold flex-1 text-right tracking-wider">{bankInfo.rib}</span>
                                                        <button onClick={() => copyBankField('rib', bankInfo.rib)} title="Copier le RIB"
                                                            className="flex-shrink-0 text-slate-400 hover:text-sp transition-colors ml-2">
                                                            {copiedBankField === 'rib' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-600 pt-1">Indiquez votre nom et appartement dans le libellé du virement.</p>
                                            </div>
                                        )}

                                        {/* Contact */}
                                        {bankInfo.whatsapp && (
                                            <a
                                                href={`https://wa.me/${bankInfo.whatsapp.replace(/\D/g, '')}?text=${buildContactMsg()}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-500/12 hover:bg-emerald-500/22 text-emerald-400 rounded-xl text-sm font-semibold border border-emerald-500/20 transition-all"
                                            >
                                                <MessageCircle size={14} /> Contacter le syndic par WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Historique des 6 derniers mois */}
                        {(() => {
                            // Build last-6-months list relative to CURRENT_MONTH
                            const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
                            const months = Array.from({ length: 6 }, (_, i) => {
                                let m = cm - 5 + i
                                let y = cy
                                while (m <= 0) { m += 12; y-- }
                                return `${y}-${String(m).padStart(2, '0')}`
                            })
                            const [py, pm] = (resident.paidThrough ?? '0000-00').split('-').map(Number)
                            return (
                                <div className="glass-card rounded-2xl p-5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Historique des 6 derniers mois</p>
                                    <div className="space-y-2">
                                        {months.map(ym => {
                                            const [y, m] = ym.split('-').map(Number)
                                            const paid = y < py || (y === py && m <= pm)
                                            return (
                                                <div key={ym} className="flex items-center justify-between">
                                                    <span className="text-xs text-slate-400">{formatMonth(ym)}</span>
                                                    <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${paid
                                                            ? 'bg-emerald-500/12 text-emerald-400'
                                                            : ym === CURRENT_MONTH
                                                                ? 'bg-amber-500/12 text-amber-400'
                                                                : 'bg-red-500/12 text-red-400'
                                                        }`}>
                                                        {paid ? '✓' : ym === CURRENT_MONTH ? '–' : '✗'}
                                                        {paid ? 'Payé' : ym === CURRENT_MONTH ? 'En attente' : 'Non payé'}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })()}

                    </div>

                    {/* ── Right col — Building ── */}
                    <div className="space-y-4">

                        {/* Budget résidence */}
                        <div className="glass-card rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Budget de la résidence</p>
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Taux de recouvrement</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${portalCollectionRate}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400">{portalCollectionRate}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Fonds de réserve</span>
                                    <span className="text-xs font-semibold text-slate-200">
                                        {bankInfo.reserve_fund_mad != null
                                            ? Number(bankInfo.reserve_fund_mad).toLocaleString('fr-MA') + ' MAD'
                                            : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Nombre d'unités</span>
                                    <span className="text-xs font-semibold text-slate-200">{building.total_units ?? '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dépenses */}
                        {expenses.length > 0 && (
                            <div className="glass-card rounded-2xl p-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Répartition des dépenses</p>
                                <div className="space-y-3">
                                    {expenses.slice(0, 4).map(exp => (
                                        <div key={exp.category}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] text-slate-400 truncate pr-2">{exp.category}</span>
                                                <span className="text-[11px] font-semibold text-slate-200 flex-shrink-0">
                                                    {exp.amount.toLocaleString('fr-MA')} MAD
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                                                <div className={`h-full ${exp.color ?? 'bg-sp'} rounded-full`} style={{ width: `${exp.pct}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prochaine AG */}
                        {nextAG && (
                            <div className="glass-card rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prochaine AG</p>
                                    <span className="text-[9px] font-bold bg-sp/15 text-sp border border-sp/20 px-2 py-0.5 rounded-full">À VENIR</span>
                                </div>
                                <p className="text-sm font-semibold text-white mb-1">{nextAG.title}</p>
                                <p className="text-xs text-slate-400 mb-3">
                                    {fmtDate(nextAG.date)} · {nextAG.time} · {nextAG.location}
                                </p>
                                {nextAG.agenda?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Ordre du jour</p>
                                        <ul className="space-y-1">
                                            {nextAG.agenda.map((a, i) => (
                                                <li key={a.id} className="text-xs text-slate-400 flex gap-2">
                                                    <span className="text-slate-600 flex-shrink-0">{i + 1}.</span>
                                                    {a.title}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                {/* Contact syndic footer */}
                <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-white">Contacter le syndic</p>
                        <p className="text-xs text-slate-400 mt-0.5">{building.name} · {building.manager ?? 'Gestionnaire'}</p>
                    </div>
                    <div className="flex gap-3">
                        {building.manager && (
                            <a href={`mailto:contact@syndicpulse.ma?subject=Résidence ${building.name} — Demande résident (${resident.unit})`}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sp/10 hover:bg-sp/20 text-sp border border-sp/20 text-xs font-semibold transition-colors">
                                <Mail size={13} /> E-mail
                            </a>
                        )}
                        <a href="https://wa.me/212600000000"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors">
                            <Phone size={13} /> WhatsApp
                        </a>
                    </div>
                </div>

                {/* Transparency footer note */}
                <p className="text-center text-[11px] text-slate-600 pb-4">
                    Ces données sont fournies par votre syndic dans le cadre de la transparence financière prévue par la Loi 18-00.
                </p>

            </main>
        </div>
    )
}
