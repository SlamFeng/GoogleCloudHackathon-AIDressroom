import { useMemo, useRef, useState } from "react";
import { analyzeCapture, confirmAnalysis, createSession } from "./api";
import type {
  AnalysisHandoff,
  AnalysisMode,
  AppStep,
  BodyProfile,
  BodyShape,
  ManualProfile
} from "./types";
import { useCameraCapture } from "./useCameraCapture";

type Language = "en" | "zh" | "ja";

const languageLabels: Record<Language, string> = {
  en: "EN",
  zh: "中文",
  ja: "日本語"
};

const translations = {
  en: {
    appName: "StyleAI",
    appSubtitle: "AI STYLE ADVISOR",
    brandHome: "StyleAI home",
    progress: "Flow progress",
    privacyChip: "Photos deleted after this session",
    errors: {
      createSession: "Unable to create a session.",
      analyze: "Analysis failed.",
      confirm: "Confirmation failed."
    },
    welcome: {
      eyebrow: "YOUR PERSONAL STORE STYLIST",
      titleLine1: "See your current style,",
      titleLine2: "find the next look",
      highlight: "that fits",
      lede:
        "Step in front of the camera. StyleAI reads your outfit signals and body proportions, then helps the store stylist match better options from real inventory.",
      start: "Start experience",
      trust: ["About 30 sec", "No signup", "Editable result"],
      visual: {
        style: "Smart casual",
        palette: "Neutral / Navy",
        fit: "Balanced"
      }
    },
    consent: {
      step: "STEP 01 · PRIVACY",
      title: "Clear consent before the camera opens.",
      intro:
        "We only capture one front-facing full-body photo after you actively agree, and use it for this styling analysis.",
      cards: [
        ["Only one shot", "No background recording and no face identity recognition."],
        ["For this recommendation only", "The photo is used to generate body and outfit features."],
        ["Deleted after session", "Raw photos are not written to public logs or permanent links."]
      ],
      cameraConsent: "I agree to enable the camera and capture one front-facing full-body photo.",
      processingConsent:
        "I agree that AI may analyze the photo in this session and understand results may be approximate.",
      continue: "Agree and continue"
    },
    profile: {
      step: "STEP 02 · PROFILE",
      title: "Give visual analysis a real scale.",
      intro:
        "Height and weight help calibrate the image. Age range and gender presentation are chosen by you; AI will not infer them on its own.",
      height: "Height",
      weight: "Weight",
      gender: "Gender presentation",
      genderOptions: {
        female: "Feminine",
        male: "Masculine",
        neutral: "Neutral / Not specified"
      },
      age: "Age range",
      continue: "Ready to capture"
    },
    capture: {
      step: "STEP 03 · CAPTURE",
      title: "Step into the frame. We’ll handle the rest.",
      back: "← Back to profile",
      loading: "Loading pose model…",
      tipsTitle: "Capture tips",
      tips: [
        ["Full body visible", "Keep head to ankles inside the guide frame."],
        ["Face forward", "Stand naturally with arms slightly away from the body."],
        ["Even lighting", "Avoid strong backlight and heavy occlusion."]
      ],
      autoReady: "AUTO CAPTURE ON",
      manualReady: "MANUAL READY",
      autoNote: "Auto countdown starts after the pose is stable.",
      manualCapture: "Manual capture",
      uploadTitle: "Upload full-body photo",
      uploadText: "Use an existing front-facing full-body image instead of the camera.",
      uploadButton: "Choose photo",
      uploadError: "Please upload an image file."
    },
    analyzing: {
      step: "ANALYZING",
      title: "Reading outfit signals from the image…",
      alt: "Captured photo waiting for analysis",
      modeLabel: "Analysis mode",
      modeOptions: {
        mock: "Mock analysis",
        ai: "AI analysis"
      },
      modeNotes: {
        mock: "Fast deterministic demo output for UI and contract testing.",
        ai: "Calls the configured multimodal AI analyzer when the backend key is available."
      },
      start: "Start analysis",
      steps: [
        "Full-body image quality check",
        "Body proportion and silhouette analysis",
        "Current clothing category and color detection",
        "Packaging data for the recommendation Agent"
      ],
      note:
        "Circumferences are only estimated when evidence is sufficient; unreliable fields stay empty."
    },
    review: {
      step: "STEP 04 · REVIEW",
      title: "Here’s what we see. You can adjust it.",
      confidence: "Overall confidence",
      photoAlt: "Customer front-facing full-body photo",
      retake: "Retake",
      bodyTitle: "Body profile",
      bodyIntro: "Used for model matching and soft size recommendations",
      bodyShape: "Body silhouette",
      bodySize: "Body volume",
      measurements: {
        shoulder: "Shoulder width (est.)",
        inseam: "Inseam (est.)",
        circumference: "Bust / waist / hip",
        singleView: "Not from one photo"
      },
      outfitTitle: "Current outfit",
      note:
        "These are recommendation signals, not precise body measurements. Data is sent to the styling Agent only after you confirm.",
      confirm: "Confirm and start styling"
    },
    complete: {
      eyebrow: "HANDOFF READY",
      title: "Observations have been sent to the styling Agent.",
      body: "HTTP handoff is ready. The next module can ask about occasion, budget and style preferences.",
      bodyContract: "Body contract",
      outfitContract: "Outfit contract",
      detectedItems: "Detected items",
      showJson: "View handoff JSON",
      hideJson: "Hide JSON",
      restart: "Start new session"
    },
    common: {
      back: "← Back"
    },
    bodyShapes: {
      hourglass: "Hourglass",
      pear: "Pear",
      apple: "Apple",
      rectangle: "Rectangle",
      inverted_triangle: "Inverted triangle",
      trapezoid: "Trapezoid",
      triangle: "Triangle",
      oval: "Oval",
      unknown: "Unknown"
    },
    bodySizes: {
      slim: "Slim",
      average: "Average",
      curvy: "Curvy",
      plus: "Plus",
      unknown: "Unknown"
    },
    pose: {
      preparing: "Preparing pose detection…",
      noPerson: "Please stand in the center of the frame.",
      multiplePeople: "Please keep only one customer in frame.",
      notVisible: "Please make sure head to ankles are clearly visible.",
      stepBack: "Step back a little so your full body fits the guide.",
      stepCloser: "Move a little closer to the camera.",
      moveRight: "Move slightly to your right.",
      moveLeft: "Move slightly to your left.",
      faceForward: "Face forward and keep your shoulders level.",
      holdStill: "Great. Please hold still.",
      permissionDenied: "Camera permission was denied. Please allow access in browser settings.",
      cameraFallback: "Unable to start camera or pose model. You can still use manual capture."
    }
  },
  zh: {
    appName: "StyleAI",
    appSubtitle: "AI STYLE ADVISOR",
    brandHome: "StyleAI 首页",
    progress: "流程进度",
    privacyChip: "本次会话后删除照片",
    errors: {
      createSession: "无法创建会话",
      analyze: "分析失败",
      confirm: "确认失败"
    },
    welcome: {
      eyebrow: "YOUR PERSONAL STORE STYLIST",
      titleLine1: "看见你的现在，",
      titleLine2: "找到下一套",
      highlight: "更适合",
      lede:
        "站到镜头前，StyleAI 会读取你当前的穿搭线索与身体比例，帮助店内造型顾问从真实库存中找到更合适的选择。",
      start: "开始体验",
      trust: ["约 30 秒", "无需注册", "结果可修改"],
      visual: {
        style: "Smart casual",
        palette: "Neutral / Navy",
        fit: "Balanced"
      }
    },
    consent: {
      step: "STEP 01 · PRIVACY",
      title: "先说清楚，再打开镜头。",
      intro: "我们只会在你主动同意后拍摄一张正面全身照，用于本次穿搭分析。",
      cards: [
        ["只拍一张", "不会后台录像，也不会做人脸身份识别。"],
        ["仅作本次推荐", "图片只用于生成身体与当前穿搭特征。"],
        ["会话后删除", "不会把原始照片写进公开日志或永久链接。"]
      ],
      cameraConsent: "我同意启用摄像头并拍摄一张正面全身照。",
      processingConsent: "我同意 AI 在本次会话中分析照片，并理解结果可能是近似估算。",
      continue: "同意并继续"
    },
    profile: {
      step: "STEP 02 · PROFILE",
      title: "给视觉分析一个真实比例尺。",
      intro: "身高和体重帮助我们校准照片；年龄段与性别呈现由你选择，AI 不会擅自猜测。",
      height: "身高",
      weight: "体重",
      gender: "性别呈现",
      genderOptions: {
        female: "女性",
        male: "男性",
        neutral: "中性 / 不限定"
      },
      age: "年龄段",
      continue: "准备拍摄"
    },
    capture: {
      step: "STEP 03 · CAPTURE",
      title: "站进框里，剩下的交给我们。",
      back: "← 返回修改资料",
      loading: "正在加载姿态模型…",
      tipsTitle: "拍摄小提示",
      tips: [
        ["全身入镜", "头部到脚踝都留在虚线框内"],
        ["正面站立", "双脚自然分开，手臂稍离身体"],
        ["光线均匀", "避免强逆光和厚重遮挡"]
      ],
      autoReady: "AUTO CAPTURE ON",
      manualReady: "MANUAL READY",
      autoNote: "符合条件并保持稳定后会自动倒计时。",
      manualCapture: "手动拍摄",
      uploadTitle: "上传全身照",
      uploadText: "也可以选择一张已有的正面全身照，不使用摄像头。",
      uploadButton: "选择照片",
      uploadError: "请上传图片文件。"
    },
    analyzing: {
      step: "ANALYZING",
      title: "正在读懂画面里的穿搭线索…",
      alt: "等待分析的拍摄照片",
      modeLabel: "分析模式",
      modeOptions: {
        mock: "Mock 分析",
        ai: "AI 分析"
      },
      modeNotes: {
        mock: "使用稳定的演示数据，适合测试界面和数据契约。",
        ai: "在后端配置多模态 AI key 后，会调用真实 AI 分析。"
      },
      start: "开始分析",
      steps: ["全身画面质量检查", "身体比例与轮廓分析", "当前服装类别与颜色识别", "整理为推荐 Agent 可用数据"],
      note: "围度只会在依据足够时给出近似值；不可靠的字段会保留为空。"
    },
    review: {
      step: "STEP 04 · REVIEW",
      title: "这是我们看到的你，可以随时修正。",
      confidence: "综合置信度",
      photoAlt: "顾客正面全身照",
      retake: "重新拍摄",
      bodyTitle: "身体特征",
      bodyIntro: "用于模特匹配和软性尺码推荐",
      bodyShape: "体型轮廓",
      bodySize: "整体体量",
      measurements: {
        shoulder: "肩宽（估算）",
        inseam: "内长（估算）",
        circumference: "胸 / 腰 / 臀围",
        singleView: "单图不输出"
      },
      outfitTitle: "当前穿搭",
      note: "这些是推荐参考，不是精确量体结果。你确认后，数据才会发送给下一阶段的造型 Agent。",
      confirm: "确认并开始搭配"
    },
    complete: {
      eyebrow: "HANDOFF READY",
      title: "观察结果已经交给造型 Agent。",
      body: "HTTP handoff 已准备好。下一模块可以开始询问场景、预算和风格偏好。",
      bodyContract: "身体契约",
      outfitContract: "穿搭契约",
      detectedItems: "识别单品",
      showJson: "查看交付 JSON",
      hideJson: "收起 JSON",
      restart: "开始新会话"
    },
    common: {
      back: "← 返回"
    },
    bodyShapes: {
      hourglass: "沙漏型",
      pear: "梨型",
      apple: "苹果型",
      rectangle: "直线型",
      inverted_triangle: "倒三角型",
      trapezoid: "梯型",
      triangle: "三角型",
      oval: "椭圆型",
      unknown: "暂不确定"
    },
    bodySizes: {
      slim: "纤细",
      average: "适中",
      curvy: "曲线明显",
      plus: "丰满",
      unknown: "暂不确定"
    },
    pose: {
      preparing: "正在准备姿态检测…",
      noPerson: "请站到画面中央",
      multiplePeople: "画面中请只保留一位顾客",
      notVisible: "请确保头部到脚踝都清晰可见",
      stepBack: "请后退一点，让全身进入虚线框",
      stepCloser: "请向摄像头靠近一点",
      moveRight: "请稍微向右移动",
      moveLeft: "请稍微向左移动",
      faceForward: "请正面站立，保持双肩水平",
      holdStill: "很好，请保持不动",
      permissionDenied: "摄像头权限被拒绝，请在浏览器设置中允许访问。",
      cameraFallback: "无法启动摄像头或姿态模型。你仍可使用手动拍摄。"
    }
  },
  ja: {
    appName: "StyleAI",
    appSubtitle: "AI STYLE ADVISOR",
    brandHome: "StyleAI ホーム",
    progress: "進行状況",
    privacyChip: "写真はこのセッション後に削除",
    errors: {
      createSession: "セッションを作成できませんでした。",
      analyze: "分析に失敗しました。",
      confirm: "確認に失敗しました。"
    },
    welcome: {
      eyebrow: "YOUR PERSONAL STORE STYLIST",
      titleLine1: "今のあなたを見て、",
      titleLine2: "次の一着を",
      highlight: "もっと似合う形で",
      lede:
        "カメラの前に立つと、StyleAI が現在のコーディネートと身体バランスを読み取り、店舗在庫からより合う選択肢を探します。",
      start: "体験を始める",
      trust: ["約30秒", "登録不要", "結果を修正可能"],
      visual: {
        style: "Smart casual",
        palette: "Neutral / Navy",
        fit: "Balanced"
      }
    },
    consent: {
      step: "STEP 01 · PRIVACY",
      title: "カメラを開く前に、同意内容を確認します。",
      intro: "同意後に正面の全身写真を1枚だけ撮影し、このスタイリング分析に使用します。",
      cards: [
        ["1枚だけ撮影", "バックグラウンド録画や顔認証は行いません。"],
        ["今回の提案のみ", "写真は身体とコーディネート特徴の生成に使います。"],
        ["セッション後に削除", "元画像を公開ログや永続リンクに保存しません。"]
      ],
      cameraConsent: "カメラを有効にし、正面の全身写真を1枚撮影することに同意します。",
      processingConsent: "このセッションで AI が写真を分析し、結果が概算であることを理解します。",
      continue: "同意して続ける"
    },
    profile: {
      step: "STEP 02 · PROFILE",
      title: "画像分析に実寸のスケールを与えます。",
      intro: "身長と体重で写真を補正します。年齢層とジェンダー表現はあなたが選び、AI は推測しません。",
      height: "身長",
      weight: "体重",
      gender: "ジェンダー表現",
      genderOptions: {
        female: "女性的",
        male: "男性的",
        neutral: "中性的 / 指定しない"
      },
      age: "年齢層",
      continue: "撮影へ進む"
    },
    capture: {
      step: "STEP 03 · CAPTURE",
      title: "枠の中に立ってください。あとは任せて。",
      back: "← プロフィールに戻る",
      loading: "姿勢モデルを読み込み中…",
      tipsTitle: "撮影のコツ",
      tips: [
        ["全身を入れる", "頭から足首までガイド枠内に入れてください。"],
        ["正面を向く", "自然に立ち、腕を少し身体から離してください。"],
        ["均一な光", "強い逆光や大きな遮りを避けてください。"]
      ],
      autoReady: "AUTO CAPTURE ON",
      manualReady: "MANUAL READY",
      autoNote: "条件が整い姿勢が安定すると自動でカウントダウンします。",
      manualCapture: "手動で撮影",
      uploadTitle: "全身写真をアップロード",
      uploadText: "カメラの代わりに、既存の正面全身写真を選択できます。",
      uploadButton: "写真を選択",
      uploadError: "画像ファイルをアップロードしてください。"
    },
    analyzing: {
      step: "ANALYZING",
      title: "画像内のコーディネート情報を読み取り中…",
      alt: "分析待ちの撮影写真",
      modeLabel: "分析モード",
      modeOptions: {
        mock: "Mock 分析",
        ai: "AI 分析"
      },
      modeNotes: {
        mock: "UI とデータ契約の確認用に安定したデモ結果を返します。",
        ai: "バックエンドにマルチモーダル AI key が設定されている場合に実分析します。"
      },
      start: "分析を開始",
      steps: ["全身画像の品質チェック", "身体比率とシルエット分析", "現在の服カテゴリと色の検出", "推薦 Agent 用データに整理"],
      note: "採寸値は根拠が十分な場合のみ概算し、不確かな項目は空欄にします。"
    },
    review: {
      step: "STEP 04 · REVIEW",
      title: "StyleAI の見立てです。いつでも修正できます。",
      confidence: "総合信頼度",
      photoAlt: "顧客の正面全身写真",
      retake: "撮り直す",
      bodyTitle: "身体プロフィール",
      bodyIntro: "モデル照合とソフトなサイズ推薦に使用",
      bodyShape: "体型シルエット",
      bodySize: "全体ボリューム",
      measurements: {
        shoulder: "肩幅（推定）",
        inseam: "股下（推定）",
        circumference: "バスト / ウエスト / ヒップ",
        singleView: "1枚写真では出力しない"
      },
      outfitTitle: "現在のコーディネート",
      note: "これは推薦用の参考情報であり、正確な採寸ではありません。確認後にのみ次のスタイリング Agent へ送信します。",
      confirm: "確認してスタイリングへ"
    },
    complete: {
      eyebrow: "HANDOFF READY",
      title: "分析結果をスタイリング Agent に渡しました。",
      body: "HTTP handoff の準備ができました。次のモジュールは用途、予算、好みのスタイルを質問できます。",
      bodyContract: "身体契約",
      outfitContract: "服装契約",
      detectedItems: "検出アイテム",
      showJson: "handoff JSON を表示",
      hideJson: "JSON を閉じる",
      restart: "新しいセッション"
    },
    common: {
      back: "← 戻る"
    },
    bodyShapes: {
      hourglass: "砂時計型",
      pear: "洋梨型",
      apple: "りんご型",
      rectangle: "長方形型",
      inverted_triangle: "逆三角形",
      trapezoid: "台形",
      triangle: "三角形",
      oval: "楕円型",
      unknown: "不明"
    },
    bodySizes: {
      slim: "スリム",
      average: "標準",
      curvy: "曲線的",
      plus: "大きめ",
      unknown: "不明"
    },
    pose: {
      preparing: "姿勢検出を準備中…",
      noPerson: "画面中央に立ってください。",
      multiplePeople: "画面内は1人だけにしてください。",
      notVisible: "頭から足首まで見えるようにしてください。",
      stepBack: "少し下がって全身をガイド枠に入れてください。",
      stepCloser: "カメラに少し近づいてください。",
      moveRight: "少し右へ移動してください。",
      moveLeft: "少し左へ移動してください。",
      faceForward: "正面を向き、肩を水平にしてください。",
      holdStill: "いい感じです。そのまま動かないでください。",
      permissionDenied: "カメラ権限が拒否されました。ブラウザ設定で許可してください。",
      cameraFallback: "カメラまたは姿勢モデルを開始できません。手動撮影は使用できます。"
    }
  }
} as const;

type Copy = (typeof translations)[Language];

const initialProfile: ManualProfile = {
  height_cm: 168,
  weight_kg: 58,
  gender_presentation: "neutral",
  age_range: "26-35"
};

const stepOrder: AppStep[] = [
  "welcome",
  "consent",
  "profile",
  "capture",
  "analyzing",
  "review",
  "complete"
];

function App() {
  const [language, setLanguage] = useState<Language>("en");
  const copy = translations[language];
  const [step, setStep] = useState<AppStep>("welcome");
  const [manualProfile, setManualProfile] = useState<ManualProfile>(initialProfile);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("mock");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisHandoff | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    const index = stepOrder.indexOf(step);
    return Math.min(100, Math.max(0, (index / (stepOrder.length - 2)) * 100));
  }, [step]);

  async function begin() {
    setError(null);
    try {
      const session = await createSession();
      setSessionId(session.session_id);
      setStep("consent");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errors.createSession);
    }
  }

  async function submitCapture(dataUrl: string) {
    setCaptureDataUrl(dataUrl);
    setAnalysis(null);
    setIsAnalyzing(false);
    setStep("analyzing");
    setError(null);
  }

  async function runAnalysis() {
    if (!sessionId || !captureDataUrl) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeCapture(sessionId, manualProfile, captureDataUrl, analysisMode);
      setAnalysis(result);
      setStep("review");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errors.analyze);
      setStep("analyzing");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function confirm() {
    if (!analysis) return;
    setError(null);
    try {
      const confirmed = await confirmAnalysis(analysis.analysis_id, analysis.body_profile);
      setAnalysis(confirmed);
      setStep("complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errors.confirm);
    }
  }

  function reset() {
    setStep("welcome");
    setManualProfile(initialProfile);
    setSessionId(null);
    setCaptureDataUrl(null);
    setAnalysisMode("mock");
    setIsAnalyzing(false);
    setAnalysis(null);
    setError(null);
  }

  return (
    <main className="app-shell" lang={language}>
      <Header
        copy={copy}
        language={language}
        onLanguageChange={setLanguage}
        progress={progress}
        step={step}
      />
      {error && (
        <div className="error-banner" role="alert">
          <span>!</span>
          {error}
        </div>
      )}

      {step === "welcome" && <Welcome copy={copy} onStart={() => void begin()} />}
      {step === "consent" && (
        <Consent
          copy={copy}
          onBack={() => setStep("welcome")}
          onContinue={() => setStep("profile")}
        />
      )}
      {step === "profile" && (
        <ProfileForm
          copy={copy}
          value={manualProfile}
          onChange={setManualProfile}
          onBack={() => setStep("consent")}
          onContinue={() => setStep("capture")}
        />
      )}
      {step === "capture" && (
        <CameraStage
          copy={copy}
          onBack={() => setStep("profile")}
          onCaptured={(dataUrl) => void submitCapture(dataUrl)}
        />
      )}
      {step === "analyzing" && (
        <Analyzing
          copy={copy}
          captureDataUrl={captureDataUrl}
          analysisMode={analysisMode}
          isAnalyzing={isAnalyzing}
          onModeChange={setAnalysisMode}
          onBack={() => setStep("capture")}
          onStart={() => void runAnalysis()}
        />
      )}
      {step === "review" && analysis && (
        <Review
          copy={copy}
          analysis={analysis}
          captureDataUrl={captureDataUrl}
          onChange={(bodyProfile) =>
            setAnalysis((current) => (current ? { ...current, body_profile: bodyProfile } : current))
          }
          onRetake={() => setStep("capture")}
          onConfirm={() => void confirm()}
        />
      )}
      {step === "complete" && analysis && (
        <Complete copy={copy} analysis={analysis} onRestart={reset} />
      )}
    </main>
  );
}

function Header({
  copy,
  language,
  onLanguageChange,
  progress,
  step
}: {
  copy: Copy;
  language: Language;
  onLanguageChange: (language: Language) => void;
  progress: number;
  step: AppStep;
}) {
  const showProgress = step !== "welcome" && step !== "complete";
  return (
    <header className="topbar">
      <button className="brand" type="button" aria-label={copy.brandHome}>
        <span>
          <strong>{copy.appName}</strong>
          <small>{copy.appSubtitle}</small>
        </span>
      </button>
      {showProgress && (
        <div className="progress-wrap" aria-label={`${copy.progress} ${Math.round(progress)}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="topbar-actions">
        <div className="language-switch" aria-label="Language selector">
          {(Object.keys(languageLabels) as Language[]).map((key) => (
            <button
              className={language === key ? "active" : ""}
              key={key}
              type="button"
              onClick={() => onLanguageChange(key)}
            >
              {languageLabels[key]}
            </button>
          ))}
        </div>
        <div className="privacy-chip">
          <span className="privacy-dot" />
          {copy.privacyChip}
        </div>
      </div>
    </header>
  );
}

function Welcome({ copy, onStart }: { copy: Copy; onStart: () => void }) {
  return (
    <section className="welcome page-grid">
      <div className="welcome-copy">
        <p className="eyebrow">{copy.welcome.eyebrow}</p>
        <h1>
          {copy.welcome.titleLine1}
          <br />
          {copy.welcome.titleLine2} <span>{copy.welcome.highlight}</span>.
        </h1>
        <p className="lede">{copy.welcome.lede}</p>
        <button className="primary-button hero-button" onClick={onStart}>
          {copy.welcome.start}
          <span aria-hidden="true">→</span>
        </button>
        <div className="trust-row">
          {copy.welcome.trust.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <HeroVisual copy={copy} />
    </section>
  );
}

function HeroVisual({ copy }: { copy: Copy }) {
  return (
    <div className="welcome-visual" aria-hidden="true">
      <div className="visual-glow glow-one" />
      <div className="visual-glow glow-two" />
      <div className="visual-scanline" />
      <div className="visual-depth-card depth-card-one" />
      <div className="visual-depth-card depth-card-two" />
      <div className="visual-orbit orbit-one" />
      <div className="visual-orbit orbit-two" />
      <div className="silhouette">
        <div className="silhouette-head" />
        <div className="silhouette-body" />
        <div className="silhouette-legs" />
      </div>
      <div className="measurement-ruler">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="floating-tag tag-one">
        <small>STYLE</small>
        {copy.welcome.visual.style}
      </div>
      <div className="floating-tag tag-two">
        <small>PALETTE</small>
        {copy.welcome.visual.palette}
      </div>
      <div className="floating-tag tag-three">
        <small>FIT SIGNAL</small>
        {copy.welcome.visual.fit}
      </div>
      <div className="style-tokens">
        <span>BODY PROFILE</span>
        <span>OUTFIT VECTOR</span>
        <span>INVENTORY MATCH</span>
      </div>
    </div>
  );
}

function Consent({
  copy,
  onBack,
  onContinue
}: {
  copy: Copy;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [cameraConsent, setCameraConsent] = useState(false);
  const [processingConsent, setProcessingConsent] = useState(false);
  return (
    <section className="centered-page">
      <div className="panel consent-panel">
        <p className="step-label">{copy.consent.step}</p>
        <h2>{copy.consent.title}</h2>
        <p className="panel-intro">{copy.consent.intro}</p>
        <div className="privacy-cards">
          {copy.consent.cards.map(([title, text], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={cameraConsent}
            onChange={(event) => setCameraConsent(event.target.checked)}
          />
          <span>{copy.consent.cameraConsent}</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={processingConsent}
            onChange={(event) => setProcessingConsent(event.target.checked)}
          />
          <span>{copy.consent.processingConsent}</span>
        </label>
        <PageActions
          copy={copy}
          onBack={onBack}
          onContinue={onContinue}
          continueLabel={copy.consent.continue}
          disabled={!cameraConsent || !processingConsent}
        />
      </div>
    </section>
  );
}

function ProfileForm({
  copy,
  value,
  onChange,
  onBack,
  onContinue
}: {
  copy: Copy;
  value: ManualProfile;
  onChange: (value: ManualProfile) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const valid =
    value.height_cm >= 100 &&
    value.height_cm <= 230 &&
    value.weight_kg >= 25 &&
    value.weight_kg <= 250;

  return (
    <section className="centered-page">
      <div className="panel profile-panel">
        <p className="step-label">{copy.profile.step}</p>
        <h2>{copy.profile.title}</h2>
        <p className="panel-intro">{copy.profile.intro}</p>
        <div className="form-grid">
          <label className="field">
            <span>{copy.profile.height}</span>
            <div className="number-input">
              <input
                type="number"
                min="100"
                max="230"
                value={value.height_cm}
                onChange={(event) =>
                  onChange({ ...value, height_cm: Number(event.target.value) })
                }
              />
              <small>cm</small>
            </div>
          </label>
          <label className="field">
            <span>{copy.profile.weight}</span>
            <div className="number-input">
              <input
                type="number"
                min="25"
                max="250"
                value={value.weight_kg}
                onChange={(event) =>
                  onChange({ ...value, weight_kg: Number(event.target.value) })
                }
              />
              <small>kg</small>
            </div>
          </label>
          <fieldset className="field field-full">
            <legend>{copy.profile.gender}</legend>
            <div className="segmented">
              {(["female", "male", "neutral"] as const).map((key) => (
                <button
                  type="button"
                  className={value.gender_presentation === key ? "active" : ""}
                  onClick={() =>
                    onChange({
                      ...value,
                      gender_presentation: key
                    })
                  }
                  key={key}
                >
                  {copy.profile.genderOptions[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field field-full">
            <legend>{copy.profile.age}</legend>
            <div className="segmented age-segments">
              {(["18-25", "26-35", "36-45", "46+"] as const).map((age) => (
                <button
                  type="button"
                  className={value.age_range === age ? "active" : ""}
                  onClick={() => onChange({ ...value, age_range: age })}
                  key={age}
                >
                  {age}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <PageActions
          copy={copy}
          onBack={onBack}
          onContinue={onContinue}
          continueLabel={copy.profile.continue}
          disabled={!valid}
        />
      </div>
    </section>
  );
}

function CameraStage({
  copy,
  onBack,
  onCaptured
}: {
  copy: Copy;
  onBack: () => void;
  onCaptured: (dataUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { videoRef, modelState, cameraError, assessment, progress, countdown, capture } =
    useCameraCapture({ messages: copy.pose, onCaptured });

  function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert(copy.capture.uploadError);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") onCaptured(reader.result);
    });
    reader.readAsDataURL(file);
  }

  return (
    <section className="capture-page">
      <div className="capture-heading">
        <div>
          <p className="step-label">{copy.capture.step}</p>
          <h2>{copy.capture.title}</h2>
        </div>
        <button className="text-button" onClick={onBack}>
          {copy.capture.back}
        </button>
      </div>
      <div className="capture-layout">
        <div className="camera-card">
          <video ref={videoRef} playsInline muted />
          <div className={`guide-frame ${assessment.ready ? "ready" : ""}`}>
            <span className="corner corner-tl" />
            <span className="corner corner-tr" />
            <span className="corner corner-bl" />
            <span className="corner corner-br" />
            <div className="head-guide" />
            <div className="body-guide" />
          </div>
          <div className="camera-status">
            <span className={assessment.ready ? "status-light ready" : "status-light"} />
            {modelState === "loading" ? copy.capture.loading : assessment.message}
          </div>
          {countdown !== null && countdown > 0 && (
            <div className="countdown" aria-live="assertive">
              {countdown}
            </div>
          )}
          {cameraError && <div className="camera-error">{cameraError}</div>}
          <div className="stability-meter">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <aside className="capture-tips">
          <div className="tip-index">01</div>
          <h3>{copy.capture.tipsTitle}</h3>
          <ul>
            {copy.capture.tips.map(([title, text]) => (
              <li key={title}>
                <span>{title}</span>
                {text}
              </li>
            ))}
          </ul>
          <div className="auto-note">
            <strong>
              {modelState === "ready" ? copy.capture.autoReady : copy.capture.manualReady}
            </strong>
            {copy.capture.autoNote}
          </div>
          <button className="secondary-button full-button" onClick={capture}>
            {copy.capture.manualCapture}
          </button>
          <div className="upload-box">
            <div>
              <strong>{copy.capture.uploadTitle}</strong>
              <p>{copy.capture.uploadText}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
            <button
              className="secondary-button full-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              {copy.capture.uploadButton}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Analyzing({
  copy,
  captureDataUrl,
  analysisMode,
  isAnalyzing,
  onModeChange,
  onBack,
  onStart
}: {
  copy: Copy;
  captureDataUrl: string | null;
  analysisMode: AnalysisMode;
  isAnalyzing: boolean;
  onModeChange: (mode: AnalysisMode) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <section className="analyzing-page">
      <div className="scan-preview">
        {captureDataUrl && <img src={captureDataUrl} alt={copy.analyzing.alt} />}
        <div className="scan-line" />
        <div className="scan-grid" />
      </div>
      <div className="analysis-copy">
        <p className="step-label">{copy.analyzing.step}</p>
        <h2>{copy.analyzing.title}</h2>
        <fieldset className="mode-control">
          <legend>{copy.analyzing.modeLabel}</legend>
          <div className="mode-toggle">
            {(["mock", "ai"] as const).map((mode) => (
              <button
                className={analysisMode === mode ? "active" : ""}
                disabled={isAnalyzing}
                key={mode}
                type="button"
                onClick={() => onModeChange(mode)}
              >
                {copy.analyzing.modeOptions[mode]}
              </button>
            ))}
          </div>
          <p>{copy.analyzing.modeNotes[analysisMode]}</p>
        </fieldset>
        <div className="analysis-steps">
          {copy.analyzing.steps.map((step, index) => (
            <span
              className={isAnalyzing ? (index === 0 ? "done" : index === 1 ? "active" : "") : ""}
              key={step}
            >
              {step}
            </span>
          ))}
        </div>
        <p>{copy.analyzing.note}</p>
        <div className="analysis-actions">
          <button className="text-button" disabled={isAnalyzing} onClick={onBack}>
            {copy.common.back}
          </button>
          <button
            className="primary-button"
            disabled={!captureDataUrl || isAnalyzing}
            onClick={onStart}
          >
            {isAnalyzing ? copy.analyzing.step : copy.analyzing.start} <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function Review({
  copy,
  analysis,
  captureDataUrl,
  onChange,
  onRetake,
  onConfirm
}: {
  copy: Copy;
  analysis: AnalysisHandoff;
  captureDataUrl: string | null;
  onChange: (bodyProfile: BodyProfile) => void;
  onRetake: () => void;
  onConfirm: () => void;
}) {
  const body = analysis.body_profile;
  const outfit = analysis.outfit_profile;

  return (
    <section className="review-page">
      <div className="review-heading">
        <div>
          <p className="step-label">{copy.review.step}</p>
          <h2>{copy.review.title}</h2>
        </div>
        <div className="confidence-badge">
          <strong>{Math.round(body.extraction.overall_confidence * 100)}%</strong>
          {copy.review.confidence}
        </div>
      </div>
      <div className="review-grid">
        <div className="review-photo-card">
          {captureDataUrl && <img src={captureDataUrl} alt={copy.review.photoAlt} />}
          <button onClick={onRetake}>{copy.review.retake}</button>
        </div>
        <div className="review-content">
          <article className="result-card">
            <div className="card-title">
              <span>01</span>
              <div>
                <h3>{copy.review.bodyTitle}</h3>
                <p>{copy.review.bodyIntro}</p>
              </div>
            </div>
            <div className="editable-grid">
              <label>
                <span>{copy.review.bodyShape}</span>
                <select
                  value={body.body_shape ?? "unknown"}
                  onChange={(event) =>
                    onChange({ ...body, body_shape: event.target.value as BodyShape })
                  }
                >
                  {Object.entries(copy.bodyShapes).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{copy.review.bodySize}</span>
                <select
                  value={body.body_size ?? "unknown"}
                  onChange={(event) =>
                    onChange({
                      ...body,
                      body_size: event.target.value as BodyProfile["body_size"]
                    })
                  }
                >
                  {Object.entries(copy.bodySizes).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="measurement-row">
              <Metric
                label={copy.review.measurements.shoulder}
                value={body.measurements.shoulder_cm}
                unit="cm"
              />
              <Metric
                label={copy.review.measurements.inseam}
                value={body.measurements.inseam_cm}
                unit="cm"
              />
              <Metric
                label={copy.review.measurements.circumference}
                value={null}
                unit={copy.review.measurements.singleView}
              />
            </div>
          </article>

          <article className="result-card">
            <div className="card-title">
              <span>02</span>
              <div>
                <h3>{copy.review.outfitTitle}</h3>
                <p>{outfit.overall_style.join(" · ")}</p>
              </div>
            </div>
            <div className="outfit-items">
              {outfit.items.map((item) => (
                <div className="outfit-item" key={item.item_id}>
                  <div
                    className="color-swatch"
                    style={{ background: item.colors[0]?.hex ?? "#d8d8d2" }}
                  />
                  <div>
                    <strong>{item.subcategory.replaceAll("_", " ")}</strong>
                    <span>
                      {item.colors[0]?.name ?? "unknown"} · {item.fit}
                    </span>
                  </div>
                  <small>{Math.round(item.confidence * 100)}%</small>
                </div>
              ))}
            </div>
          </article>

          <div className="review-note">
            <span>i</span>
            {copy.review.note}
          </div>
          <div className="review-actions">
            <button className="secondary-button" onClick={onRetake}>
              {copy.review.retake}
            </button>
            <button className="primary-button" onClick={onConfirm}>
              {copy.review.confirm} <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  unit
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
      <small>{unit}</small>
    </div>
  );
}

function Complete({
  copy,
  analysis,
  onRestart
}: {
  copy: Copy;
  analysis: AnalysisHandoff;
  onRestart: () => void;
}) {
  const [showJson, setShowJson] = useState(false);
  return (
    <section className="complete-page">
      <div className="success-mark">✓</div>
      <p className="eyebrow">{copy.complete.eyebrow}</p>
      <h2>{copy.complete.title}</h2>
      <p>
        {copy.complete.body} <code>{analysis.analysis_id}</code>
      </p>
      <div className="handoff-summary">
        <div>
          <span>{copy.complete.bodyContract}</span>
          <strong>v{analysis.body_profile.schema_version}</strong>
        </div>
        <div>
          <span>{copy.complete.outfitContract}</span>
          <strong>v{analysis.outfit_profile.schema_version}</strong>
        </div>
        <div>
          <span>{copy.complete.detectedItems}</span>
          <strong>{analysis.outfit_profile.items.length}</strong>
        </div>
      </div>
      <div className="complete-actions">
        <button className="secondary-button" onClick={() => setShowJson((value) => !value)}>
          {showJson ? copy.complete.hideJson : copy.complete.showJson}
        </button>
        <button className="primary-button" onClick={onRestart}>
          {copy.complete.restart}
        </button>
      </div>
      {showJson && <pre className="json-preview">{JSON.stringify(analysis, null, 2)}</pre>}
    </section>
  );
}

function PageActions({
  copy,
  onBack,
  onContinue,
  continueLabel,
  disabled = false
}: {
  copy: Copy;
  onBack: () => void;
  onContinue: () => void;
  continueLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="page-actions">
      <button className="text-button" onClick={onBack}>
        {copy.common.back}
      </button>
      <button className="primary-button" onClick={onContinue} disabled={disabled}>
        {continueLabel} <span>→</span>
      </button>
    </div>
  );
}

export default App;
