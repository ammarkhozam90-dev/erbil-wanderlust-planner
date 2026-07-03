import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/tour/reset-password')({ component: Reset });

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Password updated.');
    nav({ to: '/tour/dashboard' });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Set a new password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" minLength={6} required value={pw} onChange={(e)=>setPw(e.target.value)} />
            </div>
            <Button className="w-full" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
