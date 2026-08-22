/* eslint-disable @typescript-eslint/no-explicit-any -- collaboration RPCs are not in the generated Supabase type file yet. */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CollaboratorRole = "viewer" | "editor";
type CollaboratorStatus = "pending" | "accepted" | "declined";

type ProfileResult = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type CollaboratorRow = {
  id: string;
  itinerary_id: string;
  user_id: string;
  invited_by: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  profile?: ProfileResult | null;
};

const db = supabase as any;

export function CollaborationPanel({ itineraryId }: { itineraryId: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>("viewer");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const collaboratorsQuery = useQuery({
    queryKey: ["itinerary-collaborators", itineraryId],
    enabled: open && Boolean(itineraryId),
    queryFn: async () => {
      const { data, error } = await db
        .from("itinerary_collaborators")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as CollaboratorRow[];
      const ids = rows.map((row) => row.user_id);
      if (ids.length === 0) return rows;

      const { data: profiles, error: profileError } = await db
        .from("profiles")
        .select("id,full_name,avatar_url")
        .in("id", ids);
      if (profileError) throw profileError;

      const profileMap = new Map(
        (profiles ?? []).map((profile: ProfileResult) => [profile.id, profile]),
      );
      return rows.map((row) => ({ ...row, profile: profileMap.get(row.user_id) ?? null }));
    },
  });

  const profileSearch = useQuery({
    queryKey: ["itinerary-profile-search", searchText.trim().toLowerCase()],
    enabled: open && searchText.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await db.rpc("search_itinerary_profiles", {
        search_query: searchText.trim(),
      });
      if (error) throw error;
      return (data ?? []) as ProfileResult[];
    },
  });

  const searchResults = useMemo(() => profileSearch.data ?? [], [profileSearch.data]);
  const collaborators = collaboratorsQuery.data ?? [];

  useEffect(() => {
    if (!open || !itineraryId) return;
    const channel = supabase
      .channel(`itinerary-collaborators-${itineraryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itinerary_collaborators",
          filter: `itinerary_id=eq.${itineraryId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["itinerary-collaborators", itineraryId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [itineraryId, open, queryClient]);

  async function invite(userId: string) {
    if (!itineraryId) return;
    setInvitingId(userId);
    try {
      const { error } = await db.rpc("invite_itinerary_collaborator", {
        p_itinerary_id: itineraryId,
        p_user_id: userId,
        p_role: selectedRole,
      });
      if (error) throw error;
      setSearchText("");
      await queryClient.invalidateQueries({ queryKey: ["itinerary-collaborators", itineraryId] });
      toast.success("Invitation sent to the ErbilGo account.");
    } catch (error: any) {
      toast.error(error?.message || "Could not send the invitation.");
    } finally {
      setInvitingId(null);
    }
  }

  async function remove(collaboratorId: string) {
    setRemovingId(collaboratorId);
    try {
      const { error } = await db.rpc("remove_itinerary_collaborator", {
        p_collaborator_id: collaboratorId,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["itinerary-collaborators", itineraryId] });
      toast.success("Access removed.");
    } catch (error: any) {
      toast.error(error?.message || "Could not remove access.");
    } finally {
      setRemovingId(null);
    }
  }

  async function changeRole(collaboratorId: string, role: CollaboratorRole) {
    try {
      const { error } = await db.rpc("update_itinerary_collaborator_role", {
        p_collaborator_id: collaboratorId,
        p_role: role,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["itinerary-collaborators", itineraryId] });
      toast.success("Collaborator access updated.");
    } catch (error: any) {
      toast.error(error?.message || "Could not update access.");
    }
  }

  async function copyInviteLink() {
    if (!itineraryId || typeof window === "undefined") return;
    const link = `${window.location.origin}/shared-plan/${itineraryId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Shared plan link copied.");
    } catch {
      toast.error("Could not copy the link. Please copy it from the address bar.");
    }
  }

  if (!itineraryId) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border/70 bg-card/30 p-4">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div>
          <p className="text-sm font-semibold">Plan with friends</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Save this plan to your profile first. Then you can invite registered ErbilGo users to
            view or edit it together.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-gold/20 bg-card/30">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-gold/5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
            <Users className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Plan with friends</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Invite ErbilGo accounts to view or edit this itinerary
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Find a registered friend
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search by full name"
                  className="h-10 w-full rounded-xl border border-border bg-background/50 pl-9 pr-3 text-sm outline-none transition focus:border-gold"
                />
              </div>
            </label>
            <label className="sm:w-36">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Permission
              </span>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as CollaboratorRole)}
                className="h-10 w-full rounded-xl border border-border bg-background/50 px-3 text-sm outline-none focus:border-gold"
              >
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
            </label>
          </div>

          {searchText.trim().length > 0 && searchText.trim().length < 2 && (
            <p className="text-xs text-muted-foreground">Type at least two letters to search.</p>
          )}
          {profileSearch.isFetching && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching ErbilGo accounts…
            </p>
          )}
          {profileSearch.isError && (
            <p className="text-xs text-destructive">We could not search accounts right now.</p>
          )}
          {searchText.trim().length >= 2 &&
            !profileSearch.isFetching &&
            searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground">No matching registered account found.</p>
            )}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/30 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gold/10 text-xs font-bold text-gold">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (profile.full_name || "?").slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="truncate text-sm font-semibold">
                      {profile.full_name || "ErbilGo traveller"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => invite(profile.id)}
                    disabled={invitingId === profile.id}
                    className="shrink-0 bg-gold text-background hover:bg-gold/90"
                  >
                    {invitingId === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div>
              <p className="text-sm font-semibold">Share the plan link</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                After a collaborator accepts, this link opens the shared itinerary for everyone in
                the group.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
                People on this plan
              </p>
            </div>
            {collaboratorsQuery.isFetching && (
              <p className="text-xs text-muted-foreground">Loading access…</p>
            )}
            {!collaboratorsQuery.isFetching && collaborators.length === 0 && (
              <p className="text-xs text-muted-foreground">No invitations yet.</p>
            )}
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/30 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {collaborator.profile?.full_name || "ErbilGo traveller"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {collaborator.status === "accepted"
                      ? "Accepted"
                      : collaborator.status === "pending"
                        ? "Invitation pending"
                        : "Declined"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {collaborator.role}
                  </Badge>
                  {collaborator.status !== "declined" && (
                    <select
                      aria-label="Change collaborator permission"
                      value={collaborator.role}
                      onChange={(event) =>
                        changeRole(collaborator.id, event.target.value as CollaboratorRole)
                      }
                      className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                    >
                      <option value="viewer">View</option>
                      <option value="editor">Edit</option>
                    </select>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(collaborator.id)}
                    disabled={removingId === collaborator.id}
                    aria-label="Remove collaborator"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    {removingId === collaborator.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            Friends can only be found by their public profile name. Email addresses are never
            exposed through this search.
          </p>
        </div>
      )}
    </div>
  );
}
