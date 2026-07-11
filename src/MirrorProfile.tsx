import "./mirror-profile.css";
import { useMemo, useState } from "react";
import type { ManualProfile } from "./types";
import { useMirrorCamera } from "./useMirrorCamera";
import { useGestureControl } from "./useGestureControl";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { GestureHint } from "./GestureHint";
import { GestureReadBar } from "./GestureReadBar";

// Gesture-driven profile gate, over the live mirror reflection. Each step is
// either an option list (raise 1/2/3 to pick, dwell fills the choice) or the
// height step (speak it — a progress bar tracks listening — or tap +/-).
// 👍 advances, ✊ goes back; touch works throughout.

type Language = "en" | "zh" | "ja";

type OptionStep = {
  key: "gender" | "age" | "weight";
  kind: "option";
  title: string;
  options: { value: string; label: string }[];
};
type HeightStep = { key: "height"; kind: "height"; title: string };
type Step = OptionStep | HeightStep;

// UI copy only — the option values sent to the backend never change.
const COPY: Record<
  Language,
  {
    genderTitle: string;
    gender: [string, string, string]; // female / male / neutral
    ageTitle: string;
    heightTitle: string;
    weightTitle: string;
    weight: [string, string, string]; // slim / average / broad
    minus: string;
    plus: string;
    stop: string;
    speakHeight: string;
    confirm: string;
    back: string;
    next: string;
    start: string;
  }
> = {
  en: {
    genderTitle: "Your gender?",
    gender: ["Female", "Male", "Neutral"],
    ageTitle: "Age range?",
    heightTitle: "Height? Say it or tap +/−",
    weightTitle: "Body type?",
    weight: ["Slim", "Average", "Broad"],
    minus: "Decrease",
    plus: "Increase",
    stop: "Stop",
    speakHeight: "Say your height",
    confirm: "Confirm",
    back: "← Back",
    next: "Next →",
    start: "Start styling →"
  },
  zh: {
    genderTitle: "你的性别?",
    gender: ["女", "男", "中性"],
    ageTitle: "年龄段?",
    heightTitle: "身高?说出来或点 +/−",
    weightTitle: "体型?",
    weight: ["偏瘦", "标准", "偏壮"],
    minus: "减",
    plus: "加",
    stop: "停止",
    speakHeight: "说出身高",
    confirm: "确定",
    back: "← 返回",
    next: "下一步 →",
    start: "开始搭配 →"
  },
  ja: {
    genderTitle: "性別は?",
    gender: ["女性", "男性", "中性"],
    ageTitle: "年齢層は?",
    heightTitle: "身長は?声で言うか +/− をタップ",
    weightTitle: "体型は?",
    weight: ["細め", "標準", "がっしり"],
    minus: "減らす",
    plus: "増やす",
    stop: "停止",
    speakHeight: "身長を話す",
    confirm: "確定",
    back: "← 戻る",
    next: "次へ →",
    start: "スタイリング開始 →"
  }
};

const STT_LANG: Record<Language, string> = { en: "en-US", zh: "zh-CN", ja: "ja-JP" };

function buildSteps(c: (typeof COPY)[Language]): Step[] {
  return [
    {
      key: "gender",
      kind: "option",
      title: c.genderTitle,
      options: [
        { value: "female", label: c.gender[0] },
        { value: "male", label: c.gender[1] },
        { value: "neutral", label: c.gender[2] }
      ]
    },
    {
      key: "age",
      kind: "option",
      title: c.ageTitle,
      options: [
        { value: "18-25", label: "18–25" },
        { value: "26-35", label: "26–35" },
        { value: "36-45", label: "36–45" }
      ]
    },
    { key: "height", kind: "height", title: c.heightTitle },
    {
      key: "weight",
      kind: "option",
      title: c.weightTitle,
      options: [
        { value: "55", label: c.weight[0] },
        { value: "65", label: c.weight[1] },
        { value: "78", label: c.weight[2] }
      ]
    }
  ];
}

export function MirrorProfile({
  onDone,
  onBack,
  language
}: {
  onDone: (profile: ManualProfile) => void;
  onBack: () => void;
  language: Language;
}) {
  const c = COPY[language];
  const steps = useMemo(() => buildSteps(c), [c]);
  const [stepIndex, setStepIndex] = useState(0);
  const [gender, setGender] = useState<ManualProfile["gender_presentation"]>("neutral");
  const [ageRange, setAgeRange] = useState<ManualProfile["age_range"]>("26-35");
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);

  const step = steps[stepIndex];
  const mirror = useMirrorCamera(true);

  function commit() {
    onDone({ height_cm: height, weight_kg: weight, gender_presentation: gender, age_range: ageRange });
  }

  function next() {
    if (stepIndex >= steps.length - 1) commit();
    else setStepIndex((s) => s + 1);
  }
  function back() {
    if (stepIndex === 0) onBack();
    else setStepIndex((s) => s - 1);
  }

  function pick(index: number) {
    if (step.kind !== "option") return;
    const opt = step.options[index];
    if (!opt) return;
    if (step.key === "gender") setGender(opt.value as ManualProfile["gender_presentation"]);
    else if (step.key === "age") setAgeRange(opt.value as ManualProfile["age_range"]);
    else if (step.key === "weight") setWeight(Number(opt.value));
  }

  // Height by voice: pull a plausible cm value out of the transcript.
  const stt = useSpeechRecognition({
    lang: STT_LANG[language],
    continuous: true,
    onFinal: (text) => {
      const digits = text.replace(/[^\d]/g, "");
      const n = Number(digits);
      if (n >= 100 && n <= 230) setHeight(n);
      else if (n >= 10 && n <= 23) setHeight(n * 10); // "175" heard as "17.5" etc.
    }
  });

  const choiceCount = step.kind === "option" ? step.options.length : 0;
  const gesture = useGestureControl({
    videoRef: mirror.videoRef,
    enabled: mirror.state === "live",
    choiceCount,
    onSelect: pick,
    onGesture: (action) => {
      if (action === "confirm" || action === "proceed") next();
      else if (action === "back") back();
      else if (action === "talk" && step.kind === "height") toggleHeightVoice();
    }
  });

  function toggleHeightVoice() {
    if (stt.listening) stt.stop();
    else stt.start();
  }

  const currentOptionValue = useMemo(() => {
    if (step.kind !== "option") return null;
    if (step.key === "gender") return gender;
    if (step.key === "age") return ageRange;
    return String(weight);
  }, [step, gender, ageRange, weight]);

  return (
    <section className="mprofile" aria-label="Profile">
      <video className="mprofile-feed" ref={mirror.videoRef} autoPlay playsInline muted />
      <div className="mprofile-scrim" aria-hidden="true" />

      <div className="mprofile-sheet">
        <div className="mprofile-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.key} data-on={i <= stepIndex ? "true" : undefined} />
          ))}
        </div>
        <h2 className="mprofile-title">{step.title}</h2>

        {step.kind === "option" ? (
          <div className="mprofile-options" role="listbox">
            {step.options.map((opt, i) => {
              const on = currentOptionValue === opt.value;
              const arming = gesture.armedChoice === i;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`mprofile-option ${on ? "on" : ""} ${arming ? "arming" : ""}`}
                  style={{ ["--dwell-ms" as string]: "700ms" }}
                  onClick={() => pick(i)}
                >
                  <span className="mprofile-option-num">{i + 1}</span>
                  {arming && <span className="mprofile-option-arm" aria-hidden="true" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mprofile-height">
            <button type="button" className="mprofile-step" onClick={() => setHeight((h) => Math.max(120, h - 1))} aria-label={c.minus}>
              −
            </button>
            <div className="mprofile-height-val">
              <strong>{height}</strong>
              <small>cm</small>
              {stt.supported && (
                <button
                  type="button"
                  className={`mprofile-mic ${stt.listening ? "on" : ""}`}
                  onClick={toggleHeightVoice}
                  aria-label={stt.listening ? c.stop : c.speakHeight}
                >
                  🎤
                </button>
              )}
              {/* voice progress bar — active while listening */}
              <div className="mprofile-voicebar" data-on={stt.listening ? "true" : undefined}>
                <span />
              </div>
            </div>
            <button type="button" className="mprofile-step" onClick={() => setHeight((h) => Math.min(210, h + 1))} aria-label={c.plus}>
              +
            </button>
          </div>
        )}

        <div className="mprofile-readbar">
          <GestureReadBar
            action={gesture.armedGesture}
            dwellMs={gesture.dwellMs}
            labelOverrides={{ confirm: c.confirm }}
            language={language}
          />
        </div>
        <GestureHint
          language={language}
          labelOverrides={{ confirm: c.confirm }}
          only={step.kind === "height" ? ["talk", "confirm", "back"] : ["pick", "confirm", "back"]}
          active={
            stt.listening
              ? "talk"
              : gesture.armedChoice !== null
                ? "pick"
                : null
          }
        />

        <div className="mprofile-actions">
          <button type="button" className="mprofile-btn ghost" onClick={back}>
            {c.back}
          </button>
          <button type="button" className="mprofile-btn primary" onClick={next}>
            {stepIndex >= steps.length - 1 ? c.start : c.next}
          </button>
        </div>
      </div>
    </section>
  );
}
