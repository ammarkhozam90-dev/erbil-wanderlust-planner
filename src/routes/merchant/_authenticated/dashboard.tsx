import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { useMerchantContext } from '@/components/merchant/merchant-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileEdit, 
  Search, 
  PlusCircle, 
  Sparkles, 
  MapPin, 
  ShieldCheck,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/merchant/_authenticated/dashboard')({
  component: Dashboard,
});

const statusMeta = {
  draft: { label: 'Draft', icon: FileEdit, color: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending Review', icon: Clock, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  approved: { label: 'Approved & Live', icon: CheckCircle2, color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  rejected: { label: 'Rejected', icon: AlertCircle, color: 'bg-destructive/10 text-destructive' },
} as const;

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: merchant, isLoading } = useMyMerchant(user?.id);
  const { createBusiness } = useMerchantContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  // Live search for unclaimed businesses
  const liveResults = useQuery({
    queryKey: ['live-unclaimed-search', searchQuery],
    enabled: searchQuery.trim().length >= 2,
    queryFn: async () => {
      const safe = searchQuery.trim().replace(/[%,]/g, ' ');
      const { data, error } = await supabase
        .from('merchants')
        .select('id, name, address, category, categories')
        .eq('claim_status', 'unclaimed')
        .eq('status', 'approved')
        .or(`name.ilike.%${safe}%,address.ilike.%${safe}%`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: '/merchant/claim', search: { q: searchQuery.trim() } as any });
    } else {
      navigate({ to: '/merchant/claim' });
    }
  };

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      await createBusiness('My New Business');
      toast.success('Draft listing created! Let\'s fill in the details.');
      navigate({ to: '/merchant/my-business' });
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create listing');
    } finally {
      setCreating(false);
    }
  };

  // --- Landing Page for Users with No Business ---
  if (!merchant) {
    return (
      <div className="mx-auto max-w-4xl space-y-12 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Grow Your Business with ErbilGo
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Put Your Business on Erbil's <span className="text-gold">Tourism Map</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Connect with thousands of travelers planning their trips to Erbil. Whether you own a restaurant, hotel, or a hidden gem, ErbilGo helps you reach the right audience.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Path 1: Claim Existing */}
          <Card className="relative overflow-visible border-2 transition-all hover:border-gold/50 shadow-luxury group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Search className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gold" />
                Find Your Business
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <p className="text-sm text-muted-foreground">
                We may have already added your business to help you get started. Search for it now to claim ownership.
              </p>
              <div className="relative">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input 
                    placeholder="Business name or phone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background"
                  />
                  <Button type="submit" size="icon" className="shrink-0 bg-gold text-background hover:bg-gold/90">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>

                {/* Live Results Dropdown */}
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-border bg-card p-2 shadow-xl">
                    {liveResults.isLoading ? (
                      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Searching...
                      </div>
                    ) : liveResults.data?.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No matches found. Try creating a new listing.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {liveResults.data?.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => navigate({ to: '/merchant/claim', search: { q: r.name } as any })}
                            className="flex w-full flex-col items-start rounded-md p-2 text-left hover:bg-accent transition-colors"
                          >
                            <span className="text-sm font-medium">{r.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate w-full">{r.address || 'Erbil'}</span>
                          </button>
                        ))}
                        <Link 
                          to="/merchant/claim" 
                          search={{ q: searchQuery } as any}
                          className="block border-t border-border pt-2 mt-1 text-center text-[10px] font-bold text-gold hover:underline"
                        >
                          View all results
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Path 2: Create New */}
          <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50 shadow-luxury group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <PlusCircle className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Create New Listing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Can't find your business in our directory? No problem. Create a brand new listing from scratch and reach your customers today.
              </p>
              <Button 
                onClick={handleCreateNew} 
                className="w-full" 
                variant="outline"
                disabled={creating}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Start New Listing <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="grid gap-8 md:grid-cols-3 pt-8">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold">Verified Status</h3>
            <p className="text-xs text-muted-foreground">Get a verified badge to build trust with travelers and tourists.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="rounded-full bg-gold/10 p-3">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>
            <h3 className="font-bold">Smart Promotion</h3>
            <p className="text-xs text-muted-foreground">Appear in thematic itineraries and AI-powered travel plans.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="rounded-full bg-green-500/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-bold">Easy Management</h3>
            <p className="text-xs text-muted-foreground">Update hours, photos, and menus in real-time from your portal.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Dashboard for Existing Merchants ---
  const status = merchant.status ?? 'draft';
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Listing status</span>
            <Badge className={meta.color}>
              <Icon className="mr-1 h-3 w-3" /> {meta.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'draft' && (
            <>
              <p className="text-sm text-muted-foreground">
                Complete your profile across the sidebar steps, then submit for review.
              </p>
              <Button asChild>
                <Link to="/merchant/my-business">Continue editing</Link>
              </Button>
            </>
          )}
          {status === 'pending' && (
            <p className="text-sm text-muted-foreground">
              Your submission is being reviewed. You'll be notified once a decision is made.
            </p>
          )}
          {status === 'approved' && (
            <p className="text-sm text-muted-foreground">
              Your listing is live. Editing key fields will re-trigger review.
            </p>
          )}
          {status === 'rejected' && (
            <>
              <p className="text-sm text-muted-foreground">Reason: {merchant.rejection_reason ?? '—'}</p>
              <Button asChild>
                <Link to="/merchant/my-business">Update & resubmit</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Business</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{merchant.name || '—'}</div>
            <div className="text-sm text-muted-foreground capitalize">{merchant.category}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Features</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{merchant.features?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">selected</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Mood tags</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{merchant.mood_tags?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">configured</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
