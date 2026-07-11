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

type OptionStep = {
  key: "gender" | "age" | "weight";
  kind: "option";
  title: string;
  options: { value: string; label: string }[];
};
type HeightStep = { key: "height"; kind: "height"; title: string };
type Step = OptionStep | HeightStep;

const STEPS: Step[] = [
  {
    key: "gender",
    kind: "option",
    title: "你的性别?",
    options: [
      { value: "female", label: "女" },
      { value: "male", label: "男" },
      { value: "neutral", label: "中性" }
    ]
  },
  {
    key: "age",
    kind: "option",
    title: "年龄段?",
    options: [
      { value: "18-25", label: "18–25" },
      { value: "26-35", label: "26–35" },
      { value: "36-45", label: "36–45" }
    ]
  },
  { key: "height", kind: "height", title: "身高?说出来或点 +/−" },
  {
    key: "weight",
    kind: "option",
    title: "体型?",
    options: [
      { value: "55", label: "偏瘦" },
      { value: "65", label: "标准" },
      { value: "78", label: "偏壮" }
    ]
  }
];

export function MirrorProfile({
  onDone,
  onBack
}: {
  onDone: (profile: ManualProfile) => void;
  onBack: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [gender, setGender] = useState<ManualProfile["gender_presentation"]>("neutral");
  const [ageRange, setAgeRange] = useState<ManualProfile["age_range"]>("26-35");
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);

  const step = STEPS[stepIndex];
  const mirror = useMirrorCamera(true);

  function commit() {
    onDone({ height_cm: height, weight_kg: weight, gender_presentation: gender, age_range: ageRange });
  }

  function next() {
    if (stepIndex >= STEPS.length - 1) commit();
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
    lang: "zh-CN",
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
          {STEPS.map((s, i) => (
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
            <button type="button" className="mprofile-step" onClick={() => setHeight((h) => Math.max(120, h - 1))} aria-label="减">
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
                  aria-label={stt.listening ? "停止" : "说出身高"}
                >
                  🎤
                </button>
              )}
              {/* voice progress bar — active while listening */}
              <div className="mprofile-voicebar" data-on={stt.listening ? "true" : undefined}>
                <span />
              </div>
            </div>
            <button type="button" className="mprofile-step" onClick={() => setHeight((h) => Math.min(210, h + 1))} aria-label="加">
              +
            </button>
          </div>
        )}

        <div className="mprofile-readbar">
          <GestureReadBar action={gesture.armedGesture} dwellMs={gesture.dwellMs} />
        </div>
        <GestureHint
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
            ← 返回
          </button>
          <button type="button" className="mprofile-btn primary" onClick={next}>
            {stepIndex >= STEPS.length - 1 ? "开始搭配 →" : "下一步 →"}
          </button>
        </div>
      </div>
    </section>
  );
}
