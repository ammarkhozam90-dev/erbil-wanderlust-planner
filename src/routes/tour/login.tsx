import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/tour/login')({
  head: () => ({ meta: [{ title: 'Tour Organizer — Sign in | ErbilGo' }] }),
  component: TourLogin,
});

function TourLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Welcome back');
    navigate({ to: '/tour/dashboard' });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tour Organizer Portal</CardTitle>
          <CardDescription>Sign in to manage your tours</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e">Email</Label>
              <Input id="e" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Password</Label>
              <Input id="p" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <div className="flex justify-between text-sm">
              <Link to="/tour/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
              <Link to="/tour/register" className="text-primary hover:underline">Create account</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
