const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { diffChars, diffWords, diffLines } = require("diff");

// diff操作の種別定数
const OP_REMOVED = -1;
const OP_SAME = 0;
const OP_ADDED = 1;

// HTMLエスケープ（XSS対策）
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// HTML内の「テキストノード」だけを収集する処。
// script / style / noscript 内のテキストは除外
// HTML構造は無視して、純粋に表示テキストだけを比較するために使う
function collectTextNodes($) {
  const nodes = [];
  $("*")
    .contents()
    .each((_, el) => {
      if (el.type !== "text") {
        return;
      }

      const parent =
        el.parent && el.parent.tagName ? el.parent.tagName.toLowerCase() : "";
      if (["script", "style", "noscript"].includes(parent)) {
        return;
      }

      nodes.push(el);
    });

  return nodes;
}

// PDFからページ順にテキストを抽出する
// pdf.js のテキストアイテムを連結し、行末（hasEOL）で改行を入れる
async function extractPdfText(filePath) {
  const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
  const data = new Uint8Array(await fs.promises.readFile(filePath));
  const doc = await pdfjsLib.getDocument({
    data,
    // 非埋め込みフォント解決用（テキスト抽出時の警告抑止）
    standardFontDataUrl: path.join(
      path.dirname(require.resolve("pdfjs-dist/package.json")),
      "standard_fonts/",
    ),
    verbosity: pdfjsLib.VerbosityLevel.ERRORS,
  }).promise;

  try {
    const pages = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      let text = "";
      for (const item of content.items) {
        text += item.str;
        if (item.hasEOL) {
          text += "\n";
        }
      }

      pages.push(text);
      page.cleanup();
    }

    return pages.join("\n");
  } finally {
    await doc.destroy();
  }
}

function isPdfPath(filePath) {
  return path.extname(filePath).toLowerCase() === ".pdf";
}

// 入力ファイルを読み込み、比較用テキストと（HTMLの場合は）cheerioドキュメントを返す
async function loadSource(filePath) {
  if (isPdfPath(filePath)) {
    const text = await extractPdfText(filePath);
    return { kind: "pdf", text };
  }

  const html = await fs.promises.readFile(filePath, "utf8");
  const $ = cheerio.load(html);
  const nodes = collectTextNodes($);
  return { kind: "html", $, nodes, text: nodes.map((n) => n.data).join("") };
}

// 新ファイルがPDFの場合、HTML構造がないため
// 抽出テキストをそのまま並べたスタンドアロンHTMLとして差分を描画する
function renderPlainDiffHtml(diffs) {
  const body = diffs
    .map(([op, value]) => {
      if (op === OP_REMOVED) {
        return `<span class="diff-removed">${escapeHtml(value)}</span>`;
      }

      if (op === OP_ADDED) {
        return `<span class="diff-added">${escapeHtml(value)}</span>`;
      }

      return escapeHtml(value);
    })
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: system-ui, sans-serif; margin: 16px; }
.pdf-diff { white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.7; }
.diff-added   { background: #d4fcbc; }
.diff-removed { background: #fbb6b6; text-decoration: line-through; }
</style>
</head>
<body><div class="pdf-diff">${body}</div></body>
</html>`;
}

//  2つのファイル（HTML / PDF）を比較し、差分をハイライトしたHTMLを生成する
//  mode: 'chars'（文字）| 'words'（単語）| 'lines'（行）
//  処理の流れ
//  ファイルを読み込む（HTMLはcheerioでテキストノード抽出、PDFはpdf.jsでテキスト抽出）
//  全テキストを連結して一つの文字列にする
//  指定モードの diff 関数で差分を計算
//  新ファイルがHTMLならそのHTMLをベースにテキストノードへ差分を埋め込む
//  新ファイルがPDFなら抽出テキストベースのHTMLとして差分を描画する
//  削除部分は赤背景＋取り消し線、追加部分は緑背景で表示
async function buildDiffHtml(oldPath, newPath, mode) {
  const [oldSource, newSource] = await Promise.all([
    loadSource(oldPath),
    loadSource(newPath),
  ]);

  const oldFull = oldSource.text;
  const newFull = newSource.text;

  // 指定モードで差分を取得
  // -1: 削除、0: 同じ、1: 追加
  const diffFn =
    mode === "words" ? diffWords : mode === "lines" ? diffLines : diffChars;
  const diffs = diffFn(oldFull, newFull)
    .map((part) => {
      if (part.removed) {
        return [OP_REMOVED, part.value];
      }

      if (part.added) {
        return [OP_ADDED, part.value];
      }

      return [OP_SAME, part.value];
    })
    .filter(([, value]) => value.length > 0);

  // 新ファイルがPDFの場合は、埋め込み先のHTML構造がないので
  // 抽出テキストベースのスタンドアロンHTMLとして描画する
  if (newSource.kind === "pdf") {
    return renderPlainDiffHtml(diffs);
  }

  const $new = newSource.$;
  const newNodes = newSource.nodes;

  let diffIndex = 0;
  let diffPos = 0;

  const currentDiff = () => diffs[diffIndex] || null;
  const advanceDiff = () => {
    diffIndex += 1;
    diffPos = 0;
  };

  for (const node of newNodes) {
    const text = node.data || "";
    let i = 0;
    const frag = [];

    while (i < text.length) {
      const cd = currentDiff();
      if (!cd) {
        frag.push(text.slice(i));
        i = text.length;
        break;
      }

      const [op, chunkText] = cd;
      const remainingInDiff = chunkText.length - diffPos;

      if (remainingInDiff <= 0) {
        advanceDiff();
        continue;
      }

      if (op === OP_REMOVED) {
        const delChunk = chunkText.slice(diffPos, diffPos + remainingInDiff);
        frag.push(`<span class="diff-removed">${escapeHtml(delChunk)}</span>`);
        diffPos += remainingInDiff;
        advanceDiff();
        continue;
      }

      if (op === OP_SAME) {
        const take = Math.min(remainingInDiff, text.length - i);
        const piece = chunkText.slice(diffPos, diffPos + take);
        frag.push(escapeHtml(piece));
        i += take;
        diffPos += take;

        if (diffPos >= chunkText.length) {
          advanceDiff();
        }

        continue;
      }

      if (op === OP_ADDED) {
        const take = Math.min(remainingInDiff, text.length - i);
        const piece = chunkText.slice(diffPos, diffPos + take);
        frag.push(`<span class="diff-added">${escapeHtml(piece)}</span>`);
        i += take;
        diffPos += take;

        if (diffPos >= chunkText.length) {
          advanceDiff();
        }
      }
    }

    while (true) {
      const cd2 = currentDiff();
      if (!cd2) {
        break;
      }

      const [op2, chunk2] = cd2;
      const remaining2 = chunk2.length - diffPos;
      if (remaining2 <= 0) {
        advanceDiff();
        continue;
      }

      if (op2 === OP_REMOVED) {
        const delChunk = chunk2.slice(diffPos, diffPos + remaining2);
        frag.push(`<span class="diff-removed">${escapeHtml(delChunk)}</span>`);
        diffPos += remaining2;
        advanceDiff();
        continue;
      }

      break;
    }

    $new(node).replaceWith(frag.join(""));
  }

  while (true) {
    const cd = currentDiff();
    if (!cd) {
      break;
    }

    const [op, text] = cd;
    const remaining = text.length - diffPos;

    if (remaining <= 0) {
      advanceDiff();
      continue;
    }

    if (op === OP_REMOVED) {
      $new("body").append(
        `<span class="diff-removed">${escapeHtml(text.slice(diffPos))}</span>`,
      );
      advanceDiff();
      continue;
    }

    // OP_ADDED / OP_SAME がノード処理後に残った場合（通常は発生しない）
    console.warn(
      `[htmlDiff] unexpected trailing diff op=${op} at index=${diffIndex}, pos=${diffPos}`,
    );
    break;
  }

  // diff用スタイルを <head> に注入（インラインスタイルの代わりにクラスを使用）
  $new("head").append(`<style>
.diff-added   { background: #d4fcbc; }
.diff-removed { background: #fbb6b6; text-decoration: line-through; }
</style>`);

  return $new.html();
}

module.exports = {
  buildDiffHtml,
};
