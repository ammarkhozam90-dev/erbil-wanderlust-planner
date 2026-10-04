-- Add new preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": false, "itinerary_updates": true}'::jsonb,
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

-- Ensure all metadata is handled in the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_and_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create profile with all available metadata
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    phone, 
    age_range, 
    gender, 
    nationality,
    preferred_currency,
    theme,
    notification_preferences
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'age_range',
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'nationality',
    COALESCE(NEW.raw_user_meta_data->>'preferred_currency', 'USD'),
    COALESCE(NEW.raw_user_meta_data->>'theme', 'light'),
    COALESCE(NEW.raw_user_meta_data->'notification_preferences', '{"email": true, "push": false, "itinerary_updates": true}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    age_range = EXCLUDED.age_range,
    gender = EXCLUDED.gender,
    nationality = EXCLUDED.nationality;

  RETURN NEW;
END;
$$;
