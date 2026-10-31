import assert from "node:assert/strict";
import test from "node:test";
import { paginateParagraphs, correspondingPage } from "../src/pagination.mjs";

test("Chinese and English pagination preserves all text without omissions", () => {
  const paragraphs = ["从柴湾出发，经过北角。今天也可以停下来读一页。", "The next stop is North Point. A little light remains in the shop."];
  const pages = paginateParagraphs(paragraphs, (text) => Array.from(text).length <= 17);
  paragraphs.forEach((paragraph, index) => {
    assert.equal(pages.filter((page) => page.paragraph === index).map((page) => page.text).join(""), paragraph);
  });
  assert.ok(pages.every((page) => Array.from(page.text).length <= 17));
});

test("pages retain paragraph boundaries and never split a Unicode code point", () => {
  const paragraphs = ["A 🚙 drives right.", "金钟 · Admiralty"];
  const pages = paginateParagraphs(paragraphs, (text) => Array.from(text).length <= 3);
  assert.equal(pages.filter((page) => page.paragraph === 0).map((page) => page.text).join(""), paragraphs[0]);
  assert.equal(pages.filter((page) => page.paragraph === 1).map((page) => page.text).join(""), paragraphs[1]);
  assert.ok(pages.every((page) => !/[\uD800-\uDBFF]$/.test(page.text)));
});

test("narrow capacity still advances and does not create empty pages", () => {
  const pages = paginateParagraphs(["abcdef"], () => false);
  assert.equal(pages.length, 6);
  assert.equal(pages.map((page) => page.text).join(""), "abcdef");
});

test("language change retains the paragraph and approximate reading position", () => {
  const previous = ["一二三四五六七八九十", "甲乙丙丁戊己庚辛壬癸"];
  const next = ["One two three four five.", "A B C D E F G H I J K L M N O P Q R S T"];
  const pages = paginateParagraphs(next, (text) => text.length <= 9);
  const index = correspondingPage(pages, next, { paragraph: 1, start: 5, end: 9 }, previous);
  assert.equal(pages[index].paragraph, 1);
  assert.ok(pages[index].start <= Array.from(next[1]).length / 2);
  assert.ok(pages[index].end > Array.from(next[1]).length / 2);
});
