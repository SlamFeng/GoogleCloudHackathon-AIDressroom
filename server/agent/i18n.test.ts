import { strict as assert } from "node:assert";
import { test } from "node:test";
import { detectLanguage } from "./i18n.js";

// Script-based utterance language detection — drives the auto language switch
// on the chat endpoint (reply in whatever language the customer speaks).

test("detectLanguage: kana wins even when kanji is present", () => {
  assert.equal(detectLanguage("結婚式に行くのでコーデをお願いします"), "ja");
  assert.equal(detectLanguage("カジュアルなジャケットがほしい"), "ja");
});

test("detectLanguage: han without kana reads as Chinese", () => {
  assert.equal(detectLanguage("明天要参加朋友的婚礼"), "zh");
  // Latin brand words inside a Chinese sentence stay Chinese.
  assert.equal(detectLanguage("我想要一件 oversize 的外套"), "zh");
});

test("detectLanguage: latin text reads as English", () => {
  assert.equal(detectLanguage("I need a jacket for a wedding"), "en");
  assert.equal(detectLanguage("something casual"), "en");
});

test("detectLanguage: too little signal returns null", () => {
  assert.equal(detectLanguage("OK"), null);
  assert.equal(detectLanguage("123"), null);
  assert.equal(detectLanguage("👍"), null);
});
