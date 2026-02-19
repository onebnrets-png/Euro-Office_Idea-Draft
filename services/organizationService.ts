// services/organizationService.ts
// ═══════════════════════════════════════════════════════════════
// Organization Service — Multi-Tenant organization management
// v1.0 — 2026-02-19
//
// ARCHITECTURE:
//   - Manages organizations, members, and org-level instructions
//   - Provides organization switching (active_organization_id)
//   - Caches active org data in memory
//   - Used by useOrganization hook and storageService
//
// TABLES:
//   - organizations
//   - organization_members
//   - organization_instructions
//   - profiles.active_organization_id
//   - projects.organization_id
// ═══════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient.ts';

// ─── Types ───────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  orgRole: 'member' | 'admin' | 'owner';
  joinedAt: string;
  // Joined from profiles:
  email?: string;
  displayName?: string;
}

export interface OrganizationInstructions {
  instructions: Record<string, string> | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export type OrgRole = 'member' | 'admin' | 'owner';

// ─── Cache ───────────────────────────────────────────────────

let cachedActiveOrg: Organization | null = null;
let cachedUserOrgs: Organization[] | null = null;
let cachedOrgInstructions: Record<string, string> | null = null;
let cachedOrgInstructionsOrgId: string | null = null;

// ─── Helpers ─────────────────────────────────────────────────

async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

function mapOrg(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Public API ──────────────────────────────────────────────

export const organizationService = {

  // ═══════════════════════════════════════════════════════════
  // ACTIVE ORGANIZATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Get the user's active organization (cached).
   * Returns null if user has no active org set.
   */
  getActiveOrg(): Organization | null {
    return cachedActiveOrg;
  },

  getActiveOrgId(): string | null {
    return cachedActiveOrg?.id || null;
  },

  getActiveOrgName(): string {
    return cachedActiveOrg?.name || 'No Organization';
  },

  /**
   * Load the user's active organization from DB.
   * Call this after login / session restore.
   */
  async loadActiveOrg(): Promise<Organization | null> {
    const userId = await getAuthUserId();
    if (!userId) return null;

    // Get active_organization_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.active_organization_id) {
      cachedActiveOrg = null;
      return null;
    }

    // Fetch org details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.active_organization_id)
      .single();

    if (orgError || !org) {
      cachedActiveOrg = null;
      return null;
    }

    cachedActiveOrg = mapOrg(org);
    return cachedActiveOrg;
  },

  /**
   * Switch the user's active organization.
   * Updates profiles.active_organization_id and refreshes cache.
   */
  async switchOrg(orgId: string): Promise<{ success: boolean; message?: string }> {
    const userId = await getAuthUserId();
    if (!userId) return { success: false, message: 'Not authenticated' };

    // Verify user is member of this org
    const { data: membership, error: memError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (memError || !membership) {
      return { success: false, message: 'You are not a member of this organization' };
    }

    // Update active
  
