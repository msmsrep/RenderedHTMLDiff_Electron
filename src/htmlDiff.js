const fs = require("fs");
const cheerio = require("cheerio");
const { diff_match_patch } = require("diff-match-patch");

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

function buildDiffHtml(oldPath, newPath) {
  const oldHtml = fs.readFileSync(oldPath, "utf8");
  const newHtml = fs.readFileSync(newPath, "utf8");

  const $old = cheerio.load(oldHtml, { decodeEntities: false });
  const $new = cheerio.load(newHtml, { decodeEntities: false });

  const oldNodes = collectTextNodes($old);
  const newNodes = collectTextNodes($new);

  const oldFull = oldNodes.map((n) => n.data).join("");
  const newFull = newNodes.map((n) => n.data).join("");

  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldFull, newFull);
  dmp.diff_cleanupSemantic(diffs);

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

      if (op === -1) {
        const delChunk = chunkText.slice(diffPos, diffPos + remainingInDiff);
        frag.push(
          `<span style=\"background:#fbb6b6;text-decoration:line-through;\">${delChunk}</span>`,
        );
        diffPos += remainingInDiff;
        advanceDiff();
        continue;
      }

      if (op === 0) {
        const take = Math.min(remainingInDiff, text.length - i);
        const piece = chunkText.slice(diffPos, diffPos + take);
        frag.push(piece);
        i += take;
        diffPos += take;

        if (diffPos >= chunkText.length) {
          advanceDiff();
        }

        continue;
      }

      if (op === 1) {
        const take = Math.min(remainingInDiff, text.length - i);
        const piece = chunkText.slice(diffPos, diffPos + take);
        frag.push(`<span style=\"background:#d4fcbc;\">${piece}</span>`);
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

      if (op2 === -1) {
        const delChunk = chunk2.slice(diffPos, diffPos + remaining2);
        frag.push(
          `<span style=\"background:#fbb6b6;text-decoration:line-through;\">${delChunk}</span>`,
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

    if (op === -1) {
      $new("body").append(
        `<span style=\"background:#fbb6b6;text-decoration:line-through;\">${text.slice(diffPos)}</span>`,
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
