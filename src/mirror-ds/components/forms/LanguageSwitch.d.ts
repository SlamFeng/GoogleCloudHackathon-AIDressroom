import * as React from "react";

export interface LangOption { code: string; label: string; }

/**
 * Trilingual language switch (EN / 中文 / 日本語) as a glass pill. The demo
 * runs in Chinese, so `zh` is the default.
 */
export interface LanguageSwitchProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  onChange?: (code: string) => void;
  langs?: LangOption[];
}

export function LanguageSwitch(props: LanguageSwitchProps): React.ReactElement;
