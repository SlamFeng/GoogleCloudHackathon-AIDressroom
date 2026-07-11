// Per-language copy for the magic-mirror styling screen. Everything the
// customer reads or hears on StylingScreen comes from here — including the
// synthetic voice lines sent to the backend NLU (feedbackVoice) and the
// "just pick for me" default utterance. zh strings are byte-identical to the
// original hardcoded ones.

export type Language = "en" | "zh" | "ja";

export type StylingCopy = {
  /** "Just pick for me" utterance sent to the backend. */
  defaultCustomerNeed: string;
  // Fixed spoken lines — prefetched for TTS on mount.
  lineLooksReady: string;
  lineOnYou: string;
  lineRestyled: string;
  lineReserved: string;
  /** Spoken when the customer smiles at their try-on reflection. */
  lineCompliment: string;
  /** Rec-type → short label shown on the look strip. */
  recLabel: Record<string, string>;
  /** Outfit slot → label (matches RecProduct.category / OutfitSlotName). */
  slotLabel: Record<string, string>;
  slotFallback: string;
  /** Synthetic utterances sent to the backend NLU for the feedback chips. */
  feedbackVoice: Record<"color" | "fit" | "style" | "price" | "overall", string>;
  // Pet bubbles & acknowledgements.
  petGreeting: string;
  ackEcho: (echo: string) => string;
  ackPlain: string;
  petAdjusting: string;
  petSwapping: (label: string) => string;
  petSwapped: (label: string) => string;
  petListening: string;
  petTryon: string;
  // ToolStep ("thinking") labels.
  toolsRecommend: string[];
  toolsFeedback: string[];
  toolsSwap: (label: string) => string[];
  // Conversation-context chip (top-right).
  contextAria: string;
  contextLabel: string;
  // Try-on placeholder window.
  tryonApplying: string;
  tryonGenerating: string;
  tryonWait: string;
  tryonBackToLooks: string;
  tryonChoose: string;
  // Checkout (dark-glass settlement card).
  checkoutReserved: string;
  checkoutTitle: string;
  checkoutTotal: string;
  checkoutNote: string;
  checkoutDone: string;
  // Voice panel.
  voiceTitleAdjust: string;
  voiceTitleIdle: string;
  voiceHintListening: string;
  voiceHintIdle: string;
  voiceSkip: string;
  // Look strip hints.
  lookHintGesture: string;
  lookHintTouch: string;
  // Mirror chrome.
  back: string;
  cameraOn: string;
  cameraDenied: string;
  cameraError: string;
  gestureHintHand: string;
  gestureHintNoHand: string;
  // Confirm summary.
  yourPick: string;
  confirmTotal: string;
  confirmReserve: string;
};

export const STYLING_COPY: Record<Language, StylingCopy> = {
  zh: {
    defaultCustomerNeed: "没什么想法，请根据我当前穿搭推荐三套适合我的衣服。",
    lineLooksReady: "给你搭好了三套，都是现货。选一套试穿吧。",
    lineOnYou: "看看你穿上的样子。",
    lineRestyled: "换了一版，选一套试穿。",
    lineReserved: "已预留，给你送到试衣间。",
    lineCompliment: "哎呀，你好像很开心！看来这套很适合你～",
    recLabel: {
      explicit_need: "你的需求",
      similar: "同款风格",
      style: "造型推荐",
      seasonal: "当季精选"
    },
    slotLabel: {
      outerwear: "外套",
      top: "上衣",
      bottom: "下装",
      dress: "连衣裙",
      shoes: "鞋子",
      accessory: "配饰"
    },
    slotFallback: "单品",
    feedbackVoice: {
      color: "颜色不喜欢，避开这个颜色。",
      fit: "版型太宽松了，换更利落一点。",
      style: "这套太正式了，换休闲一点。",
      price: "价格有点高，换预算更低的。",
      overall: "都不喜欢，换一组。"
    },
    petGreeting: "你好呀～跟我说说你想去的场合或想要的风格！",
    ackEcho: (echo) => `啊，${echo}是吗？正在为你挑选合适的搭配…`,
    ackPlain: "好的，正在为你挑选合适的搭配…",
    petAdjusting: "明白，我再调整一下…",
    petSwapping: (label) => `好的，其余保留，我给你换一件${label}…`,
    petSwapped: (label) => `换好啦，这件${label}更配～其余保持不变。`,
    petListening: "我在听，请说～",
    petTryon: "来，看看你穿上这套的样子～",
    toolsRecommend: [
      "正在听取你的需求…",
      "🔎 正在用 Google 搜索当季流行…",
      "匹配店内现货…",
      "为你搭配三套…"
    ],
    toolsFeedback: ["更新你的偏好…", "重新检查现货…", "调整搭配…"],
    toolsSwap: (label) => ["记下你的偏好…", `重新挑一件${label}…`, "保留其余搭配…"],
    contextAria: "对话上下文",
    contextLabel: "刚才你说",
    tryonApplying: "正在把这套穿到你身上…",
    tryonGenerating: "正在生成试穿效果…",
    tryonWait: "你正看着实时镜面，稍等就能看到自己穿上的样子。",
    tryonBackToLooks: "返回搭配",
    tryonChoose: "就选这套",
    checkoutReserved: "已预留",
    checkoutTitle: "这套帮你留好了",
    checkoutTotal: "合计",
    checkoutNote: "已送到你的试衣间，试好直接带走即可。",
    checkoutDone: "完成",
    voiceTitleAdjust: "想调整什么？说给我听～",
    voiceTitleIdle: "想找点什么？和我说说～",
    voiceHintListening: "我在听，说完点一下发送～",
    voiceHintIdle: "点麦克风，或做手势说话",
    voiceSkip: "帮我直接挑 →",
    lookHintGesture: "1·2·3 切换 · 👍 试穿 · ✊ 返回",
    lookHintTouch: "点数字切换套装",
    back: "← 返回",
    cameraOn: "摄像头已开启 · 不保存任何画面",
    cameraDenied: "开启摄像头才能在镜子里看到自己。",
    cameraError: "此设备无法使用摄像头。",
    gestureHintHand: "伸 1 · 2 · 3 根手指选一套 · 👍 选定 · ✋ 返回",
    gestureHintNoHand: "伸出 1、2 或 3 根手指选一套",
    yourPick: "你的选择",
    confirmTotal: "合计",
    confirmReserve: "预留并试穿"
  },
  en: {
    defaultCustomerNeed:
      "I don't have anything specific in mind — please recommend three outfits that suit what I'm wearing now.",
    lineLooksReady: "I've put together three looks for you, all in stock. Pick one to try on.",
    lineOnYou: "Take a look at yourself wearing it.",
    lineRestyled: "Here's a fresh take — pick one to try on.",
    lineReserved: "Reserved — I'll have it sent to your fitting room.",
    lineCompliment: "Oh, you look happy! I think this one really suits you.",
    recLabel: {
      explicit_need: "Your request",
      similar: "Similar style",
      style: "Stylist's pick",
      seasonal: "Season's picks"
    },
    slotLabel: {
      outerwear: "jacket",
      top: "top",
      bottom: "bottoms",
      dress: "dress",
      shoes: "shoes",
      accessory: "accessory"
    },
    slotFallback: "piece",
    feedbackVoice: {
      color: "I don't like the color, avoid this color.",
      fit: "The fit is too loose, make it sharper.",
      style: "This is too formal, make it more casual.",
      price: "The price is a bit high, show me more affordable options.",
      overall: "I don't like any of these, show me a new set."
    },
    petGreeting: "Hi there! Tell me where you're headed or the style you're after!",
    ackEcho: (echo) => `Ah, ${echo}? Picking the right looks for you…`,
    ackPlain: "Got it — picking the right looks for you…",
    petAdjusting: "Got it, let me tweak that…",
    petSwapping: (label) => `Sure — I'll keep the rest and just swap the ${label}…`,
    petSwapped: (label) => `Done! The new ${label} fits the look even better — everything else stays.`,
    petListening: "I'm listening — go ahead!",
    petTryon: "Here you go — see how this look fits you!",
    toolsRecommend: [
      "Listening to your request…",
      "🔎 Searching Google for what's trending…",
      "Matching in-store stock…",
      "Styling three looks for you…"
    ],
    toolsFeedback: ["Updating your preferences…", "Re-checking stock…", "Adjusting the looks…"],
    toolsSwap: (label) => ["Noting your preference…", `Swapping the ${label}…`, "Keeping the rest of the look…"],
    contextAria: "Conversation context",
    contextLabel: "You said",
    tryonApplying: "Putting this look on you…",
    tryonGenerating: "Generating your try-on…",
    tryonWait: "You're looking at the live mirror — you'll see yourself wearing it in a moment.",
    tryonBackToLooks: "Back to looks",
    tryonChoose: "Choose this",
    checkoutReserved: "Reserved",
    checkoutTitle: "This look is saved for you",
    checkoutTotal: "Total",
    checkoutNote: "It's on its way to your fitting room — try it on and take it home.",
    checkoutDone: "Done",
    voiceTitleAdjust: "What would you like to change? Just say it!",
    voiceTitleIdle: "What are you looking for? Tell me!",
    voiceHintListening: "I'm listening — tap again to send.",
    voiceHintIdle: "Tap the mic, or raise your hand to talk",
    voiceSkip: "Just pick for me →",
    lookHintGesture: "1·2·3 to switch · 👍 try on · ✊ back",
    lookHintTouch: "Tap a number to switch looks",
    back: "← Back",
    cameraOn: "Camera on · nothing is saved",
    cameraDenied: "Enable the camera to see yourself in the mirror.",
    cameraError: "Camera unavailable on this device.",
    gestureHintHand: "Hold up 1 · 2 · 3 to pick a look · 👍 choose · ✋ back",
    gestureHintNoHand: "Raise 1, 2 or 3 fingers to pick a look",
    yourPick: "Your pick",
    confirmTotal: "Total",
    confirmReserve: "Reserve & try on"
  },
  ja: {
    defaultCustomerNeed: "特にこだわりはないので、今の服装に合うコーデを3セットおすすめしてください。",
    lineLooksReady: "3セット揃えました。全部在庫ありです。1つ選んで試着してみて。",
    lineOnYou: "着た姿を見てみて。",
    lineRestyled: "新しく組み直しました。1つ選んで試着してみて。",
    lineReserved: "お取り置きしました。試着室にお届けします。",
    lineCompliment: "あら、嬉しそう！この服、すごく似合ってるよ〜",
    recLabel: {
      explicit_need: "あなたのリクエスト",
      similar: "似ているスタイル",
      style: "スタイル提案",
      seasonal: "今季のおすすめ"
    },
    slotLabel: {
      outerwear: "アウター",
      top: "トップス",
      bottom: "ボトムス",
      dress: "ワンピース",
      shoes: "シューズ",
      accessory: "小物"
    },
    slotFallback: "アイテム",
    feedbackVoice: {
      color: "色が好みじゃないので、この色は避けてください。",
      fit: "シルエットがゆるすぎるので、もっとすっきりしたものに。",
      style: "フォーマルすぎるので、もっとカジュアルに。",
      price: "少し高いので、もっと手頃なものに。",
      overall: "どれも好みじゃないので、別のセットにしてください。"
    },
    petGreeting: "こんにちは〜！行きたい場所や好きなスタイルを教えてね！",
    ackEcho: (echo) => `${echo}ですね！ぴったりのコーデを選んでいます…`,
    ackPlain: "了解！ぴったりのコーデを選んでいます…",
    petAdjusting: "了解、ちょっと調整するね…",
    petSwapping: (label) => `了解、他はそのままで${label}だけ替えるね…`,
    petSwapped: (label) => `替えたよ！この${label}のほうが合ってる〜他はそのまま。`,
    petListening: "聞いてるよ、話してね〜",
    petTryon: "さあ、着た姿を見てみて〜",
    toolsRecommend: [
      "ご要望を聞いています…",
      "🔎 Google で今季のトレンドを検索中…",
      "店内在庫と照合中…",
      "3セットをコーディネート中…"
    ],
    toolsFeedback: ["好みを更新中…", "在庫を再確認中…", "コーデを調整中…"],
    toolsSwap: (label) => ["好みをメモ中…", `${label}を選び直し中…`, "他はそのままキープ…"],
    contextAria: "会話の履歴",
    contextLabel: "さっきの発言",
    tryonApplying: "この服をあなたに着せています…",
    tryonGenerating: "試着イメージを生成中…",
    tryonWait: "リアルタイムミラーです。もうすぐ着た姿が見られます。",
    tryonBackToLooks: "ルック一覧へ",
    tryonChoose: "これにする",
    checkoutReserved: "お取り置き済み",
    checkoutTitle: "このコーデ、キープしました",
    checkoutTotal: "合計",
    checkoutNote: "試着室にお届け済み。試して気に入ったらそのままどうぞ。",
    checkoutDone: "完了",
    voiceTitleAdjust: "どこを変えたい？教えてね〜",
    voiceTitleIdle: "何をお探し？話しかけてね〜",
    voiceHintListening: "聞いてるよ。話し終わったらタップして送信〜",
    voiceHintIdle: "マイクをタップ、またはジェスチャーで話してね",
    voiceSkip: "おまかせで選んで →",
    lookHintGesture: "1·2·3で切替 · 👍試着 · ✊戻る",
    lookHintTouch: "数字をタップして切替",
    back: "← 戻る",
    cameraOn: "カメラ作動中 · 映像は保存されません",
    cameraDenied: "カメラを許可すると鏡に映ります。",
    cameraError: "このデバイスではカメラを使用できません。",
    gestureHintHand: "指 1 · 2 · 3 本でルックを選択 · 👍 決定 · ✋ 戻る",
    gestureHintNoHand: "指を 1〜3 本立ててルックを選んでね",
    yourPick: "あなたの選択",
    confirmTotal: "合計",
    confirmReserve: "取り置きして試着"
  }
};
