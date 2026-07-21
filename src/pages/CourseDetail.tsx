import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { GraduationCap, PlayCircle, CheckCircle2, Award, Edit, Lock, Clock } from "lucide-react";

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [certificate, setCertificate] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const load = async () => {
    if (!courseId) return;
    const { data: c } = await supabase.from("courses").select("*, profiles!courses_instructor_id_fkey(full_name, avatar_url)").eq("id", courseId).single();
    setCourse(c);
    const { data: mods } = await supabase.from("course_modules").select("*, lessons(*)").eq("course_id", courseId).order("position");
    setModules((mods || []).map((m: any) => ({ ...m, lessons: (m.lessons || []).sort((a: any, b: any) => a.position - b.position) })));
    const { data: qzs } = await supabase.from("quizzes").select("*").eq("course_id", courseId);
    setQuizzes(qzs || []);
    if (user) {
      const { data: e } = await supabase.from("enrollments").select("*").eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
      setEnrollment(e);
      if (e) {
        const { data: lp } = await supabase.from("lesson_progress").select("lesson_id").eq("enrollment_id", e.id);
        setProgress(new Set((lp || []).map((x: any) => x.lesson_id)));
      }
      const { data: cert } = await supabase.from("certificates").select("*").eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
      setCertificate(cert);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId, user]);

  const enroll = async () => {
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("enrollments").insert({ course_id: courseId, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Inscription réussie");
    load();
  };

  const markComplete = async (lessonId: string) => {
    if (!enrollment || !user) return;
    if (progress.has(lessonId)) return;
    const { error } = await supabase.from("lesson_progress").insert({ enrollment_id: enrollment.id, lesson_id: lessonId, user_id: user.id });
    if (error) return toast.error(error.message);
    setProgress(new Set([...progress, lessonId]));
    setTimeout(load, 500);
  };

  const openQuiz = async (q: any) => {
    setActiveQuiz(q);
    setAnswers({});
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", q.id).order("position");
    setQuizQuestions((data || []).map((x: any) => ({ ...x, options: Array.isArray(x.options) ? x.options : [] })));
  };

  const submitQuiz = async () => {
    if (!user || !activeQuiz) return;
    let score = 0, max = 0;
    for (const q of quizQuestions) {
      max += q.points;
      if (answers[q.id] === q.correct_index) score += q.points;
    }
    const percent = max === 0 ? 0 : Math.round((score / max) * 100);
    const passed = percent >= (activeQuiz.passing_score || 70);
    await supabase.from("quiz_attempts").insert({
      quiz_id: activeQuiz.id, user_id: user.id, score, max_score: max, passed,
      answers: quizQuestions.map((q) => ({ question_id: q.id, chosen: answers[q.id] })),
    });
    toast[passed ? "success" : "error"](`Score : ${percent}% — ${passed ? "Réussi" : "Non atteint"}`);
    setActiveQuiz(null);
    load();
  };

  if (!course) return <div className="min-h-screen"><Header /><main className="container py-10 text-center text-muted-foreground">Chargement...</main></div>;

  const isOwner = user?.id === course.instructor_id;
  const totalLessons = modules.reduce((n, m) => n + (m.lessons?.length || 0), 0);

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-screen-xl mx-auto grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="aspect-video bg-muted overflow-hidden rounded-t-lg">
                {course.cover_url ? (
                  <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-brand">
                    <GraduationCap className="h-16 w-16 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-2xl">{course.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Par {course.profiles?.full_name || "Instructeur"}</p>
                  </div>
                  {isOwner && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/learning/${course.id}/edit`}><Edit className="h-4 w-4 mr-1" />Modifier</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {course.category && <Badge variant="secondary">{course.category}</Badge>}
                  {course.level && <Badge variant="outline">{course.level}</Badge>}
                  {course.duration_minutes ? <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{course.duration_minutes} min</Badge> : null}
                </div>
                {course.description && <p className="whitespace-pre-wrap text-sm">{course.description}</p>}
                {course.learning_outcomes?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mt-4 mb-2">Ce que vous apprendrez</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1">{course.learning_outcomes.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {activeLesson && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{activeLesson.title}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setActiveLesson(null)}>Fermer</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeLesson.video_url && (
                    <div className="aspect-video bg-black rounded overflow-hidden">
                      {activeLesson.video_url.match(/youtube|youtu\.be|vimeo/) ? (
                        <iframe src={activeLesson.video_url.replace("watch?v=", "embed/")} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                      ) : (
                        <video src={activeLesson.video_url} controls className="w-full h-full" />
                      )}
                    </div>
                  )}
                  {activeLesson.content && <div className="prose prose-sm max-w-none whitespace-pre-wrap">{activeLesson.content}</div>}
                  {enrollment && !progress.has(activeLesson.id) && (
                    <Button onClick={() => markComplete(activeLesson.id)}><CheckCircle2 className="h-4 w-4 mr-2" />Marquer comme terminée</Button>
                  )}
                </CardContent>
              </Card>
            )}

            {activeQuiz && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{activeQuiz.title}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setActiveQuiz(null)}>Fermer</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quizQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-2">
                      <p className="font-medium">{i + 1}. {q.question}</p>
                      {q.options.map((op: string, oi: number) => (
                        <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers({ ...answers, [q.id]: oi })} />
                          {op}
                        </label>
                      ))}
                    </div>
                  ))}
                  <Button onClick={submitQuiz}>Soumettre</Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Programme du cours</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {modules.map((m, mi) => (
                    <AccordionItem key={m.id} value={m.id}>
                      <AccordionTrigger>Module {mi + 1} — {m.title}</AccordionTrigger>
                      <AccordionContent className="space-y-1">
                        {m.lessons.map((l: any) => {
                          const done = progress.has(l.id);
                          const canAccess = enrollment || l.is_preview || isOwner;
                          return (
                            <button
                              key={l.id}
                              onClick={() => canAccess ? setActiveLesson(l) : toast.info("Inscrivez-vous pour accéder à cette leçon")}
                              className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-muted text-left"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {done ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> :
                                  canAccess ? <PlayCircle className="h-4 w-4 text-muted-foreground shrink-0" /> :
                                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
                                <span className="truncate">{l.title}</span>
                                {l.is_preview && <Badge variant="outline" className="text-xs">Aperçu</Badge>}
                              </span>
                              {l.duration_minutes ? <span className="text-xs text-muted-foreground">{l.duration_minutes} min</span> : null}
                            </button>
                          );
                        })}
                        {m.lessons.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucune leçon.</p>}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {quizzes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Quiz</h4>
                    {quizzes.map((q) => (
                      <button key={q.id} onClick={() => enrollment || isOwner ? openQuiz(q) : toast.info("Inscrivez-vous pour passer le quiz")}
                        className="w-full flex items-center justify-between p-2 rounded hover:bg-muted">
                        <span className="flex items-center gap-2"><Award className="h-4 w-4" />{q.title}{q.is_final && <Badge>Final</Badge>}</span>
                        <span className="text-xs text-muted-foreground">Min. {q.passing_score}%</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="text-2xl font-bold">{course.price && course.price > 0 ? `${course.price} ${course.currency || "XOF"}` : "Gratuit"}</div>
                {enrollment ? (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span>Progression</span><span>{enrollment.progress || 0}%</span></div>
                      <Progress value={enrollment.progress || 0} />
                    </div>
                    <p className="text-xs text-muted-foreground">{progress.size} / {totalLessons} leçons terminées</p>
                  </>
                ) : (
                  <Button className="w-full" onClick={enroll}>S'inscrire au cours</Button>
                )}
                {certificate && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/certificate/${certificate.certificate_number}`}><Award className="h-4 w-4 mr-2" />Voir mon certificat</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default CourseDetail;