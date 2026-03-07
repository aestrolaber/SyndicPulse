/**
 * SyndicPulse — Real Supabase Data Service
 *
 * Each function maps between app camelCase and DB snake_case.
 * All functions are async and return plain JS objects (no Supabase internals).
 * On error, functions throw so callers can catch and show toasts.
 *
 * Field mapping:
 *   residents:         paidThrough ↔ paid_through, portalPin ↔ portal_pin,
 *                      portalCode ↔ portal_code, monthlyFee ↔ monthly_fee,
 *                      isActive ↔ is_active
 *   suppliers:         contractRef ↔ contract_ref
 *   meetings:          convocationSent ↔ convocation_sent
 *   expenses:          hasInvoice ↔ has_invoice
 *   tickets:           customCategory ↔ custom_category
 *   building_settings: name ↔ name_override, city ↔ city_override,
 *                      manager ↔ manager_override, logo ↔ logo_b64,
 *                      cachet ↔ cachet_b64 (other fields pass through as-is)
 */

import { createClient } from '@supabase/supabase-js'

const db = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function checkError(error, context) {
    if (error) throw new Error(`[db.js] ${context}: ${error.message}`)
}

/** Convert DB row → app resident object (snake_case → camelCase) */
function rowToResident(r) {
    return {
        id:          r.id,
        building_id: r.building_id,
        unit:        r.unit,
        name:        r.name,
        phone:       r.phone ?? '',
        paidThrough: r.paid_through ?? null,
        floor:       r.floor ?? 0,
        since:       r.since ?? '',
        quota:       r.quota ?? 0,
        monthlyFee:  r.monthly_fee ?? 0,
        portalPin:   r.portal_pin ?? null,
        portalCode:  r.portal_code ?? null,
        isActive:    r.is_active ?? true,
        // Keep snake_case aliases so whichever form the app reads works
        paid_through:  r.paid_through ?? null,
        portal_pin:    r.portal_pin ?? null,
        portal_code:   r.portal_code ?? null,
        monthly_fee:   r.monthly_fee ?? 0,
        is_active:     r.is_active ?? true,
    }
}

/** Convert app resident object → DB row (camelCase → snake_case) */
function residentToRow(r) {
    const row = {
        id:           r.id,
        building_id:  r.building_id ?? r.buildingId,
        unit:         r.unit,
        name:         r.name,
        phone:        r.phone ?? null,
        paid_through: r.paidThrough ?? r.paid_through ?? null,
        floor:        r.floor ?? 0,
        since:        r.since ?? null,
        quota:        r.quota ?? null,
        monthly_fee:  r.monthlyFee ?? r.monthly_fee ?? null,
        portal_pin:   r.portalPin ?? r.portal_pin ?? null,
        portal_code:  r.portalCode ?? r.portal_code ?? null,
        is_active:    r.isActive ?? r.is_active ?? true,
    }
    // Remove undefined values to avoid overwriting DB defaults with null
    return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined))
}

/** Convert DB row → app expense object */
function rowToExpense(r) {
    return {
        id:          r.id,
        building_id: r.building_id,
        date:        r.date,
        category:    r.category,
        vendor:      r.vendor ?? '',
        amount:      r.amount,
        description: r.description ?? '',
        hasInvoice:  r.has_invoice ?? false,
        has_invoice: r.has_invoice ?? false,
    }
}

/** Convert app expense object → DB row */
function expenseToRow(e) {
    return {
        id:          e.id,
        building_id: e.building_id,
        date:        e.date,
        category:    e.category,
        vendor:      e.vendor ?? null,
        amount:      e.amount,
        description: e.description ?? null,
        has_invoice: e.hasInvoice ?? e.has_invoice ?? false,
    }
}

/** Convert DB row → app ticket object */
function rowToTicket(r) {
    return {
        id:             r.id,
        building_id:    r.building_id,
        title:          r.title,
        status:         r.status,
        date:           r.date ?? null,
        time:           r.time ?? null,
        agent:          r.agent ?? '',
        priority:       r.priority ?? 'normal',
        category:       r.category ?? 'autre',
        customCategory: r.custom_category ?? '',
        custom_category:r.custom_category ?? '',
    }
}

/** Convert app ticket → DB row */
function ticketToRow(t) {
    return {
        id:              t.id,
        building_id:     t.building_id,
        title:           t.title,
        status:          t.status,
        date:            t.date ?? null,
        time:            t.time ?? null,
        agent:           t.agent ?? null,
        priority:        t.priority ?? 'normal',
        category:        t.category ?? 'autre',
        custom_category: t.customCategory ?? t.custom_category ?? null,
    }
}

/** Convert DB row → app dispute object */
function rowToDispute(r) {
    return {
        id:            r.id,
        building_id:   r.building_id,
        title:         r.title,
        parties:       r.parties ?? [],
        status:        r.status,
        priority:      r.priority ?? 'medium',
        date:          r.date ?? null,
        ai_suggestion: r.ai_suggestion ?? '',
        attachments:   r.attachments ?? [],
        notes:         r.notes ?? '',
    }
}

/** Convert app dispute → DB row */
function disputeToRow(d) {
    return {
        id:            d.id,
        building_id:   d.building_id,
        title:         d.title,
        parties:       d.parties ?? [],
        status:        d.status,
        priority:      d.priority ?? 'medium',
        date:          d.date ?? null,
        ai_suggestion: d.ai_suggestion ?? null,
        attachments:   d.attachments ?? [],
        notes:         d.notes ?? null,
    }
}

/** Convert DB row → app supplier object */
function rowToSupplier(r) {
    return {
        id:          r.id,
        building_id: r.building_id,
        name:        r.name,
        category:    r.category ?? 'autre',
        phone:       r.phone ?? '',
        email:       r.email ?? '',
        contractRef: r.contract_ref ?? '',
        contract_ref:r.contract_ref ?? '',
        since:       r.since ?? '',
        rating:      r.rating ?? 0,
        notes:       r.notes ?? '',
    }
}

/** Convert app supplier → DB row */
function supplierToRow(s) {
    return {
        id:           s.id,
        building_id:  s.building_id,
        name:         s.name,
        category:     s.category ?? null,
        phone:        s.phone ?? null,
        email:        s.email ?? null,
        contract_ref: s.contractRef ?? s.contract_ref ?? null,
        since:        s.since ?? null,
        rating:       s.rating ?? null,
        notes:        s.notes ?? null,
    }
}

/** Convert DB row → app meeting object */
function rowToMeeting(r) {
    return {
        id:               r.id,
        building_id:      r.building_id,
        title:            r.title,
        date:             r.date ?? null,
        time:             r.time ?? null,
        location:         r.location ?? '',
        status:           r.status ?? 'upcoming',
        convocationSent:  r.convocation_sent ?? false,
        convocation_sent: r.convocation_sent ?? false,
        agenda:           r.agenda ?? [],
        attendance:       r.attendance ?? null,
        votes:            r.votes ?? [],
        notes:            r.notes ?? '',
    }
}

/** Convert app meeting → DB row */
function meetingToRow(m) {
    return {
        id:               m.id,
        building_id:      m.building_id,
        title:            m.title,
        date:             m.date ?? null,
        time:             m.time ?? null,
        location:         m.location ?? null,
        status:           m.status ?? 'upcoming',
        convocation_sent: m.convocationSent ?? m.convocation_sent ?? false,
        agenda:           m.agenda ?? [],
        attendance:       m.attendance ?? null,
        votes:            m.votes ?? [],
        notes:            m.notes ?? '',
    }
}

// ── RESIDENTS ─────────────────────────────────────────────────────────────────

export async function fetchResidents(buildingId) {
    const { data, error } = await db
        .from('residents')
        .select('*')
        .eq('building_id', buildingId)
        .order('unit', { ascending: true })
    checkError(error, 'fetchResidents')
    return (data ?? []).map(rowToResident)
}

export async function upsertResident(resident) {
    const row = residentToRow(resident)
    const { error } = await db.from('residents').upsert(row, { onConflict: 'id' })
    checkError(error, 'upsertResident')
}

/** Soft-delete: sets is_active = false (preserves portal history) */
export async function deleteResident(id) {
    const { error } = await db
        .from('residents')
        .update({ is_active: false })
        .eq('id', id)
    checkError(error, 'deleteResident')
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────

export async function fetchExpenses(buildingId) {
    const { data, error } = await db
        .from('expenses')
        .select('*')
        .eq('building_id', buildingId)
        .order('date', { ascending: false })
    checkError(error, 'fetchExpenses')
    return (data ?? []).map(rowToExpense)
}

export async function upsertExpense(expense) {
    const row = expenseToRow(expense)
    const { error } = await db.from('expenses').upsert(row, { onConflict: 'id' })
    checkError(error, 'upsertExpense')
}

export async function deleteExpense(id) {
    const { error } = await db.from('expenses').delete().eq('id', id)
    checkError(error, 'deleteExpense')
}

// ── TICKETS ───────────────────────────────────────────────────────────────────

export async function fetchTickets(buildingId) {
    const { data, error } = await db
        .from('tickets')
        .select('*')
        .eq('building_id', buildingId)
        .order('date', { ascending: false })
    checkError(error, 'fetchTickets')
    return (data ?? []).map(rowToTicket)
}

export async function upsertTicket(ticket) {
    const row = ticketToRow(ticket)
    const { error } = await db.from('tickets').upsert(row, { onConflict: 'id' })
    checkError(error, 'upsertTicket')
}

// ── DISPUTES ──────────────────────────────────────────────────────────────────

export async function fetchDisputes(buildingId) {
    const { data, error } = await db
        .from('disputes')
        .select('*')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })
    checkError(error, 'fetchDisputes')
    return (data ?? []).map(rowToDispute)
}

export async function upsertDispute(dispute) {
    const row = disputeToRow(dispute)
    const { error } = await db.from('disputes').upsert(row, { onConflict: 'id' })
    checkError(error, 'upsertDispute')
}

export async function deleteDispute(id) {
    const { error } = await db.from('disputes').delete().eq('id', id)
    checkError(error, 'deleteDispute')
}

// ── SUPPLIERS ─────────────────────────────────────────────────────────────────

export async function fetchSuppliers(buildingId) {
    const { data, error } = await db
        .from('suppliers')
        .select('*')
        .eq('building_id', buildingId)
        .order('name', { ascending: true })
    checkError(error, 'fetchSuppliers')
    return (data ?? []).map(rowToSupplier)
}

export async function upsertSupplier(supplier) {
    const row = supplierToRow(supplier)
    const { error } = await db.from('suppliers').upsert(row, { onConflict: 'id' })
    checkError(error, 'upsertSupplier')
}

export async function deleteSupplier(id) {
    const { error } = await db.from('suppliers').delete().eq('id', id)
    checkError(error, 'deleteSupplier')
}

// ── MEETINGS ──────────────────────────────────────────────────────────────────

export async function fetchMeetings(buildingId) {
    const { data, error } = await db
        .from('meetings')
        .select('*')
        .eq('building_id', buildingId)
        .order('date', { ascending: false })
    checkError(error, 'fetchMeetings')
    return (data ?? []).map(rowToMeeting)
}

export async function upsertMeeting(meeting) {
    const row = meetingToRow(meeting)
    const { error } = await db.from('meetings').upsert(row, { onConflict: 'id' })
    checkError(error, 'upsertMeeting')
}

export async function deleteMeeting(id) {
    const { error } = await db.from('meetings').delete().eq('id', id)
    checkError(error, 'deleteMeeting')
}

// ── BUILDING SETTINGS ─────────────────────────────────────────────────────────

/**
 * Fetch building settings for a given buildingId.
 * Returns null if no row exists (PGRST116 — not an error).
 */
export async function fetchBuildingSettings(buildingId) {
    const { data, error } = await db
        .from('building_settings')
        .select('*')
        .eq('building_id', buildingId)
        .single()
    // PGRST116 = no rows — not a real error
    if (error && error.code !== 'PGRST116') throw new Error(`[db.js] fetchBuildingSettings: ${error.message}`)
    if (!data) return null
    // Map DB column names → app field names
    const { name_override, city_override, manager_override, logo_b64, cachet_b64, ...rest } = data
    return {
        ...rest,
        ...(name_override    != null && { name: name_override }),
        ...(city_override    != null && { city: city_override }),
        ...(manager_override != null && { manager: manager_override }),
        ...(logo_b64         != null && { logo: logo_b64 }),
        ...(cachet_b64       != null && { cachet: cachet_b64 }),
    }
}

/**
 * Upsert building settings.
 * `overrides` uses app field names (logo, cachet, name, city, manager).
 * Maps to DB column names before upserting.
 */
export async function saveBuildingSettings(buildingId, overrides) {
    const { name, city, manager, logo, cachet, ...rest } = overrides
    const row = {
        building_id: buildingId,
        ...rest,
        ...(name    != null && { name_override: name }),
        ...(city    != null && { city_override: city }),
        ...(manager != null && { manager_override: manager }),
        ...(logo    != null && { logo_b64: logo }),
        ...(cachet  != null && { cachet_b64: cachet }),
        updated_at: new Date().toISOString(),
    }
    const { error } = await db.from('building_settings').upsert(row, { onConflict: 'building_id' })
    checkError(error, 'saveBuildingSettings')
}

// ── BACKUPS ────────────────────────────────────────────────────────────────────

/**
 * Save a backup snapshot to Supabase.
 * Automatically prunes to keep only the 7 most recent per building.
 * @param {string} buildingId
 * @param {string} type  e.g. 'full_auto' | 'full' | 'residents+expenses'
 * @param {object} snapshot  Plain JS object (will be stored as JSONB)
 * @returns {string} The new backup id
 */
export async function createBackup(buildingId, type, snapshot) {
    const id = `bkp-${Date.now()}`
    const { error } = await db.from('backups').insert({ id, building_id: buildingId, type, snapshot })
    checkError(error, 'createBackup')
    // Prune: keep only the 7 most recent for this building
    const { data: all } = await db
        .from('backups')
        .select('id')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })
    if (all && all.length > 7) {
        const toDelete = all.slice(7).map(r => r.id)
        await db.from('backups').delete().in('id', toDelete)
    }
    return id
}

/**
 * Fetch the most recent N backup metadata rows (no snapshot payload — for display).
 * @param {string} buildingId
 * @param {number} limit  Max rows to return (default 5)
 * @returns {Array<{id, building_id, type, created_at}>}
 */
export async function fetchBackups(buildingId, limit = 5) {
    const { data, error } = await db
        .from('backups')
        .select('id, building_id, type, created_at')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })
        .limit(limit)
    checkError(error, 'fetchBackups')
    return data ?? []
}

// ── BUILDING PURGE ─────────────────────────────────────────────────────────────

/**
 * Delete ALL Supabase rows for a building across every table.
 * Called by deleteBuilding() after the building is removed from app state.
 * Fire-and-forget is acceptable — orphans are cleaned by this function on next deletion.
 */
export async function purgeBuilding(buildingId) {
    const tables = ['disputes', 'residents', 'expenses', 'tickets', 'suppliers', 'meetings', 'building_settings', 'backups']
    await Promise.all(tables.map(table =>
        db.from(table).delete().eq('building_id', buildingId)
    ))
}
