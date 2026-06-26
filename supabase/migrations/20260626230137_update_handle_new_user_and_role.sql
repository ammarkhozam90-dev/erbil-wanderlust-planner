-- Update the handle_new_user_and_role function to store all user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_and_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create profile with all available metadata
  INSERT INTO public.profiles (id, full_name, email, phone, age_range, gender, nationality)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'age_range',
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'nationality'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
