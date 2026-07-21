
-- COURSES
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  short_description TEXT,
  cover_url TEXT,
  category TEXT,
  level TEXT DEFAULT 'beginner',
  language TEXT DEFAULT 'fr',
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  duration_minutes INT DEFAULT 0,
  published BOOLEAN DEFAULT false,
  tags TEXT[],
  requirements TEXT[],
  learning_outcomes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View published or own courses" ON public.courses FOR SELECT TO authenticated USING (published = true OR instructor_id = auth.uid());
CREATE POLICY "Instructors manage own courses" ON public.courses FOR ALL TO authenticated USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());

CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View modules of visible courses" ON public.course_modules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.published = true OR c.instructor_id = auth.uid())));
CREATE POLICY "Instructors manage own modules" ON public.course_modules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()));

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  attachments TEXT[],
  duration_minutes INT DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View lessons of visible courses" ON public.lessons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.published = true OR c.instructor_id = auth.uid())));
CREATE POLICY "Instructors manage own lessons" ON public.lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()));

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INT NOT NULL DEFAULT 70,
  time_limit_minutes INT,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View quizzes of visible courses" ON public.quizzes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.published = true OR c.instructor_id = auth.uid())));
CREATE POLICY "Instructors manage own quizzes" ON public.quizzes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()));

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL DEFAULT 0,
  explanation TEXT,
  points INT NOT NULL DEFAULT 1,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View questions of visible quizzes" ON public.quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_id AND (c.published = true OR c.instructor_id = auth.uid())));
CREATE POLICY "Instructors manage own questions" ON public.quiz_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_id AND c.instructor_id = auth.uid()));

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own enrollments or as instructor" ON public.enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Users enroll themselves" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own enrollment" ON public.enrollments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own enrollment" ON public.enrollments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress select" ON public.lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own progress insert" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own progress delete" ON public.lesson_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or instructor attempts select" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Own attempts insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL DEFAULT ('ENVLE-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
GRANT SELECT ON public.certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certificates publicly verifiable" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Users insert own certificate" ON public.certificates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_reviews TO authenticated;
GRANT ALL ON public.course_reviews TO service_role;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read reviews" ON public.course_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own review" ON public.course_reviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_course_modules_updated BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_quizzes_updated BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_enrollments_updated BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_course_reviews_updated BEFORE UPDATE ON public.course_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recompute_enrollment_progress(_enrollment_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course_id UUID; v_user_id UUID; v_total INT; v_done INT; v_progress INT;
BEGIN
  SELECT course_id, user_id INTO v_course_id, v_user_id FROM public.enrollments WHERE id = _enrollment_id;
  IF v_course_id IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) INTO v_total FROM public.lessons WHERE course_id = v_course_id;
  SELECT COUNT(*) INTO v_done FROM public.lesson_progress WHERE enrollment_id = _enrollment_id;
  v_progress := CASE WHEN v_total = 0 THEN 0 ELSE LEAST(100, (v_done * 100) / v_total) END;
  UPDATE public.enrollments SET progress = v_progress, completed_at = CASE WHEN v_progress >= 100 THEN now() ELSE NULL END WHERE id = _enrollment_id;
  IF v_progress >= 100 THEN
    INSERT INTO public.certificates (course_id, user_id) VALUES (v_course_id, v_user_id) ON CONFLICT DO NOTHING;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_lesson_progress_recompute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_enrollment_progress(COALESCE(NEW.enrollment_id, OLD.enrollment_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_lesson_progress_ai AFTER INSERT OR DELETE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.trg_lesson_progress_recompute();

-- Storage policies for courses bucket
CREATE POLICY "Course files readable by auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'courses');
CREATE POLICY "Instructors upload courses" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'courses' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Instructors update own course files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'courses' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Instructors delete own course files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'courses' AND auth.uid()::text = (storage.foldername(name))[1]);
