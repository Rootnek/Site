import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

function isConfigured(value) {
  try {
    if (value === null || value === undefined) return false;
    const normalized = String(value).trim();
    return normalized.length > 0 && !normalized.startsWith("YOUR_");
  } catch {
    return false;
  }
}

function getLocalWishes() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem("wedding-wishes");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalWishes(wishes) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem("wedding-wishes", JSON.stringify(wishes));
  } catch {
    // ignore local storage errors
  }
}

function buildSupabaseRestUrl(path) {
  if (!isConfigured(SUPABASE_URL)) return "";
  const base = SUPABASE_URL.trim().replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function parseJsonSafely(response) {
  const raw = await response.text();

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(raw.slice(0, 180) || "Сервер вернул невалидный ответ");
  }
}

export default function WeddingInvitationLanding() {
  const canUseSupabase = isConfigured(SUPABASE_URL) && isConfigured(SUPABASE_KEY);
  const [form, setForm] = useState({ name: "", attendance: "", note: "" });
  const [openDay, setOpenDay] = useState(0);
  const [slide, setSlide] = useState(0);
  const [wishes, setWishes] = useState([]);
  const [wishInput, setWishInput] = useState("");
  const [wishName, setWishName] = useState("");
  const [loadingWishes, setLoadingWishes] = useState(false);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [submittingWish, setSubmittingWish] = useState(false);
  const [showFab, setShowFab] = useState(true);
  const rsvpRef = useRef(null);

  const images = [
    "/images/photo1.jpg",
    "/images/photo2.jpg",
    "/images/photo3.jpg",
    "/images/photo4.jpg",
    "/images/photo5.jpg",
    "/images/photo6.jpg",
    "/images/photo7.jpg",
    "/images/photo8.jpg",
  ];

  const content = {
    editorial: {
      kicker: "Save the date",
      lines: ["Совсем скоро", "начнётся новая глава —", "Мы женимся!"],
      ceremonyDate: "06 · 06 · 2026",
      ceremonyTime: "12:00",
      ceremonyTitle: "Церемония бракосочетания",
      ceremonyPlace: "Москва, ул. Бутырская, д. 17",
      ceremonyNotes: ["intimate moment", "в кругу самых близких"],
      banquetDate: "07 · 06 · 2026",
      banquetTime: "15:00",
      banquetTitle: "Торжественный банкет",
      banquetLines: [
        "вечер света, музыки и движения",
        "время быть рядом",
        "и праздновать вместе",
      ],
      dressCodeTitle: "Dress code",
      dressCodeAccent: "элегантность · минимализм",
      dressCodeNote: "просим избегать:",
      dressCodeColors: "красного / белого",
      detailsTitle: "Details",
      detailsLine1: "не дарите нам цветы, они завянут и не оставят воспоминаний",
      detailsLine2: "лучшей заменой им будут",
      detailsAccent: "ваш любимый напиток или книга",
      detailsExtraLines: [
        "мы очень любим сюрпризы,",
        "но если вы хотите нас чем-то удивить,",
        "и у вас возникают сомнения,",
        "пожалуйста, посоветуйтесь с нами",
      ],
      detailsExtraAccent:
        "нам будет спокойнее, если в этот день всё будет проходить под нашим контролем",
      footer: "we will be happy to see you",
    },
    couple: "Никита & Валерия",
    tagline: "Save the date",
    intro: "Приглашаем вас разделить с нами наше торжество",
    schedule: [
      {
        day: "06.06.2026",
        label: "Day 1",
        title: "Роспись и фотосессия",
        time: "12:00",
        place: "г. Москва, ул. Бутырская, д. 17 (Дворец бракосочетания № 4)",
        program: [
          "Прибытие гостей — 11:30",
          "Торжественная церемония — 12:00–12:30",
          "Фотосессия — 12:30–15:30",
        ],
      },
      {
        day: "07.06.2026",
        label: "Day 2",
        title: "Свадебный банкет",
        time: "15:00",
        place:
          "г. Химки, квартал Старбеево, ул. Свердлова, д. 20/3 (North Star hotel)",
        program: [
          "Сбор гостей и welcome drink — 15:00",
          "Начало банкета — 16:00",
          "Поздравления, ужин и тёплые встречи — в течение всего вечера",
          "Танцы, конкурсы и другие приятные активности — в течение всего вечера",
          "Завершение мероприятия — 22:00–23:00",
        ],
      },
    ],
  };

  const accent = "#c40018";
  const accentDark = "#8f0012";
  const accentGlow = "rgba(196, 0, 24, 0.12)";

  const fontStyles = useMemo(
    () => ({
      body: { fontFamily: 'Inter, system-ui, sans-serif' },
      heading: { fontFamily: '"Cormorant Garamond", serif' },
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const loadWishes = async () => {
      if (!canUseSupabase) {
        if (!cancelled) {
          setWishes(getLocalWishes());
        }
        return;
      }

      setLoadingWishes(true);

      try {
        const endpoint = buildSupabaseRestUrl("/rest/v1/wishes?select=*&order=created_at.desc");
        const res = await fetch(endpoint, {
          headers: {
            apikey: SUPABASE_KEY.trim(),
            Authorization: `Bearer ${SUPABASE_KEY.trim()}`,
          },
        });

        const data = await parseJsonSafely(res);

        if (!res.ok) {
          throw new Error(data?.message || data?.error || "Не удалось загрузить пожелания");
        }

        if (!cancelled) {
          setWishes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load wishes:", error);
        if (!cancelled) {
          setWishes([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingWishes(false);
        }
      }
    };

    loadWishes();

    return () => {
      cancelled = true;
    };
  }, [canUseSupabase]);

  useEffect(() => {
    const el = document.getElementById("rsvp");
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFab(!entry.isIntersecting);
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Пожалуйста, укажите имя");
      return;
    }

    setSubmittingRsvp(true);

    try {
      const res = await fetch("/api/send-rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          attendance: form.attendance,
          note: form.note,
        }),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data?.error || "Не удалось отправить сообщение");
      }

      alert("Спасибо! Мы получили ваш ответ 💌");
      setForm({ name: "", attendance: "", note: "" });
    } catch (error) {
      console.error("Failed to submit RSVP:", error);
      alert(`Ошибка отправки: ${error.message}`);
    } finally {
      setSubmittingRsvp(false);
    }
  };

  const handleWishSubmit = async () => {
    if (!wishInput.trim()) {
      alert("Пожалуйста, напишите пожелание");
      return;
    }

    const fallbackWish = {
      id: Date.now(),
      text: wishInput.trim(),
      name: wishName.trim() || null,
      created_at: new Date().toISOString(),
    };

    if (!canUseSupabase) {
      const nextWishes = [fallbackWish, ...wishes];
      setWishes(nextWishes);
      saveLocalWishes(nextWishes);
      setWishInput("");
      setWishName("");
      return;
    }

    setSubmittingWish(true);

    try {
      const endpoint = buildSupabaseRestUrl("/rest/v1/wishes");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY.trim(),
          Authorization: `Bearer ${SUPABASE_KEY.trim()}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          text: wishInput.trim(),
          name: wishName.trim() || null,
          created_at: new Date().toISOString(),
        }),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Не удалось сохранить пожелание");
      }

      if (!Array.isArray(data) || !data[0]) {
        throw new Error("Сервер не вернул сохранённое пожелание");
      }

      setWishes((prev) => {
        const nextWishes = [data[0], ...prev];
        saveLocalWishes(nextWishes);
        return nextWishes;
      });
      setWishInput("");
      setWishName("");
    } catch (error) {
      console.error("Failed to save wish:", error);
      console.warn("Saving locally because remote save failed");
      const nextWishes = [fallbackWish, ...wishes];
      setWishes(nextWishes);
      saveLocalWishes(nextWishes);
      setWishInput("");
      setWishName("");
    } finally {
      setSubmittingWish(false);
    }
  };

  const next = () => setSlide((prev) => (prev + 1) % images.length);
  const prev = () => setSlide((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={fontStyles.body}>
      <section
        className="relative flex min-h-screen flex-col justify-end overflow-hidden pb-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.9)), url('https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="pointer-events-none absolute -left-16 top-16 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: accentGlow }}
        />
        <div
          className="pointer-events-none absolute -right-20 top-1/3 h-64 w-64 rounded-full blur-3xl"
          style={{ backgroundColor: accentGlow }}
        />

        <div className="relative flex h-[80vh] items-center justify-center overflow-visible">
          <motion.div
            className="absolute inset-0 z-40"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) next();
              if (info.offset.x > 60) prev();
            }}
          />

          <AnimatePresence initial={false}>
            {images.map((img, index) => {
              const position = (index - slide + images.length) % images.length;

              if (position > 1 && position < images.length - 1) return null;

              let x = 0;
              let y = 0;
              let rotate = 0;
              let scale = 0.85;
              let opacity = 0.4;
              let zIndex = 10;

              if (position === 0) {
                scale = 1;
                opacity = 1;
                zIndex = 30;
                y = -6;
                rotate = -1.5;
              } else if (position === 1) {
                x = 180;
                y = 18;
                rotate = 9;
              } else if (position === images.length - 1) {
                x = -180;
                y = 14;
                rotate = -10;
              }

              return (
                <motion.div
                  key={`${img}-${position}`}
                  className="absolute"
                  initial={{ opacity: 0, scale: 0.8, rotate: rotate * 2, y: 24 }}
                  animate={{ x, y, rotate, scale, opacity }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ zIndex }}
                >
                  <div
                    style={{
                      padding: "10px 10px 24px 10px",
                      borderRadius: "10px",
                      background: "#fff",
                      boxShadow:
                        "0 20px 60px rgba(0,0,0,0.22), 0 6px 18px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "4px",
                      }}
                    >
                      <img
                        src={img}
                        alt={`Фото ${index + 1}`}
                        className="block h-[50vh] w-[52vw] max-w-[390px] object-cover"
                      />

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "url('https://www.transparenttextures.com/patterns/paper-fibers.png')",
                          opacity: 0.25,
                          mixBlendMode: "multiply",
                        }}
                      />

                      {position === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(135deg, rgba(255,255,255,0.14), transparent 30%)",
                          }}
                        />
                      )}

                      {position !== 0 && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.45))",
                          }}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={prev}
            className="border px-4 py-2"
            style={{ borderColor: accent, color: accent }}
            aria-label="Предыдущее фото"
            type="button"
          >
            ←
          </button>
          <button
            onClick={next}
            className="border px-4 py-2"
            style={{ borderColor: accent, color: accent }}
            aria-label="Следующее фото"
            type="button"
          >
            →
          </button>
        </div>

        <div className="mt-6 px-5">
          <div className="mx-auto w-full max-w-2xl border border-white/70 bg-white/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.14)] backdrop-blur-md">
            <p
              className="uppercase tracking-[0.4em] text-neutral-500"
              style={{ fontSize: "clamp(10px, 2vw, 12px)" }}
            >
              {content.tagline}
            </p>

            <h1
              className="mt-5 font-medium leading-[0.9] text-neutral-900 whitespace-nowrap"
              style={{ ...fontStyles.heading, fontSize: "clamp(30px, 5.2vw, 58px)" }}
            >
              {content.couple}
            </h1>

            <p
              className="mt-5 leading-6 text-neutral-600"
              style={{ fontSize: "clamp(14px, 3.5vw, 16px)" }}
            >
              {content.intro}
            </p>
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden px-5 py-16"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at center, rgba(255,255,255,0) 55%, rgba(0,0,0,0.08) 100%),
            linear-gradient(rgba(255,250,250,0.92), rgba(255,250,250,0.95)),
            url('https://www.transparenttextures.com/patterns/cream-paper.png'),
            url('https://www.transparenttextures.com/patterns/asfalt-light.png')
          `,
          backgroundBlendMode: "multiply",
          backgroundSize: "auto",
        }}
      >
        <div
          className="pointer-events-none absolute -left-12 top-10 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: accentGlow }}
        />
        <div
          className="pointer-events-none absolute -right-12 bottom-10 h-44 w-44 rounded-full blur-3xl"
          style={{ backgroundColor: accentGlow }}
        />

        <div className="relative mx-auto max-w-md overflow-hidden border border-[#f1d9dc] bg-[#fffafa] p-6 shadow-[0_16px_50px_rgba(196,0,24,0.08)]">
          <p
            className="text-center uppercase tracking-[0.38em]"
            style={{ color: accent, fontSize: "clamp(11px, 2.4vw, 12px)" }}
          >
            {content.editorial.kicker}
          </p>

          <div className="mt-6 text-center">
            <p
              className="leading-tight text-neutral-900"
              style={{ ...fontStyles.heading, fontSize: "clamp(28px, 8vw, 44px)" }}
            >
              {content.editorial.lines[0]}
            </p>
            <p
              className="mt-1 leading-tight text-neutral-900"
              style={{ ...fontStyles.heading, fontSize: "clamp(28px, 8vw, 44px)" }}
            >
              {content.editorial.lines[1]}
            </p>
            <p
              className="mt-2 font-semibold leading-tight"
              style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(34px, 10vw, 54px)" }}
            >
              {content.editorial.lines[2]}
            </p>
          </div>

          <div className="mt-10 space-y-8 text-center">
            <div
              className="mx-auto h-px w-16"
              style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
            />

            <div className="relative">
              <div
                className="mx-auto mb-6 h-px w-20"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
              <p style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(24px, 7vw, 34px)" }}>
                {content.editorial.ceremonyDate}
              </p>
              <p
                className="mt-2"
                style={{
                  ...fontStyles.heading,
                  color: accent,
                  fontSize: "clamp(26px, 8vw, 38px)",
                  letterSpacing: "0.08em",
                }}
              >
                {content.editorial.ceremonyTime}
              </p>
              <p
                className="mt-3 uppercase text-neutral-900"
                style={{ ...fontStyles.heading, fontSize: "clamp(22px, 6vw, 30px)" }}
              >
                {content.editorial.ceremonyTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {content.editorial.ceremonyPlace}
              </p>
              <div className="mt-3 space-y-1 text-sm italic text-neutral-500">
                {content.editorial.ceremonyNotes.map((note, index) => (
                  <p key={index}>{note}</p>
                ))}
              </div>
            </div>

            <div className="border-t border-[#f1d9dc] pt-8">
              <div
                className="mx-auto mb-6 h-px w-20"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
              <p style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(24px, 7vw, 34px)" }}>
                {content.editorial.banquetDate}
              </p>
              <p
                className="mt-2"
                style={{
                  ...fontStyles.heading,
                  color: accent,
                  fontSize: "clamp(26px, 8vw, 38px)",
                  letterSpacing: "0.08em",
                }}
              >
                {content.editorial.banquetTime}
              </p>
              <p
                className="mt-3 uppercase text-neutral-900"
                style={{ ...fontStyles.heading, fontSize: "clamp(22px, 6vw, 30px)" }}
              >
                {content.editorial.banquetTitle}
              </p>
              <div className="mt-3 space-y-1 text-sm leading-6 text-neutral-600">
                {content.editorial.banquetLines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            <div className="border-t border-[#f1d9dc] pt-8">
              <div
                className="mx-auto mb-6 h-px w-20"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
              <p
                className="uppercase text-neutral-900"
                style={{ ...fontStyles.heading, fontSize: "clamp(22px, 6vw, 30px)" }}
              >
                {content.editorial.dressCodeTitle}
              </p>
              <p className="mt-3 text-sm uppercase tracking-[0.24em] text-neutral-600">
                {content.editorial.dressCodeAccent}
              </p>
              <p className="mt-4 text-sm text-neutral-600">{content.editorial.dressCodeNote}</p>
              <p
                className="mt-2"
                style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(28px, 8vw, 40px)" }}
              >
                {content.editorial.dressCodeColors}
              </p>
            </div>

            <div className="border-t border-[#f1d9dc] pt-8">
              <div
                className="mx-auto mb-6 h-px w-20"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
              <p
                className="uppercase text-neutral-900"
                style={{ ...fontStyles.heading, fontSize: "clamp(22px, 6vw, 30px)" }}
              >
                {content.editorial.detailsTitle}
              </p>
              <p className="mt-4 text-sm text-neutral-600">{content.editorial.detailsLine1}</p>
              <p className="mt-3 text-sm text-neutral-600">{content.editorial.detailsLine2}</p>
              <p
                className="mt-2"
                style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(28px, 8vw, 40px)" }}
              >
                {content.editorial.detailsAccent}
              </p>

              <div className="mx-auto mt-6 max-w-[17rem] space-y-1 border-t border-[#f1d9dc] pt-6 text-center">
                {content.editorial.detailsExtraLines.map((line, index) => (
                  <p key={index} className="text-sm leading-6 text-neutral-600">
                    {line}
                  </p>
                ))}
                <p
                  className="pt-2 leading-tight"
                  style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(24px, 7vw, 34px)" }}
                >
                  {content.editorial.detailsExtraAccent}
                </p>
              </div>
            </div>

            <div className="border-t border-[#f1d9dc] pt-8 text-center">
              <div
                className="mx-auto mb-6 h-px w-20"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
              <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">
                {content.editorial.footer}
              </p>
              <p
                className="mt-4 text-neutral-900"
                style={{ ...fontStyles.heading, fontSize: "clamp(30px, 9vw, 46px)" }}
              >
                {content.couple}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.94)), url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <section id="schedule" className="px-5 py-14">
          <div className="mx-auto max-w-md">
            <h2
              className="uppercase tracking-wide"
              style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(24px, 6vw, 34px)" }}
            >
              Свадебные дни
            </h2>

            <div className="mt-6 space-y-3">
              {content.schedule.map((item, index) => {
                const isOpen = openDay === index;

                return (
                  <button
                    key={index}
                    onClick={() => setOpenDay(isOpen ? -1 : index)}
                    className="w-full bg-white p-5 text-left shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-[#f2e5e6]"
                    type="button"
                  >
                    <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400">{item.label}</p>
                    <h3
                      className="mt-2 uppercase"
                      style={{ ...fontStyles.heading, color: accent, fontSize: "clamp(18px, 5vw, 22px)" }}
                    >
                      {item.title}
                    </h3>
                    <p style={{ fontSize: "clamp(13px, 3.5vw, 15px)" }} className="mt-2 text-neutral-700">
                      {item.time}
                    </p>
                    <p style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }} className="text-neutral-500">
                      {item.place}
                    </p>

                    {isOpen && (
                      <div className="mt-4 border-t pt-4">
                        {item.program.map((step, stepIndex) => (
                          <p
                            key={stepIndex}
                            style={{ fontSize: "clamp(13px, 3.5vw, 15px)" }}
                            className="mt-2 text-neutral-600"
                          >
                            {stepIndex + 1}. {step}
                          </p>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section id="rsvp" className="px-5 pb-24">
          <div
            className="mx-auto max-w-md overflow-hidden border border-[#d94a5d] p-6 text-white shadow-[0_20px_50px_rgba(196,0,24,0.2)]"
            style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accentDark} 100%)` }}
          >
            <h2
              style={{ ...fontStyles.heading, fontSize: "clamp(24px, 6vw, 32px)" }}
              className="uppercase"
            >
              Обратная связь
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ваше имя"
                className="w-full p-3 text-black"
              />
              <input
                name="attendance"
                value={form.attendance}
                onChange={handleChange}
                placeholder="Придёте ли вы?"
                className="w-full p-3 text-black"
              />

              <div className="mt-2">
                <p className="mb-2 text-sm uppercase tracking-wider">Важная информация</p>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="Если у вас есть какие-то важные уточнения по поводу меню или другая важная информация, сообщите нам"
                  className="min-h-[100px] w-full p-3 text-black"
                />
              </div>

              <button
                className="w-full p-3 text-sm uppercase"
                style={{ backgroundColor: "#ffffff", color: accent }}
                disabled={submittingRsvp}
                type="submit"
              >
                {submittingRsvp ? "Отправляем..." : "Отправить"}
              </button>
            </form>
          </div>
        </section>

        <section className="px-5 py-16">
          <div className="mx-auto max-w-md">
            <h2 className="mb-4 text-center text-2xl" style={{ ...fontStyles.heading, color: accent }}>
              Ваши пожелания для нас
            </h2>

            <p className="mb-6 text-center text-sm text-neutral-500 leading-6">
              Можете написать свое поздравление в любое удобное для вас время. Во время банкета наш ведущий также даст вам время для этого
            </p>

            <input
              value={wishName}
              onChange={(event) => setWishName(event.target.value)}
              placeholder="Ваше имя"
              className="mb-2 w-full border p-3"
            />

            <textarea
              value={wishInput}
              onChange={(event) => setWishInput(event.target.value)}
              placeholder="Ваше пожелание для нас"
              className="w-full border p-3"
            />

            <button
              className="mt-3 w-full p-3"
              style={{ background: accent, color: "white" }}
              onClick={handleWishSubmit}
              disabled={submittingWish}
              type="button"
            >
              {submittingWish ? "Сохраняем..." : "Отправить пожелание"}
            </button>

            <div className="mt-8 space-y-4">
              {loadingWishes ? (
                <p>Загрузка...</p>
              ) : wishes.length === 0 ? (
                <p className="text-sm text-neutral-500">Здесь появятся пожелания гостей после праздника.</p>
              ) : (
                wishes.map((wish, index) => (
                  <motion.div
                    key={wish.id ?? index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.08)] rotate-[-1deg]"
                  >
                    <div className="min-h-[120px] border border-[#f1e7e7] bg-[#fffdfc] p-4">
                      <p className="text-sm leading-6 text-neutral-700">{wish.text}</p>
                    </div>
                    <div className="pt-4 pb-2 text-center">
                      {wish.name ? (
                        <p
                          className="text-sm text-neutral-500"
                          style={{ ...fontStyles.heading, fontSize: "clamp(18px, 4vw, 22px)" }}
                        >
                          — {wish.name}
                        </p>
                      ) : (
                        <p
                          className="text-sm text-neutral-400"
                          style={{ ...fontStyles.heading, fontSize: "clamp(18px, 4vw, 22px)" }}
                        >
                          with love
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showFab && (
          <motion.a
            href="#rsvp"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: [0, -2, 0], scale: [1, 1.02, 1], boxShadow: ["0 10px 25px rgba(0,0,0,0.18)", "0 14px 30px rgba(0,0,0,0.22)", "0 10px 25px rgba(0,0,0,0.18)"] }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-xs sm:text-sm uppercase tracking-wide text-white shadow-lg whitespace-nowrap"
            style={{ backgroundColor: accent }}
          >
            Обратная связь
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
