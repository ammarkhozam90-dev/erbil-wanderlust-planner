-- Function to delete user account securely
-- This needs to be SECURITY DEFINER to bypass RLS and delete from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := auth.uid();
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- The deletion from public.profiles and other tables will happen via ON DELETE CASCADE 
  -- if the foreign keys are set up correctly.
  -- But we must delete from auth.users to completely remove the account.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
