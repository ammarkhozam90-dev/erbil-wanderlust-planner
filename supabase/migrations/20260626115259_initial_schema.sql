-- Create app_role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'merchant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  preferred_lang TEXT NOT NULL DEFAULT 'English',
  age_range TEXT,
  gender TEXT,
  nationality TEXT,
  current_city TEXT,
  travel_companion TEXT,
  mobility_level TEXT,
  budget_preference TEXT,
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  travel_style_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create saved_places table
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_name)
);

-- Create itineraries table
CREATE TABLE public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create itinerary_items table
CREATE TABLE public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  place_id UUID REFERENCES public.saved_places(id) ON DELETE SET NULL,
  day_number INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  activity_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recommendation_profiles table (for AI recommendations)
CREATE TABLE public.recommendation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interests TEXT[] NOT NULL DEFAULT '{}',
  travel_style TEXT[] NOT NULL DEFAULT '{}',
  companion_type TEXT,
  budget TEXT,
  languages TEXT[] NOT NULL DEFAULT '{}',
  mobility TEXT,
  activity_preferences TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Functions and Triggers

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for itineraries table
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for recommendation_profiles table
CREATE TRIGGER update_recommendation_profiles_updated_at
  BEFORE UPDATE ON public.recommendation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to assign default 'user' role and create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_and_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger to call handle_new_user_and_role after auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_and_role();

-- RLS Policies

-- has_role function for RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User Roles RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Saved Places RLS
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saved places" ON public.saved_places FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved places" ON public.saved_places FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved places" ON public.saved_places FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved places" ON public.saved_places FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Itineraries RLS
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own itineraries" ON public.itineraries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own itineraries" ON public.itineraries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own itineraries" ON public.itineraries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own itineraries" ON public.itineraries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Itinerary Items RLS
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own itinerary items" ON public.itinerary_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.itineraries WHERE id = itinerary_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own itinerary items" ON public.itinerary_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.itineraries WHERE id = itinerary_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own itinerary items" ON public.itinerary_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.itineraries WHERE id = itinerary_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.itineraries WHERE id = itinerary_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own itinerary items" ON public.itinerary_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.itineraries WHERE id = itinerary_id AND user_id = auth.uid()));

-- Recommendation Profiles RLS
ALTER TABLE public.recommendation_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recommendation profile" ON public.recommendation_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendation profile" ON public.recommendation_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendation profile" ON public.recommendation_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage buckets and policies
-- No specific storage buckets were defined in the original schema, but the prompt mentions 'Storage buckets' and 'Storage policies'.
-- I will create a 'avatars' bucket for user profile pictures and define a policy for it.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- Seed admin role for existing user (if any)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'ammar.khozam90@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Grant permissions to authenticated users for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;
GRANT ALL ON public.saved_places TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itineraries TO authenticated;
GRANT ALL ON public.itineraries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_items TO authenticated;
GRANT ALL ON public.itinerary_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_profiles TO authenticated;
GRANT ALL ON public.recommendation_profiles TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user_and_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
