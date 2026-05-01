const oldPathInput = document.getElementById("oldPath");
const newPathInput = document.getElementById("newPath");
const statusEl = document.getElementById("status");
const previewFrame = document.getElementById("previewFrame");
const previewPanel = document.querySelector(".preview");
const diffModeSelect = document.getElementById("diffMode");

const pickOldBtn = document.getElementById("pickOld");
const pickNewBtn = document.getElementById("pickNew");
const runDiffBtn = document.getElementById("runDiff");
const saveDiffBtn = document.getElementById("saveDiff");

let latestDiffHtml = "";
let previewObserver = null;
let previewPlaceholder = null;

const PREVIEW_MIN_HEIGHT = 480;
const PREVIEW_MAX_HEIGHT = 600;

function syncPreviewHeight() {
  const doc = previewFrame.contentDocument;
  if (!doc) {
    return;
  }

  const bodyHeight = doc.body ? doc.body.scrollHeight : 0;
  const rootHeight = doc.documentElement ? doc.documentElement.scrollHeight : 0;
  const nextHeight = Math.min(
    Math.max(Math.max(bodyHeight, rootHeight), PREVIEW_MIN_HEIGHT),
    PREVIEW_MAX_HEIGHT,
  );

  previewFrame.style.height = `${nextHeight}px`;
  if (previewPanel?.classList.contains("is-pinned") && previewPlaceholder) {
    previewPlaceholder.style.height = `${previewPanel.offsetHeight}px`;
  }
}

function updatePinnedGeometry() {
  if (!previewPanel || !previewPlaceholder) {
    return;
  }

  const rect = previewPlaceholder.getBoundingClientRect();
  previewPanel.style.left = `${rect.left}px`;
  previewPanel.style.width = `${rect.width}px`;
}

function pinPreview() {
  if (!previewPanel || previewPanel.classList.contains("is-pinned")) {
    return;
  }

  previewPlaceholder = document.createElement("div");
  previewPlaceholder.setAttribute("aria-hidden", "true");
  previewPlaceholder.style.height = `${previewPanel.offsetHeight}px`;
  previewPanel.insertAdjacentElement("afterend", previewPlaceholder);

  previewPanel.classList.add("is-pinned");
  updatePinnedGeometry();
}

function unpinPreview() {
  if (!previewPanel || !previewPanel.classList.contains("is-pinned")) {
    return;
  }

  previewPanel.classList.remove("is-pinned");
  previewPanel.style.left = "";
  previewPanel.style.width = "";

  if (previewPlaceholder) {
    previewPlaceholder.remove();
    previewPlaceholder = null;
  }
}

function updatePreviewPinState() {
  if (!previewPanel) {
    return;
  }

  if (previewPanel.classList.contains("is-pinned")) {
    if (
      previewPlaceholder &&
      previewPlaceholder.getBoundingClientRect().top > 0
    ) {
      unpinPreview();
      return;
    }

    updatePinnedGeometry();
    return;
  }

  if (previewPanel.getBoundingClientRect().top <= 0) {
    pinPreview();
  }
}

function observePreviewHeight() {
  if (previewObserver) {
    previewObserver.disconnect();
  }

  const doc = previewFrame.contentDocument;
  if (!doc || !doc.body) {
    return;
  }

  previewObserver = new ResizeObserver(() => {
    syncPreviewHeight();
  });

  previewObserver.observe(doc.body);
  if (doc.documentElement) {
    previewObserver.observe(doc.documentElement);
  }
}

previewFrame.addEventListener("load", () => {
  syncPreviewHeight();
  observePreviewHeight();

  // Recalculate once more after initial render/layout settles.
  requestAnimationFrame(syncPreviewHeight);
  requestAnimationFrame(updatePreviewPinState);
});

window.addEventListener("scroll", updatePreviewPinState, { passive: true });
window.addEventListener("resize", () => {
  syncPreviewHeight();
  updatePreviewPinState();
});

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#9f1239" : "#1f2937";
}

async function pickFile(targetInput) {
  const result = await window.api.pickHtmlFile();
  if (!result || result.canceled) {
    return;
  }

  targetInput.value = result.filePath;
  setStatus("File selected");
}

pickOldBtn.addEventListener("click", async () => {
  await pickFile(oldPathInput);
});

pickNewBtn.addEventListener("click", async () => {
  await pickFile(newPathInput);
});

async function generateAndPreviewDiff() {
  const oldPath = oldPathInput.value.trim();
  const newPath = newPathInput.value.trim();

  if (!oldPath || !newPath) {
    setStatus("Please select both old and new HTML files", true);
    return;
  }

  setStatus("Generating diff...");
  runDiffBtn.disabled = true;

  const mode = diffModeSelect ? diffModeSelect.value : "chars";

  try {
    const result = await window.api.generateDiff(oldPath, newPath, mode);
    if (!result.ok) {
      setStatus(`Failed to generate diff: ${result.error}`, true);
      return;
    }

    latestDiffHtml = result.diffHtml;
    previewFrame.srcdoc = result.diffHtml;
    saveDiffBtn.dataset.defaultPath = `${result.outputDir}\\${result.outputName}`;
    setStatus("Diff generated");
  } catch (error) {
    setStatus(`Failed to generate diff: ${String(error)}`, true);
  } finally {
    runDiffBtn.disabled = false;
  }
}

runDiffBtn.addEventListener("click", generateAndPreviewDiff);

if (diffModeSelect) {
  diffModeSelect.addEventListener("change", generateAndPreviewDiff);
}

saveDiffBtn.addEventListener("click", async () => {
  if (!latestDiffHtml) {
    setStatus("Please generate a diff first", true);
    return;
  }

  const defaultPath = saveDiffBtn.dataset.defaultPath || "diff_output.html";
  const result = await window.api.saveDiff(latestDiffHtml, defaultPath);

  if (result.error) {
    setStatus(`Failed to save: ${result.error}`, true);
    return;
  }

  if (result.canceled) {
    setStatus("Save canceled");
    return;
  }

  setStatus(`Saved: ${result.savedPath}`);
});
