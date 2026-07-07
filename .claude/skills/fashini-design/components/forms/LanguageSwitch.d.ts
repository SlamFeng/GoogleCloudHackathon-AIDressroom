import * as React from "react";

export type LangCode = "en" | "zh" | "ja";

/**
 * Trilingual language switch (EN / 中文 / 日本語). Active fills ink.
 */
export interface LanguageSwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: LangCode;
  onChange?: (code: LangCode) => void;
  /** Override the language list. */
  langs?: Array<{ code: string; label: string }>;
}

export function LanguageSwitch(props: LanguageSwitchProps): React.ReactElement;
