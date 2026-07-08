import { useEffect, useMemo, useRef, useState } from "react";
import "./design/screens/mirror.css";
import { analyzeCapture, confirmAnalysis, createSession } from "./api";
import { StylingScreen } from "./StylingScreen";
import type {
  AnalysisHandoff,
  AppStep,
  OutfitItem,
  ManualProfile
} from "./types";
import { useCameraCapture } from "./useCameraCapture";
import { Button } from "./design/components/core/Button";
import { MicroLabel } from "./design/components/core/MicroLabel";
import { PrivacyChip } from "./design/components/status/PrivacyChip";
import { SegmentedControl } from "./design/components/forms/SegmentedControl";
import { NumberField } from "./design/components/forms/NumberField";
import { Checkbox } from "./design/components/forms/Checkbox";
import { LanguageSwitch } from "./design/components/forms/LanguageSwitch";
import { TryOnStage } from "./design/components/tryon/TryOnStage";

type Language = "en" | "zh" | "ja";

const translations = {
  en: {
    appName: "FASHINI",
    appSubtitle: "AI STYLE ADVISOR",
    brandHome: "Fashini home",
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
        "Step in front of the camera. Fashini reads your outfit signals and body proportions, then helps the store stylist match better options from real inventory.",
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
        "We only capture one front-facing full-body photo after you actively agree, and use it for this styling analysis. During styling, the mirror shows a live view of you — it is never recorded or saved.",
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
      start: "Start analysis",
      waitNote: "OOTD analysis usually takes 1-2 minutes.",
      progressLabel: "Analyzing OOTD",
      steps: [
        "Full-body image quality check",
        "Body proportion and silhouette analysis",
        "Current clothing category and color detection",
        "Packaging data for the recommendation Agent"
      ],
      note:
        "The Agent keeps body handling template-based; exact body measurements are not stored or shared."
    },
    review: {
      step: "STEP 04 · OOTD",
      title: "Today's OOTD breakdown",
      photoAlt: "Customer front-facing full-body photo",
      retake: "Use another photo",
      outfitTitle: "Today's OOTD",
      outfitIntro: "Separated into visible pieces for the styling Agent",
      visiblePieces: "Visible pieces",
      dominantColors: "Dominant colors",
      styleSignals: "Style signals",
      centerLook: "Full look",
      clothingBreakdown: "Clothing Breakdown",
      itemColor: "Color",
      itemMaterial: "Material",
      itemStyle: "Style notes",
      noVisibleItems: "No separate visible item detected",
      bodyProfileTitle: "Body profile",
      bodyProfileIntro: "Supporting sizing and model-matching signals",
      manualTitle: "Manual profile",
      proportionsTitle: "Proportions",
      measurementsTitle: "Measurements not retained",
      warningsTitle: "Image limits",
      height: "Height",
      weight: "Weight",
      gender: "Gender",
      age: "Age range",
      bodyShape: "Body silhouette",
      bodySize: "Body volume",
      skinTone: "Skin tone",
      shoulderWidth: "Shoulder width",
      waistDefinition: "Waist definition",
      hipWidth: "Hip width",
      legToTorso: "Leg / torso",
      shoulder: "Shoulder",
      inseam: "Inseam",
      bust: "Bust",
      waist: "Waist",
      hip: "Hip",
      footLength: "Foot",
      unavailable: "Not available",
      note:
        "This editorial OOTD board uses generated item images from visible clothes only. No brands, prices, or intimate apparel are inferred.",
      confirm: "Use this OOTD"
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
    appName: "FASHINI",
    appSubtitle: "AI STYLE ADVISOR",
    brandHome: "Fashini 首页",
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
        "站到镜头前，Fashini 会读取你当前的穿搭线索与身体比例，帮助店内造型顾问从真实库存中找到更合适的选择。",
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
      intro: "我们只会在你主动同意后拍摄一张正面全身照，用于本次穿搭分析。造型环节镜面会显示你的实时画面，但不会录制或保存。",
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
      start: "开始分析",
      waitNote: "OOTD 分析通常需要 1-2 分钟。",
      progressLabel: "正在分析 OOTD",
      steps: ["全身画面质量检查", "身体比例与轮廓分析", "当前服装类别与颜色识别", "整理为推荐 Agent 可用数据"],
      note: "Agent 只保留模板化体型信号；不会存储或共享精确身体围度。"
    },
    review: {
      step: "STEP 04 · OOTD",
      title: "今日 OOTD 拆解",
      photoAlt: "顾客正面全身照",
      retake: "换一张照片",
      outfitTitle: "今日 OOTD",
      outfitIntro: "已拆分为造型 Agent 可继续使用的可见单品",
      visiblePieces: "可见单品",
      dominantColors: "主色",
      styleSignals: "风格信号",
      centerLook: "全身造型",
      clothingBreakdown: "服装拆解",
      itemColor: "颜色",
      itemMaterial: "材质",
      itemStyle: "风格备注",
      noVisibleItems: "未识别到独立可见单品",
      bodyProfileTitle: "身体特征",
      bodyProfileIntro: "用于尺码推荐和模特匹配的辅助信号",
      manualTitle: "手动资料",
      proportionsTitle: "身体比例",
      measurementsTitle: "测量值不保留",
      warningsTitle: "图像限制",
      height: "身高",
      weight: "体重",
      gender: "性别呈现",
      age: "年龄段",
      bodyShape: "体型轮廓",
      bodySize: "整体体量",
      skinTone: "肤色",
      shoulderWidth: "肩宽",
      waistDefinition: "腰线",
      hipWidth: "臀宽",
      legToTorso: "腿身比例",
      shoulder: "肩宽",
      inseam: "内长",
      bust: "胸围",
      waist: "腰围",
      hip: "臀围",
      footLength: "脚长",
      unavailable: "暂不可用",
      note: "这张编辑感 OOTD 板只会根据可见衣物生成单品图，不会推测品牌、价格或私密衣物。",
      confirm: "使用这个 OOTD"
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
    appName: "FASHINI",
    appSubtitle: "AI STYLE ADVISOR",
    brandHome: "Fashini ホーム",
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
        "カメラの前に立つと、Fashini が現在のコーディネートと身体バランスを読み取り、店舗在庫からより合う選択肢を探します。",
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
      intro: "同意後に正面の全身写真を1枚だけ撮影し、このスタイリング分析に使用します。スタイリング中はミラーにライブ映像が表示されますが、録画・保存は行いません。",
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
      start: "分析を開始",
      waitNote: "OOTD 分析は通常 1-2 分ほどかかります。",
      progressLabel: "OOTD を分析中",
      steps: ["全身画像の品質チェック", "身体比率とシルエット分析", "現在の服カテゴリと色の検出", "推薦 Agent 用データに整理"],
      note: "Agent は体型テンプレート中心で扱い、正確な身体採寸値は保存・共有しません。"
    },
    review: {
      step: "STEP 04 · OOTD",
      title: "今日の OOTD 分解",
      photoAlt: "顧客の正面全身写真",
      retake: "別の写真を使う",
      outfitTitle: "今日の OOTD",
      outfitIntro: "スタイリング Agent が使えるよう可視アイテムに分解しました",
      visiblePieces: "可視アイテム",
      dominantColors: "主要カラー",
      styleSignals: "スタイル信号",
      centerLook: "全身ルック",
      clothingBreakdown: "服の分解",
      itemColor: "カラー",
      itemMaterial: "素材",
      itemStyle: "スタイルメモ",
      noVisibleItems: "個別の可視アイテムは未検出",
      bodyProfileTitle: "身体プロフィール",
      bodyProfileIntro: "サイズ推薦とモデル照合用の補助情報",
      manualTitle: "入力プロフィール",
      proportionsTitle: "身体バランス",
      measurementsTitle: "採寸値は保持しません",
      warningsTitle: "画像上の制限",
      height: "身長",
      weight: "体重",
      gender: "性別表現",
      age: "年齢層",
      bodyShape: "体型シルエット",
      bodySize: "全体ボリューム",
      skinTone: "肌トーン",
      shoulderWidth: "肩幅",
      waistDefinition: "ウエスト",
      hipWidth: "ヒップ幅",
      legToTorso: "脚 / 胴",
      shoulder: "肩幅",
      inseam: "股下",
      bust: "バスト",
      waist: "ウエスト",
      hip: "ヒップ",
      footLength: "足長",
      unavailable: "未取得",
      note: "このエディトリアル OOTD ボードは可視アイテムだけから生成します。ブランド、価格、下着類は推定しません。",
      confirm: "この OOTD を使う"
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
  "styling",
  "complete"
];

function App() {
  const [language, setLanguage] = useState<Language>("en");
  const copy = translations[language];
  const [step, setStep] = useState<AppStep>("welcome");
  const [manualProfile, setManualProfile] = useState<ManualProfile>(initialProfile);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
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
      const result = await analyzeCapture(sessionId, manualProfile, captureDataUrl);
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
      setStep("styling");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errors.confirm);
    }
  }

  function reset() {
    setStep("welcome");
    setManualProfile(initialProfile);
    setSessionId(null);
    setCaptureDataUrl(null);
    setIsAnalyzing(false);
    setAnalysis(null);
    setError(null);
  }

  const showProgress = step !== "welcome" && step !== "complete";

  return (
    <main className="mirror" lang={language}>
      <header className="m-top">
        <button
          className="m-brand-home"
          type="button"
          aria-label={copy.brandHome}
          onClick={reset}
        >
          <strong>{copy.appName}</strong>
          <MicroLabel>{copy.appSubtitle}</MicroLabel>
        </button>
        <LanguageSwitch value={language} onChange={(code) => setLanguage(code as Language)} />
      </header>

      {showProgress && (
        <div
          className="m-progress"
          aria-label={`${copy.progress} ${Math.round(progress)}%`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && (
        <div className="m-error" role="alert">
          <span>!</span>
          {error}
        </div>
      )}

      <div className="m-body">
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
            isAnalyzing={isAnalyzing}
            onBack={() => setStep("capture")}
            onStart={() => void runAnalysis()}
          />
        )}
        {step === "review" && analysis && (
          <Review
            copy={copy}
            analysis={analysis}
            captureDataUrl={captureDataUrl}
            onRetake={() => setStep("capture")}
            onConfirm={() => void confirm()}
          />
        )}
        {step === "styling" && analysis && (
          <StylingScreen
            analysis={analysis}
            copy={copy}
            captureDataUrl={captureDataUrl}
            onBack={() => setStep("review")}
            onComplete={() => setStep("complete")}
          />
        )}
        {step === "complete" && analysis && (
          <Complete copy={copy} analysis={analysis} onRestart={reset} />
        )}
      </div>
    </main>
  );
}

function Welcome({ copy, onStart }: { copy: Copy; onStart: () => void }) {
  return (
    <section className="m-welcome">
      <MicroLabel>{copy.welcome.eyebrow}</MicroLabel>
      <h1 className="kinetic">
        <span className="line">
          <span>{copy.welcome.titleLine1}</span>
        </span>
        <span className="line">
          <span>{copy.welcome.titleLine2}</span>
        </span>
        <span className="line">
          <span>{copy.welcome.highlight}.</span>
        </span>
      </h1>
      <p className="m-lede">{copy.welcome.lede}</p>
      <div>
        <Button variant="primary" size="lg" iconRight={<span aria-hidden="true">→</span>} onClick={onStart}>
          {copy.welcome.start}
        </Button>
      </div>
      <div className="m-trust">
        {copy.welcome.trust.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
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
    <section className="m-panel">
      <MicroLabel>{copy.consent.step}</MicroLabel>
      <h2>{copy.consent.title}</h2>
      <p className="m-intro">{copy.consent.intro}</p>
      <div className="m-consent-cards">
        {copy.consent.cards.map(([title, text], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="m-checks">
        <Checkbox checked={cameraConsent} onChange={setCameraConsent}>
          {copy.consent.cameraConsent}
        </Checkbox>
        <Checkbox checked={processingConsent} onChange={setProcessingConsent}>
          {copy.consent.processingConsent}
        </Checkbox>
      </div>
      <div className="m-actions">
        <Button variant="text" onClick={onBack}>
          {copy.common.back}
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!cameraConsent || !processingConsent}
          iconRight={<span aria-hidden="true">→</span>}
          onClick={onContinue}
        >
          {copy.consent.continue}
        </Button>
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
    <section className="m-panel">
      <MicroLabel>{copy.profile.step}</MicroLabel>
      <h2>{copy.profile.title}</h2>
      <p className="m-intro">{copy.profile.intro}</p>
      <div className="m-form">
        <label>
          <span className="fl">{copy.profile.height}</span>
          <NumberField
            value={value.height_cm}
            onChange={(height_cm) => onChange({ ...value, height_cm })}
            unit="cm"
            min={100}
            max={230}
          />
        </label>
        <label>
          <span className="fl">{copy.profile.weight}</span>
          <NumberField
            value={value.weight_kg}
            onChange={(weight_kg) => onChange({ ...value, weight_kg })}
            unit="kg"
            min={25}
            max={250}
          />
        </label>
      </div>
      <div className="fl2">{copy.profile.gender}</div>
      <SegmentedControl
        size="lg"
        value={value.gender_presentation}
        onChange={(gender) =>
          onChange({ ...value, gender_presentation: gender as ManualProfile["gender_presentation"] })
        }
        options={[
          { value: "female", label: copy.profile.genderOptions.female },
          { value: "male", label: copy.profile.genderOptions.male },
          { value: "neutral", label: copy.profile.genderOptions.neutral }
        ]}
      />
      <div className="fl2">{copy.profile.age}</div>
      <SegmentedControl
        size="lg"
        value={value.age_range}
        onChange={(age_range) =>
          onChange({ ...value, age_range: age_range as ManualProfile["age_range"] })
        }
        options={["18-25", "26-35", "36-45", "46+"]}
      />
      <div className="m-actions">
        <Button variant="text" onClick={onBack}>
          {copy.common.back}
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!valid}
          iconRight={<span aria-hidden="true">→</span>}
          onClick={onContinue}
        >
          {copy.profile.continue}
        </Button>
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
  const { videoRef, modelState, cameraError, assessment, progress, countdown, capture } =
    useCameraCapture({ messages: copy.pose, onCaptured });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <section className="m-capture">
      <MicroLabel>{copy.capture.step}</MicroLabel>
      <h2>{copy.capture.title}</h2>
      <div className="cam">
        <video ref={videoRef} playsInline muted />
        <div className={`guide ${assessment.ready ? "ready" : ""}`}>
          <span className="c tl" />
          <span className="c tr" />
          <span className="c bl" />
          <span className="c br" />
          <div className="head-guide" />
          <div className="body-guide" />
        </div>
        {countdown !== null && countdown > 0 && (
          <div className="countdown" aria-live="assertive">
            {countdown}
          </div>
        )}
        {cameraError && <div className="cam-error">{cameraError}</div>}
        <div className="cam-status">
          <span className={assessment.ready ? "sl ready" : "sl"} />
          {modelState === "loading" ? copy.capture.loading : assessment.message}
        </div>
        <div className="stability-meter">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="m-capture-body">
        <div className="capture-tips">
          <p className="capture-tips-title" style={{ gridColumn: "1 / -1" }}>
            {copy.capture.tipsTitle}
          </p>
          <ul>
            {copy.capture.tips.map(([title, text]) => (
              <li key={title}>
                <span>{title}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="auto-note">
          <strong>{modelState === "ready" ? copy.capture.autoReady : copy.capture.manualReady}</strong>
          {copy.capture.autoNote}
        </div>
        <Button variant="ghost" size="lg" block onClick={capture}>
          {copy.capture.manualCapture}
        </Button>
        <div className="upload-box">
          <div>
            <strong>{copy.capture.uploadTitle}</strong>
            <p>{copy.capture.uploadText}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="md"
            block
            onClick={() => fileInputRef.current?.click()}
          >
            {copy.capture.uploadButton}
          </Button>
        </div>
      </div>

      <div className="m-actions">
        <Button variant="text" onClick={onBack}>
          {copy.capture.back}
        </Button>
      </div>
    </section>
  );
}

function Analyzing({
  copy,
  captureDataUrl,
  isAnalyzing,
  onBack,
  onStart
}: {
  copy: Copy;
  captureDataUrl: string | null;
  isAnalyzing: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(0);
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      setProgress(Math.min(94, Math.round(8 + elapsedSeconds * 1.15)));
    }, 800);

    return () => window.clearInterval(interval);
  }, [isAnalyzing]);

  return (
    <section className="m-analyzing">
      <TryOnStage
        phase={isAnalyzing ? "reveal" : "idle"}
        badge={copy.analyzing.progressLabel}
        labelJa="解析中"
        labelEn={copy.analyzing.step}
      >
        {captureDataUrl ? (
          <div className="scan-fig">
            <img src={captureDataUrl} alt={copy.analyzing.alt} />
          </div>
        ) : (
          <div className="afig">
            <div className="afig-head" />
            <div className="afig-body" />
          </div>
        )}
      </TryOnStage>

      <div className="analysis-copy">
        <MicroLabel>{copy.analyzing.step}</MicroLabel>
        <h2>{copy.analyzing.title}</h2>
        <div className="analysis-progress">
          <div>
            <span>{copy.analyzing.progressLabel}</span>
            <strong>{isAnalyzing ? `${progress}%` : "0%"}</strong>
          </div>
          <i>
            <b style={{ width: `${isAnalyzing ? progress : 0}%` }} />
          </i>
          <p>{copy.analyzing.waitNote}</p>
        </div>
        <div className="analysis-steps">
          {copy.analyzing.steps.map((stepLabel, index) => (
            <span
              className={isAnalyzing ? (index === 0 ? "done" : index === 1 ? "active" : "") : ""}
              key={stepLabel}
            >
              {stepLabel}
            </span>
          ))}
        </div>
        <p className="m-note">{copy.analyzing.note}</p>
        <div className="m-actions">
          <Button variant="text" disabled={isAnalyzing} onClick={onBack}>
            {copy.common.back}
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!captureDataUrl || isAnalyzing}
            iconRight={<span aria-hidden="true">→</span>}
            onClick={onStart}
          >
            {isAnalyzing ? copy.analyzing.step : copy.analyzing.start}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Review({
  copy,
  analysis,
  captureDataUrl,
  onRetake,
  onConfirm
}: {
  copy: Copy;
  analysis: AnalysisHandoff;
  captureDataUrl: string | null;
  onRetake: () => void;
  onConfirm: () => void;
}) {
  const body = analysis.body_profile;
  const outfit = analysis.outfit_profile;
  const boardEntries = getUniqueOutfitItems(outfit.items);

  return (
    <section className="m-review">
      <MicroLabel>{copy.review.step}</MicroLabel>
      <h2>{copy.review.title}</h2>

      <div className="review-grid">
        <TryOnStage phase="reveal" badge={copy.review.centerLook}>
          {captureDataUrl ? (
            <div className="scan-fig">
              <img src={captureDataUrl} alt={copy.review.photoAlt} />
            </div>
          ) : (
            <div className="afig">
              <div className="afig-head" />
              <div className="afig-body" />
            </div>
          )}
        </TryOnStage>

        <div className="ootd-side">
          <div className="ootd-facts">
            <div>
              <MicroLabel>{copy.review.visiblePieces}</MicroLabel>
              <strong>{boardEntries.length}</strong>
            </div>
            <div>
              <MicroLabel>{copy.review.styleSignals}</MicroLabel>
              <strong>{formatTokenList(outfit.overall_style)}</strong>
            </div>
          </div>

          {outfit.dominant_colors.length > 0 && (
            <div className="ootd-colors" aria-label={copy.review.dominantColors}>
              <MicroLabel>{copy.review.dominantColors}</MicroLabel>
              <div>
                {outfit.dominant_colors.map((color) => (
                  <i
                    aria-label={formatToken(color.name)}
                    key={`${color.name}-${color.hex ?? "unknown"}`}
                    style={{ background: color.hex ?? "#d8d8d2" }}
                    title={`${formatToken(color.name)} ${Math.round(color.coverage * 100)}%`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="ootd-items">
            {boardEntries.length > 0 ? (
              boardEntries.map((item, position) => (
                <BoardItem copy={copy} item={item} key={`${item.item_id}-${position}`} position={position} />
              ))
            ) : (
              <p className="empty-board-note">{copy.review.noVisibleItems}</p>
            )}
          </div>
        </div>
      </div>

      <div className="review-section-head">
        <h3>{copy.review.bodyProfileTitle}</h3>
        <p>{copy.review.bodyProfileIntro}</p>
      </div>
      <div className="body-facts-grid">
        <section>
          <h4>{copy.review.manualTitle}</h4>
          <div className="profile-facts">
            <ProfileFact label={copy.review.height} value={`${body.height_cm} cm`} />
            <ProfileFact label={copy.review.weight} value={`${body.weight_kg} kg`} />
            <ProfileFact label={copy.review.gender} value={formatToken(body.gender_presentation)} />
            <ProfileFact label={copy.review.age} value={body.age_range} />
          </div>
        </section>
        <section>
          <h4>{copy.review.bodyProfileTitle}</h4>
          <div className="profile-facts">
            <ProfileFact label={copy.review.bodyShape} value={formatToken(body.body_shape)} />
            <ProfileFact label={copy.review.bodySize} value={formatToken(body.body_size)} />
            <ProfileFact label={copy.review.skinTone} value={formatToken(body.skin_tone)} />
          </div>
        </section>
        <section>
          <h4>{copy.review.proportionsTitle}</h4>
          <div className="profile-facts">
            <ProfileFact
              label={copy.review.shoulderWidth}
              value={formatToken(body.proportions.shoulder_width)}
            />
            <ProfileFact
              label={copy.review.waistDefinition}
              value={formatToken(body.proportions.waist_definition)}
            />
            <ProfileFact label={copy.review.hipWidth} value={formatToken(body.proportions.hip_width)} />
            <ProfileFact label={copy.review.legToTorso} value={formatToken(body.proportions.leg_to_torso)} />
          </div>
        </section>
      </div>

      <div className="privacy-panel">
        <MicroLabel>{copy.review.measurementsTitle}</MicroLabel>
        <div className="measure-facts">
          <ProfileFact
            label={copy.review.shoulder}
            value={formatMeasurement(undefined, copy.review.unavailable)}
          />
          <ProfileFact
            label={copy.review.inseam}
            value={formatMeasurement(undefined, copy.review.unavailable)}
          />
          <ProfileFact
            label={copy.review.bust}
            value={formatMeasurement(undefined, copy.review.unavailable)}
          />
          <ProfileFact
            label={copy.review.waist}
            value={formatMeasurement(undefined, copy.review.unavailable)}
          />
          <ProfileFact
            label={copy.review.hip}
            value={formatMeasurement(undefined, copy.review.unavailable)}
          />
          <ProfileFact
            label={copy.review.footLength}
            value={formatMeasurement(undefined, copy.review.unavailable)}
          />
        </div>
        <PrivacyChip>{copy.privacyChip}</PrivacyChip>
      </div>

      {body.extraction.analysis_warnings.length > 0 && (
        <div className="profile-warnings">
          <h4>{copy.review.warningsTitle}</h4>
          {body.extraction.analysis_warnings.map((warning) => (
            <p key={`${warning.code}-${warning.message}`}>
              <strong>{formatToken(warning.code)}</strong>
              {warning.message}
            </p>
          ))}
        </div>
      )}

      <div className="review-note">
        <span>i</span>
        {copy.review.note}
      </div>

      <div className="m-actions">
        <Button variant="ghost" size="lg" onClick={onRetake}>
          {copy.review.retake}
        </Button>
        <Button
          variant="primary"
          size="lg"
          iconRight={<span aria-hidden="true">→</span>}
          onClick={onConfirm}
        >
          {copy.review.confirm}
        </Button>
      </div>
    </section>
  );
}

function BoardItem({
  copy,
  item,
  position
}: {
  copy: Copy;
  item: OutfitItem;
  position: number;
}) {
  return (
    <div className="ootd-item">
      <span className="board-item-number">{String(position + 1).padStart(2, "0")}</span>
      <div className="ootd-item-image">
        <ProductItemImage item={item} />
      </div>
      <div className="ootd-item-body">
        <strong>{formatToken(item.subcategory)}</strong>
        <dl>
          <div>
            <dt>{copy.review.itemColor}</dt>
            <dd>{formatTokenList(item.colors.map((color) => color.name))}</dd>
          </div>
          <div>
            <dt>{copy.review.itemMaterial}</dt>
            <dd>{formatItemMaterial(item)}</dd>
          </div>
          <div>
            <dt>{copy.review.itemStyle}</dt>
            <dd>{formatTokenList([item.fit, ...item.style_tags].filter(Boolean) as string[])}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function ProductItemImage({ item }: { item: OutfitItem }) {
  const imageUrl = item.product_image_data_url;

  if (imageUrl) {
    return <img src={imageUrl} alt={formatToken(item.subcategory)} />;
  }

  return null;
}

function formatToken(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "unknown";
}

function formatTokenList(values: string[]) {
  return values.length > 0 ? values.map(formatToken).join(" · ") : "unknown";
}

function formatItemMaterial(item: OutfitItem) {
  const parts = [
    ...item.material_appearance,
    item.pattern !== "unknown" ? item.pattern : null
  ].filter(Boolean) as string[];
  return parts.length > 0 ? formatTokenList(parts) : "material unknown";
}

function formatMeasurement(_value: null | undefined, unavailableLabel: string) {
  return unavailableLabel;
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getUniqueOutfitItems(items: OutfitItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => item.visible && item.product_image_data_url).filter((item) => {
    const key = getOutfitItemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getOutfitItemKey(item: OutfitItem) {
  const region = item.region;
  return [
    item.category,
    item.subcategory,
    item.layer,
    region.anchor,
    Math.round(region.x * 8),
    Math.round(region.y * 8),
    Math.round(region.width * 8),
    Math.round(region.height * 8)
  ].join("|");
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
    <section className="m-complete">
      <div className="mark">✓</div>
      <MicroLabel>{copy.complete.eyebrow}</MicroLabel>
      <h2>{copy.complete.title}</h2>
      <p className="m-intro">
        {copy.complete.body} <code>{analysis.analysis_id}</code>
      </p>
      <div className="m-summary">
        <div>
          <MicroLabel>{copy.complete.bodyContract}</MicroLabel>
          <span className="mono">v{analysis.body_profile.schema_version}</span>
        </div>
        <div>
          <MicroLabel>{copy.complete.outfitContract}</MicroLabel>
          <span className="mono">v{analysis.outfit_profile.schema_version}</span>
        </div>
        <div>
          <MicroLabel>{copy.complete.detectedItems}</MicroLabel>
          <span className="mono">{analysis.outfit_profile.items.length}</span>
        </div>
      </div>
      <div className="m-actions">
        <Button variant="ghost" size="lg" onClick={() => setShowJson((value) => !value)}>
          {showJson ? copy.complete.hideJson : copy.complete.showJson}
        </Button>
        <Button variant="primary" size="lg" onClick={onRestart}>
          {copy.complete.restart}
        </Button>
      </div>
      {showJson && <pre className="json-preview">{JSON.stringify(analysis, null, 2)}</pre>}
    </section>
  );
}

export default App;
