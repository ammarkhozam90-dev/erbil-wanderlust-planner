import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/tour/forgot-password')({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/tour/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Reset email sent.');
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Reset your password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <Button className="w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button>
            <div className="text-center text-sm">
              <Link to="/tour/login" className="text-primary hover:underline">Back to sign in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
