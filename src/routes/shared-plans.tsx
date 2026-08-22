/* eslint-disable @typescript-eslint/no-explicit-any -- collaboration RPCs are not in the generated Supabase type file yet. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, ExternalLink, Loader2, Users, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/shared-plans")({
  head: () => ({
    meta: [
      { title: "Shared Plans — ErbilGo" },
      {
        name: "description",
        content: "Manage your ErbilGo itinerary invitations and collaborative plans.",
      },
    ],
  }),
  component: SharedPlansPage,
});

type Invitation = {
  id: string;
  itinerary_id: string;
  role: "viewer" | "editor";
  status: "pending" | "accepted" | "declined";
  created_at: string;
  accepted_at: string | null;
  plan_title: string;
  plan_summary: string | null;
  owner_id: string;
  owner_name: string;
};

const db = supabase as any;

function SharedPlansPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invitationsQuery = useQuery({
    queryKey: ["my-itinerary-invitations", session?.user?.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await db.rpc("list_my_itinerary_invitations");
      if (error) throw error;
      return (data ?? []) as Invitation[];
    },
  });

  async function respond(invitation: Invitation, accept: boolean) {
    try {
      const { error } = await db.rpc("respond_to_itinerary_invitation", {
        p_collaborator_id: invitation.id,
        p_accept: accept,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["my-itinerary-invitations", session?.user?.id],
      });
      toast.success(accept ? "You joined the shared plan." : "Invitation declined.");
      if (accept) navigate({ to: "/shared-plan/$id", params: { id: invitation.itinerary_id } });
    } catch (error: any) {
      toast.error(error?.message || "Could not update the invitation.");
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-5 font-display text-4xl font-bold">Shared plans</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Sign in to see the ErbilGo plans your friends invited you to join.
          </p>
          <Button asChild className="mt-6 bg-gold text-background hover:bg-gold/90">
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const invitations = invitationsQuery.data ?? [];
  const pending = invitations.filter((item) => item.status === "pending");
  const joined = invitations.filter((item) => item.status === "accepted");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 lg:px-8 lg:py-16">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
            <Users className="h-4 w-4" /> Shared plans
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Plan the day together.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Accept invitations from friends, open plans you have joined, and decide who can help
            shape the itinerary.
          </p>
        </div>

        {invitationsQuery.isLoading && (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invitations…
          </div>
        )}
        {invitationsQuery.isError && (
          <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            We could not load your shared plans. Please refresh and try again.
          </div>
        )}

        {!invitationsQuery.isLoading && !invitationsQuery.isError && (
          <div className="mt-10 space-y-10">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-gold" />
                <h2 className="font-display text-2xl font-bold">Waiting for your answer</h2>
                <Badge variant="outline" className="ml-1">
                  {pending.length}
                </Badge>
              </div>
              {pending.length === 0 ? (
                <Empty text="No pending invitations right now." />
              ) : (
                <div className="space-y-3">
                  {pending.map((invitation) => (
                    <article
                      key={invitation.id}
                      className="rounded-2xl border border-gold/20 bg-card/35 p-5"
                    >
                      <p className="text-xs text-muted-foreground">
                        {invitation.owner_name} invited you to collaborate
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-bold">
                        {invitation.plan_title}
                      </h3>
                      {invitation.plan_summary && (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {invitation.plan_summary}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Badge className="bg-gold text-background">
                          Can {invitation.role === "editor" ? "edit" : "view"}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => respond(invitation, true)}
                          className="bg-gold text-background hover:bg-gold/90"
                        >
                          <Check className="mr-1.5 h-4 w-4" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respond(invitation, false)}
                        >
                          <X className="mr-1.5 h-4 w-4" /> Decline
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <h2 className="font-display text-2xl font-bold">Plans you joined</h2>
                <Badge variant="outline" className="ml-1">
                  {joined.length}
                </Badge>
              </div>
              {joined.length === 0 ? (
                <Empty text="Accepted plans will appear here." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {joined.map((invitation) => (
                    <article
                      key={invitation.id}
                      className="rounded-2xl border border-border/70 bg-card/35 p-5"
                    >
                      <p className="text-xs text-muted-foreground">
                        Owned by {invitation.owner_name}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-bold">
                        {invitation.plan_title}
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Your permission:{" "}
                        <span className="font-semibold capitalize text-foreground">
                          {invitation.role}
                        </span>
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-4">
                        <Link to="/shared-plan/$id" params={{ id: invitation.itinerary_id }}>
                          Open plan <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/25 p-5 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
