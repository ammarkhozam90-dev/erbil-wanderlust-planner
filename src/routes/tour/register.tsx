import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/tour/register')({
  head: () => ({ meta: [{ title: 'Tour Organizer — Register | ErbilGo' }] }),
  component: Register,
});

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/tour/dashboard`,
        data: { is_tour_organizer: 'true', company_name: companyName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Account created. Check email to confirm.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Register as a Tour Organizer</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Company / Agency name</Label>
              <Input required value={companyName} onChange={(e)=>setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" minLength={6} required value={password} onChange={(e)=>setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </Button>
            <div className="text-center text-sm">
              <Link to="/tour/login" className="text-primary hover:underline">Already registered? Sign in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
