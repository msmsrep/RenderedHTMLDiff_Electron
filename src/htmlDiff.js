const fs = require("fs");
const cheerio = require("cheerio");
const { diffChars } = require("diff");

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

//  2つのHTMLファイルを比較し、差分をハイライトしたHTMLを生成する
//  処理の流れ
//  HTMLを読み込む
//  cheerioでパース
//  テキストノードを抽出
//  全テキストを連結して一つの文字列にする
//  diffCharsで文字単位の差分を計算
//  newHTMLをベースにして、テキストノードへ差分を埋め込む
//  削除部分は赤背景＋取り消し線、追加部分は緑背景で表示
function buildDiffHtml(oldPath, newPath) {
  const oldHtml = fs.readFileSync(oldPath, "utf8");
  const newHtml = fs.readFileSync(newPath, "utf8");

  const $old = cheerio.load(oldHtml, { decodeEntities: false });
  const $new = cheerio.load(newHtml, { decodeEntities: false });

  const oldNodes = collectTextNodes($old);
  const newNodes = collectTextNodes($new);

  const oldFull = oldNodes.map((n) => n.data).join("");
  const newFull = newNodes.map((n) => n.data).join("");

  // diffCharsで文字単位の差分を取得
  // -1: 削除、0: 同じ、1: 追加
  const diffs = diffChars(oldFull, newFull)
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
        frag.push(
          `<span style="background:#fbb6b6;text-decoration:line-through;">${escapeHtml(delChunk)}</span>`,
        );
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
        frag.push(
          `<span style="background:#d4fcbc;">${escapeHtml(piece)}</span>`,
        );
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
        frag.push(
          `<span style="background:#fbb6b6;text-decoration:line-through;">${escapeHtml(delChunk)}</span>`,
        );
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
        `<span style="background:#fbb6b6;text-decoration:line-through;">${escapeHtml(text.slice(diffPos))}</span>`,
      );
      advanceDiff();
      continue;
    }

    break;
  }

  return $new.html();
}

module.exports = {
  buildDiffHtml,
};
