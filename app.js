"use strict";

const STORAGE_KEY = "speedDialData";
const DB_NAME = "my-speed-dial-db";
const DB_VERSION = 2;
const ASSET_STORE = "assets";
const BOOKMARK_ICON_STORE = "bookmarkIcons";
const BACKGROUND_ASSET_KEY = "backgroundImage";
const MAX_BACKGROUND_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_BOOKMARK_ICON_UPLOAD_SIZE = 5 * 1024 * 1024;
const DEFAULT_BACKGROUND_URL = "";
const DEFAULT_SETTINGS = {
  tileSize: "medium",
  backgroundSource: "url",
  backgroundImageUrl: DEFAULT_BACKGROUND_URL,
  uploadedBackgroundName: "",
  uploadedBackgroundType: "",
  uploadedBackgroundSize: 0,
  openBookmarksInNewTab: false
};
const TILE_SIZES = new Set(["small", "medium", "large"]);
const TILE_SIZE_LABELS = {
  small: "Small",
  medium: "Medium",
  large: "Large"
};
const DEFAULT_GROUPS = ["Social", "Job", "Prog", "Etc"];
const DEFAULT_BOOKMARKS = [
  ["X", "https://x.com/"],
  ["Telegram", "https://web.telegram.org/"],
  ["HornyBox", "https://hornybox.ru/"],
  ["Pinterest", "https://www.pinterest.com/"],
  ["GogoAnime", "https://gogoanime3.co/"],
  ["RanobeHub", "https://ranobehub.org/"],
  ["YouTube", "https://www.youtube.com/"],
  ["Ameriya", "https://ameriya.carrd.co/#comm"],
  ["Discord", "https://discord.com/channels/@me"],
  ["WhatsApp", "https://web.whatsapp.com/"],
  ["Shikimori", "https://shikimori.one/"],
  ["Steam", "https://store.steampowered.com/"],
  ["Instagram", "https://www.instagram.com/"],
  ["VK", "https://vk.com/"],
  ["Flibusta", "https://flibusta.is/"],
  ["TikTok", "https://www.tiktok.com/"],
  ["Mangalib", "https://mangalib.me/"],
  ["Akasha", "https://akasha.cv/"],
  ["Gosuslugi", "https://www.gosuslugi.ru/"]
];

const state = {
  data: null,
  activeGroupId: "",
  searchQuery: "",
  editingGroupId: null,
  editingBookmarkId: null,
  draggedBookmarkId: null,
  backgroundObjectUrl: null,
  previewObjectUrl: null,
  bookmarkIconObjectUrls: new Map(),
  bookmarkIconDraft: null,
  bookmarkIconPendingBlob: null,
  bookmarkIconPreviewObjectUrl: null,
  bookmarkRenderVersion: 0
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  state.data = await loadData();
  state.activeGroupId = getInitialGroupId(state.data);
  await hydrateBookmarkIconAssets();
  render();
}

function cacheElements() {
  els.groupTabs = document.querySelector("#groupTabs");
  els.searchInput = document.querySelector("#searchInput");
  els.addGroupBtn = document.querySelector("#addGroupBtn");
  els.groupSettingsBtn = document.querySelector("#groupSettingsBtn");
  els.tileSizeDropdown = document.querySelector("#tileSizeDropdown");
  els.tileSizeToggle = document.querySelector("#tileSizeToggle");
  els.tileSizeValue = document.querySelector("#tileSizeValue");
  els.tileSizeOptions = document.querySelector("#tileSizeOptions");
  els.backgroundUrlInput = document.querySelector("#backgroundUrlInput");
  els.backgroundSourceUrlBtn = document.querySelector("#backgroundSourceUrlBtn");
  els.backgroundSourceUploadBtn = document.querySelector("#backgroundSourceUploadBtn");
  els.backgroundUrlPanel = document.querySelector("#backgroundUrlPanel");
  els.backgroundUploadPanel = document.querySelector("#backgroundUploadPanel");
  els.backgroundFileInput = document.querySelector("#backgroundFileInput");
  els.chooseBackgroundBtn = document.querySelector("#chooseBackgroundBtn");
  els.uploadedBackgroundName = document.querySelector("#uploadedBackgroundName");
  els.backgroundPreview = document.querySelector("#backgroundPreview");
  els.removeUploadedBackgroundBtn = document.querySelector("#removeUploadedBackgroundBtn");
  els.resetBackgroundBtn = document.querySelector("#resetBackgroundBtn");
  els.settingsBtn = document.querySelector("#settingsBtn");
  els.floatingTooltip = document.querySelector("#floatingTooltip");
  els.toast = document.querySelector("#toast");
  els.exportBtn = document.querySelector("#exportBtn");
  els.importBtn = document.querySelector("#importBtn");
  els.importFile = document.querySelector("#importFile");
  els.addBookmarkBtn = document.querySelector("#addBookmarkBtn");
  els.groupCount = document.querySelector("#groupCount");
  els.activeGroupTitle = document.querySelector("#activeGroupTitle");
  els.bookmarkGrid = document.querySelector("#bookmarkGrid");
  els.emptyState = document.querySelector("#emptyState");
  els.groupDialog = document.querySelector("#groupDialog");
  els.groupForm = document.querySelector("#groupForm");
  els.groupDialogTitle = document.querySelector("#groupDialogTitle");
  els.groupNameInput = document.querySelector("#groupNameInput");
  els.groupSettingsDialog = document.querySelector("#groupSettingsDialog");
  els.groupSettingsForm = document.querySelector("#groupSettingsForm");
  els.groupSettingsSubtitle = document.querySelector("#groupSettingsSubtitle");
  els.groupSettingsNameInput = document.querySelector("#groupSettingsNameInput");
  els.renameGroupConfirmBtn = document.querySelector("#renameGroupConfirmBtn");
  els.deleteGroupRequestBtn = document.querySelector("#deleteGroupRequestBtn");
  els.deleteGroupCancelBtn = document.querySelector("#deleteGroupCancelBtn");
  els.deleteGroupConfirmPanel = document.querySelector("#deleteGroupConfirmPanel");
  els.deleteGroupConfirmBtn = document.querySelector("#deleteGroupConfirmBtn");
  els.settingsDialog = document.querySelector("#settingsDialog");
  els.openInNewTabInput = document.querySelector("#openInNewTabInput");
  els.bookmarkDialog = document.querySelector("#bookmarkDialog");
  els.bookmarkForm = document.querySelector("#bookmarkForm");
  els.bookmarkDialogTitle = document.querySelector("#bookmarkDialogTitle");
  els.bookmarkTitleInput = document.querySelector("#bookmarkTitleInput");
  els.bookmarkUrlInput = document.querySelector("#bookmarkUrlInput");
  els.bookmarkIconPreview = document.querySelector("#bookmarkIconPreview");
  els.bookmarkIconUrlInput = document.querySelector("#bookmarkIconUrlInput");
  els.bookmarkIconFileInput = document.querySelector("#bookmarkIconFileInput");
  els.bookmarkIconFileName = document.querySelector("#bookmarkIconFileName");
  els.chooseBookmarkIconBtn = document.querySelector("#chooseBookmarkIconBtn");
  els.removeBookmarkIconBtn = document.querySelector("#removeBookmarkIconBtn");
  els.iconUrlPanel = document.querySelector("#iconUrlPanel");
  els.iconUploadPanel = document.querySelector("#iconUploadPanel");
  els.iconSourceButtons = document.querySelectorAll("[data-icon-source]");
  els.dialogs = document.querySelectorAll("dialog");
}

function bindEvents() {
  els.searchInput.addEventListener("input", handleSearch);
  els.addGroupBtn.addEventListener("click", openAddGroupDialog);
  els.groupSettingsBtn.addEventListener("click", openGroupSettingsDialog);
  els.tileSizeToggle.addEventListener("click", toggleTileSizeDropdown);
  els.tileSizeOptions.addEventListener("click", handleTileSizeOptionClick);
  document.addEventListener("click", closeTileSizeDropdownOnOutsideClick);
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("mouseover", handleTooltipShow);
  document.addEventListener("focusin", handleTooltipShow);
  document.addEventListener("mouseout", handleTooltipHide);
  document.addEventListener("focusout", handleTooltipHide);
  window.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);
  els.backgroundUrlInput.addEventListener("change", saveBackgroundUrl);
  els.backgroundUrlInput.addEventListener("input", previewBackgroundUrl);
  els.backgroundUrlInput.addEventListener("keydown", handleBackgroundInputKeydown);
  els.backgroundSourceUrlBtn.addEventListener("click", () => saveBackgroundSource("url"));
  els.backgroundSourceUploadBtn.addEventListener("click", () => saveBackgroundSource("upload"));
  els.chooseBackgroundBtn.addEventListener("click", () => els.backgroundFileInput.click());
  els.backgroundFileInput.addEventListener("change", handleBackgroundUpload);
  els.removeUploadedBackgroundBtn.addEventListener("click", removeUploadedBackground);
  els.resetBackgroundBtn.addEventListener("click", resetBackgroundToDefault);
  els.settingsBtn.addEventListener("click", openSettingsDialog);
  els.openInNewTabInput.addEventListener("change", saveOpenInNewTab);
  els.exportBtn.addEventListener("click", exportData);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importData);
  els.addBookmarkBtn.addEventListener("click", openAddBookmarkDialog);
  els.groupForm.addEventListener("submit", saveGroupFromDialog);
  els.groupSettingsForm.addEventListener("submit", preventDialogFormSubmit);
  els.renameGroupConfirmBtn.addEventListener("click", renameActiveGroupFromSettings);
  els.deleteGroupRequestBtn.addEventListener("click", showDeleteGroupConfirmation);
  els.deleteGroupCancelBtn.addEventListener("click", hideDeleteGroupConfirmation);
  els.deleteGroupConfirmBtn.addEventListener("click", deleteActiveGroupFromSettings);
  els.bookmarkForm.addEventListener("submit", saveBookmarkFromDialog);
  els.bookmarkTitleInput.addEventListener("input", updateBookmarkIconPreview);
  els.bookmarkUrlInput.addEventListener("input", updateBookmarkIconPreview);
  els.bookmarkIconUrlInput.addEventListener("input", handleBookmarkIconUrlInput);
  els.chooseBookmarkIconBtn.addEventListener("click", () => els.bookmarkIconFileInput.click());
  els.bookmarkIconFileInput.addEventListener("change", handleBookmarkIconUpload);
  els.removeBookmarkIconBtn.addEventListener("click", resetBookmarkIconDraft);
  els.iconSourceButtons.forEach((button) => {
    button.addEventListener("click", () => setBookmarkIconSource(button.dataset.iconSource));
  });

  document.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });

  els.dialogs.forEach((dialog) => {
    dialog.addEventListener("click", closeDialogOnBackdropClick);
  });
}

function createDefaultData() {
  const groups = DEFAULT_GROUPS.map((name) => ({
    id: createId("group"),
    name,
    bookmarks: name === "Social"
      ? DEFAULT_BOOKMARKS.map(([title, url]) => createBookmark(title, url))
      : []
  }));

  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    groups
  };
}

async function loadData() {
  let result = {};

  try {
    result = await chrome.storage.local.get(STORAGE_KEY);
  } catch (error) {
    showToast("Failed to load saved data.");
    console.error("Failed to load speed dial data.", error);
  }

  const savedData = result[STORAGE_KEY];

  if (isValidData(savedData)) {
    const normalizedData = normalizeData(savedData);
    await saveData(normalizedData, { silent: true });
    return normalizedData;
  }

  const defaultData = createDefaultData();
  await saveData(defaultData, { silent: true });
  return defaultData;
}

async function saveData(data = state.data, options = {}) {
  const sanitizedData = sanitizeStateBeforeSave(data);
  const validation = validateStateForStorage(sanitizedData);

  if (!validation.ok) {
    console.error("Refusing to save invalid speed dial state.", validation.errors);
    showToast("Failed to save changes. Storage data contains invalid runtime values.");
    return false;
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: sanitizedData });
    state.data = sanitizedData;
    return true;
  } catch (error) {
    console.error("Failed to save speed dial data.", error);

    if (!options.silent) {
      showToast("Failed to save changes. Storage quota may be exceeded.");
    }

    return false;
  }
}

function isValidData(data) {
  return Boolean(
    data &&
    Array.isArray(data.groups) &&
    data.groups.every((group) => (
      typeof group.id === "string" &&
      typeof group.name === "string" &&
      Array.isArray(group.bookmarks)
    ))
  );
}

function sanitizeStateBeforeSave(data) {
  const normalized = normalizeData(data);

  return {
    version: normalized.version,
    settings: normalizeSettings(normalized.settings),
    groups: normalized.groups.map((group) => ({
      id: String(group.id),
      name: String(group.name),
      bookmarks: group.bookmarks.map((bookmark) => ({
        id: String(bookmark.id),
        title: String(bookmark.title),
        url: String(bookmark.url),
        icon: normalizeBookmarkIcon(bookmark.icon)
      }))
    }))
  };
}

function validateStateForStorage(data) {
  const errors = [];
  const seen = new WeakSet();
  const json = JSON.stringify(data);
  const size = new Blob([json]).size;

  if (json.includes("data:image")) {
    errors.push("State contains data:image payload.");
  }

  if (json.includes("blob:")) {
    errors.push("State contains blob URL.");
  }

  if (size > 4 * 1024 * 1024) {
    errors.push(`State is too large for chrome.storage.local metadata: ${size} bytes.`);
  }

  walkStorageValue(data, (value, path) => {
    if (value instanceof Blob || value instanceof File) {
      errors.push(`State contains Blob/File at ${path}.`);
    }

    if (typeof value === "string" && value.length > 250000) {
      errors.push(`State contains an unusually large string at ${path}.`);
    }
  }, seen);

  if (errors.length) {
    console.error("Storage validation failed.", errors);
  }

  return {
    ok: errors.length === 0,
    errors,
    size
  };
}

function walkStorageValue(value, visitor, seen, path = "state") {
  visitor(value, path);

  if (!value || typeof value !== "object") {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  Object.entries(value).forEach(([key, child]) => {
    walkStorageValue(child, visitor, seen, `${path}.${key}`);
  });
}

function render() {
  ensureActiveGroup();
  applySettings();
  renderGroups();
  renderHeader();
  renderBookmarks();
}

function applySettings() {
  const settings = getSettings();

  document.body.classList.remove("tiles-small", "tiles-medium", "tiles-large");
  document.body.classList.add(`tiles-${settings.tileSize}`);
  updateTileSizeDropdown(settings.tileSize);
  updateBackgroundControls(settings);
  els.backgroundUrlInput.value = settings.backgroundImageUrl;
  els.openInNewTabInput.checked = settings.openBookmarksInNewTab;
  applyBackground();
}

function updateTileSizeDropdown(tileSize) {
  els.tileSizeValue.textContent = TILE_SIZE_LABELS[tileSize];

  els.tileSizeOptions.querySelectorAll("[data-tile-size]").forEach((option) => {
    const isSelected = option.dataset.tileSize === tileSize;
    option.classList.toggle("selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function updateBackgroundControls(settings) {
  const isUrl = settings.backgroundSource === "url";
  els.backgroundSourceUrlBtn.classList.toggle("active", isUrl);
  els.backgroundSourceUploadBtn.classList.toggle("active", !isUrl);
  els.backgroundSourceUrlBtn.setAttribute("aria-selected", String(isUrl));
  els.backgroundSourceUploadBtn.setAttribute("aria-selected", String(!isUrl));
  els.backgroundUrlPanel.hidden = !isUrl;
  els.backgroundUploadPanel.hidden = isUrl;
  els.uploadedBackgroundName.textContent = settings.uploadedBackgroundName || "No image selected";
  els.removeUploadedBackgroundBtn.disabled = !settings.uploadedBackgroundName;
}

async function applyBackground() {
  const settings = getSettings();

  if (settings.backgroundSource === "upload") {
    const asset = await getUploadedBackground();

    if (asset?.blob) {
      const backgroundUrl = URL.createObjectURL(asset.blob);
      const previewUrl = URL.createObjectURL(asset.blob);
      setBackgroundImage(backgroundUrl, { isObjectUrl: true });
      updateBackgroundPreview(previewUrl, { isObjectUrl: true });
      return;
    }

    if (settings.backgroundImageUrl) {
      setBackgroundImage(settings.backgroundImageUrl);
      updateBackgroundPreview("");
      return;
    }
  }

  if (settings.backgroundSource === "url" && settings.backgroundImageUrl) {
    setBackgroundImage(settings.backgroundImageUrl);
    updateBackgroundPreview("");
    return;
  }

  resetBackgroundImage();
  updateBackgroundPreview("");
}

function setBackgroundImage(value, options = {}) {
  if (state.backgroundObjectUrl && state.backgroundObjectUrl !== value) {
    URL.revokeObjectURL(state.backgroundObjectUrl);
    state.backgroundObjectUrl = null;
  }

  if (options.isObjectUrl) {
    state.backgroundObjectUrl = value;
  }

  const backgroundValue = `linear-gradient(rgba(5, 7, 12, 0.52), rgba(5, 7, 12, 0.78)), url("${cssUrlEscape(value)}")`;
  document.body.style.backgroundImage = backgroundValue;
}

function resetBackgroundImage() {
  if (state.backgroundObjectUrl) {
    URL.revokeObjectURL(state.backgroundObjectUrl);
    state.backgroundObjectUrl = null;
  }

  document.body.style.backgroundImage = "";
}

function updateBackgroundPreview(value, options = {}) {
  if (state.previewObjectUrl && state.previewObjectUrl !== value) {
    URL.revokeObjectURL(state.previewObjectUrl);
    state.previewObjectUrl = null;
  }

  if (!value) {
    els.backgroundPreview.hidden = true;
    els.backgroundPreview.style.backgroundImage = "";
    return;
  }

  if (options.isObjectUrl) {
    state.previewObjectUrl = value;
  }

  els.backgroundPreview.hidden = false;
  els.backgroundPreview.style.backgroundImage = `url("${cssUrlEscape(value)}")`;
}

function renderGroups() {
  els.groupTabs.replaceChildren();

  state.data.groups.forEach((group) => {
    const button = document.createElement("button");
    button.className = `group-tab${group.id === state.activeGroupId ? " active" : ""}`;
    button.type = "button";
    button.textContent = group.name;
    button.addEventListener("click", () => {
      state.activeGroupId = group.id;
      render();
    });
    els.groupTabs.append(button);
  });
}

function renderHeader() {
  const group = getActiveGroup();
  const visibleCount = getFilteredBookmarks(group).length;
  const totalCount = group.bookmarks.length;

  els.activeGroupTitle.textContent = group.name;
  els.groupCount.textContent = state.searchQuery
    ? `${visibleCount} of ${totalCount} bookmarks`
    : `${totalCount} bookmarks`;
}

function renderBookmarks() {
  const group = getActiveGroup();
  const bookmarks = getFilteredBookmarks(group);

  state.bookmarkRenderVersion += 1;
  const renderVersion = state.bookmarkRenderVersion;
  els.bookmarkGrid.replaceChildren();
  els.emptyState.hidden = bookmarks.length > 0;

  bookmarks.forEach((bookmark) => {
    els.bookmarkGrid.append(createBookmarkCard(bookmark, renderVersion));
  });
}

function revokeBookmarkIconObjectUrls() {
  state.bookmarkIconObjectUrls.forEach((objectUrl) => {
    URL.revokeObjectURL(objectUrl);
  });
  state.bookmarkIconObjectUrls.clear();
}

function revokeBookmarkIconObjectUrl(bookmarkId) {
  const objectUrl = state.bookmarkIconObjectUrls.get(bookmarkId);

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    state.bookmarkIconObjectUrls.delete(bookmarkId);
  }
}

async function hydrateBookmarkIconAssets() {
  revokeBookmarkIconObjectUrls();

  const bookmarks = getAllBookmarks();
  const uploadBookmarks = bookmarks.filter((bookmark) => (
    normalizeBookmarkIcon(bookmark.icon).type === "upload"
  ));

  await Promise.all(uploadBookmarks.map(async (bookmark) => {
    const asset = await getBookmarkIcon(bookmark.id);

    if (asset?.blob) {
      state.bookmarkIconObjectUrls.set(bookmark.id, URL.createObjectURL(asset.blob));
    }
  }));
}

function createBookmarkCard(bookmark, renderVersion) {
  const card = document.createElement("article");
  card.className = "bookmark-card";
  card.tabIndex = 0;
  card.role = "link";
  card.title = `Open ${bookmark.title}`;
  card.draggable = !state.searchQuery;
  card.dataset.bookmarkId = bookmark.id;
  card.addEventListener("click", () => openBookmark(bookmark.url));
  card.addEventListener("keydown", (event) => {
    if (event.target === card && event.key === "Enter") {
      openBookmark(bookmark.url);
    }
  });

  const main = document.createElement("div");
  main.className = "bookmark-main";

  const icon = document.createElement("div");
  icon.className = "bookmark-icon";

  const favicon = document.createElement("img");
  favicon.className = "bookmark-favicon";
  favicon.alt = "";
  favicon.loading = "lazy";

  const initials = document.createElement("span");
  initials.className = "bookmark-initials";
  initials.textContent = getInitials(bookmark.title);

  favicon.addEventListener("load", () => {
    icon.classList.add("has-favicon");
  });
  favicon.addEventListener("error", () => {
    if (favicon.dataset.fallbackSrc && favicon.src !== favicon.dataset.fallbackSrc) {
      favicon.src = favicon.dataset.fallbackSrc;
      favicon.dataset.fallbackSrc = "";
      return;
    }

    favicon.hidden = true;
    favicon.removeAttribute("src");
    icon.classList.remove("has-favicon");
  });
  renderBookmarkIcon(bookmark, favicon, icon, renderVersion);

  icon.append(favicon, initials);

  const title = document.createElement("div");
  title.className = "bookmark-title";
  title.textContent = bookmark.title;

  const actions = document.createElement("div");
  actions.className = "bookmark-actions";

  const editButton = createCardAction("edit", "Edit bookmark", (event) => {
    event.preventDefault();
    openEditBookmarkDialog(bookmark.id);
  });

  const deleteButton = createCardAction("delete", "Delete bookmark", async (event) => {
    event.preventDefault();
    await deleteBookmark(bookmark.id);
  });

  main.append(icon, title);
  actions.append(editButton, deleteButton);
  card.append(main, actions);
  bindDragEvents(card);

  return card;
}

function renderBookmarkIcon(bookmark, image, iconBox, renderVersion = state.bookmarkRenderVersion) {
  const icon = normalizeBookmarkIcon(bookmark.icon);
  iconBox.classList.remove("has-favicon");
  image.hidden = false;

  if (icon.type === "none") {
    image.removeAttribute("src");
    image.hidden = true;
    return;
  }

  if (icon.type === "url" && icon.value) {
    image.src = icon.value;
    return;
  }

  if (icon.type === "upload") {
    const objectUrl = state.bookmarkIconObjectUrls.get(bookmark.id);

    if (renderVersion === state.bookmarkRenderVersion && objectUrl) {
      image.src = objectUrl;
      return;
    }

    image.hidden = true;
    return;
  }

  image.dataset.fallbackSrc = getDomainFaviconUrl(bookmark.url);
  image.src = getFaviconUrl(bookmark.url);
}

function createCardAction(iconName, label, onClick) {
  const button = document.createElement("button");
  button.className = `card-action card-action-${iconName}`;
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;
  button.append(createIcon(iconName));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick(event);
  });
  return button;
}

function createIcon(iconName) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const paths = {
    edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
    delete: "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"
  };

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", paths[iconName]);
  svg.append(path);
  return svg;
}

function bindDragEvents(card) {
  card.addEventListener("dragstart", handleDragStart);
  card.addEventListener("dragover", handleDragOver);
  card.addEventListener("dragleave", handleDragLeave);
  card.addEventListener("drop", handleDrop);
  card.addEventListener("dragend", handleDragEnd);
}

function handleSearch(event) {
  state.searchQuery = event.target.value.trim().toLowerCase();
  renderHeader();
  renderBookmarks();
}

function toggleTileSizeDropdown(event) {
  event.stopPropagation();
  const isOpen = els.tileSizeDropdown.classList.toggle("open");
  els.tileSizeToggle.setAttribute("aria-expanded", String(isOpen));
}

async function handleTileSizeOptionClick(event) {
  const option = event.target.closest("[data-tile-size]");

  if (!option) {
    return;
  }

  const tileSize = option.dataset.tileSize;

  if (!TILE_SIZES.has(tileSize)) {
    return;
  }

  state.data.settings.tileSize = tileSize;
  await saveData();
  closeTileSizeDropdown();
  applySettings();
}

function closeTileSizeDropdownOnOutsideClick(event) {
  if (!els.tileSizeDropdown.contains(event.target)) {
    closeTileSizeDropdown();
  }
}

function closeTileSizeDropdown() {
  els.tileSizeDropdown.classList.remove("open");
  els.tileSizeToggle.setAttribute("aria-expanded", "false");
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") {
    closeTileSizeDropdown();
    closeOpenDialogs();
    hideTooltip();
  }
}

function closeOpenDialogs() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    dialog.close();
  });
}

function closeDialogOnBackdropClick(event) {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
  }
}

function handleTooltipShow(event) {
  const target = event.target.closest("[data-tooltip]");

  if (!target) {
    return;
  }

  showTooltip(target);
}

function handleTooltipHide(event) {
  const target = event.target.closest("[data-tooltip]");

  if (!target) {
    return;
  }

  hideTooltip();
}

function showTooltip(target) {
  const text = target.dataset.tooltip;

  if (!text) {
    return;
  }

  els.floatingTooltip.textContent = text;
  els.floatingTooltip.hidden = false;
  els.floatingTooltip.classList.remove("below");
  target.setAttribute("aria-describedby", "floatingTooltip");

  requestAnimationFrame(() => positionTooltip(target));
}

function hideTooltip() {
  document.querySelectorAll("[aria-describedby='floatingTooltip']").forEach((target) => {
    target.removeAttribute("aria-describedby");
  });
  els.floatingTooltip.hidden = true;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 4600);
}

function positionTooltip(target) {
  if (els.floatingTooltip.hidden) {
    return;
  }

  const margin = 10;
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = els.floatingTooltip.getBoundingClientRect();
  const preferredTop = targetRect.top - tooltipRect.height - margin;
  const shouldShowBelow = preferredTop < margin;
  const maxTop = window.innerHeight - tooltipRect.height - margin;
  const top = shouldShowBelow
    ? Math.min(targetRect.bottom + margin, maxTop)
    : preferredTop;
  const centeredLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  const maxLeft = window.innerWidth - tooltipRect.width - margin;
  const left = Math.min(
    Math.max(centeredLeft, margin),
    Math.max(maxLeft, margin)
  );

  els.floatingTooltip.classList.toggle("below", shouldShowBelow);
  els.floatingTooltip.style.left = `${left}px`;
  els.floatingTooltip.style.top = `${Math.min(Math.max(top, margin), Math.max(maxTop, margin))}px`;
}

async function saveBackgroundUrl() {
  state.data.settings.backgroundImageUrl = els.backgroundUrlInput.value.trim();
  state.data.settings.backgroundSource = "url";
  await saveData();
  applySettings();
}

async function previewBackgroundUrl() {
  state.data.settings.backgroundImageUrl = els.backgroundUrlInput.value.trim();
  state.data.settings.backgroundSource = "url";
  await saveData();
  applySettings();
}

async function saveBackgroundSource(source) {
  state.data.settings.backgroundSource = source;
  await saveData();
  applySettings();
}

async function handleBackgroundUpload(event) {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Choose an image file.");
    return;
  }

  if (file.size > MAX_BACKGROUND_UPLOAD_SIZE) {
    alert("Choose an image up to 10 MB.");
    return;
  }

  const blob = file.slice(0, file.size, file.type);
  await saveUploadedBackground({
    key: BACKGROUND_ASSET_KEY,
    blob,
    meta: {
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: new Date().toISOString()
    }
  });

  state.data.settings.backgroundSource = "upload";
  state.data.settings.uploadedBackgroundName = file.name;
  state.data.settings.uploadedBackgroundType = file.type;
  state.data.settings.uploadedBackgroundSize = file.size;
  await saveData();
  applySettings();
}

async function removeUploadedBackground() {
  await deleteUploadedBackground();
  state.data.settings.uploadedBackgroundName = "";
  state.data.settings.uploadedBackgroundType = "";
  state.data.settings.uploadedBackgroundSize = 0;

  if (state.data.settings.backgroundSource === "upload") {
    state.data.settings.backgroundSource = state.data.settings.backgroundImageUrl ? "url" : "url";
  }

  await saveData();
  applySettings();
}

async function resetBackgroundToDefault() {
  await deleteUploadedBackground();
  state.data.settings.backgroundSource = "url";
  state.data.settings.backgroundImageUrl = "";
  state.data.settings.uploadedBackgroundName = "";
  state.data.settings.uploadedBackgroundType = "";
  state.data.settings.uploadedBackgroundSize = 0;
  els.backgroundUrlInput.value = "";
  await saveData();
  applySettings();
}

async function saveOpenInNewTab(event) {
  state.data.settings.openBookmarksInNewTab = event.target.checked;
  await saveData();
}

function handleBackgroundInputKeydown(event) {
  if (event.key === "Enter") {
    event.currentTarget.blur();
  }
}

function openSettingsDialog() {
  const settings = getSettings();
  els.backgroundUrlInput.value = settings.backgroundImageUrl;
  els.openInNewTabInput.checked = settings.openBookmarksInNewTab;
  openDialog(els.settingsDialog, els.backgroundUrlInput);
}

function openAddGroupDialog() {
  closeOpenDialogs();
  state.editingGroupId = null;
  els.groupDialogTitle.textContent = "Add group";
  els.groupNameInput.value = "";
  openDialog(els.groupDialog, els.groupNameInput);
}

function openGroupSettingsDialog() {
  const group = getActiveGroup();
  els.groupSettingsSubtitle.textContent = group.name;
  els.groupSettingsNameInput.value = group.name;
  hideDeleteGroupConfirmation();
  updateDeleteGroupButtonState();
  openDialog(els.groupSettingsDialog, els.groupSettingsNameInput);
}

function preventDialogFormSubmit(event) {
  event.preventDefault();
}

async function renameActiveGroupFromSettings() {
  const group = getActiveGroup();
  const name = els.groupSettingsNameInput.value.trim();

  if (!name) {
    return;
  }

  group.name = name;
  els.groupSettingsSubtitle.textContent = name;
  if (await saveData()) {
    render();
  }
}

function updateDeleteGroupButtonState() {
  const isOnlyGroup = state.data.groups.length <= 1;
  els.deleteGroupRequestBtn.disabled = isOnlyGroup;
  els.deleteGroupConfirmBtn.disabled = isOnlyGroup;
}

function showDeleteGroupConfirmation() {
  if (state.data.groups.length <= 1) {
    return;
  }

  els.deleteGroupConfirmPanel.hidden = false;
  els.deleteGroupRequestBtn.hidden = true;
}

function hideDeleteGroupConfirmation() {
  els.deleteGroupConfirmPanel.hidden = true;
  els.deleteGroupRequestBtn.hidden = false;
}

async function deleteActiveGroupFromSettings() {
  if (state.data.groups.length <= 1) {
    return;
  }

  const group = getActiveGroup();
  await Promise.all(group.bookmarks
    .filter((bookmark) => normalizeBookmarkIcon(bookmark.icon).type === "upload")
    .map(async (bookmark) => {
      await deleteBookmarkIcon(bookmark.id);
      revokeBookmarkIconObjectUrl(bookmark.id);
    }));
  state.data.groups = state.data.groups.filter((item) => item.id !== group.id);
  state.activeGroupId = getInitialGroupId(state.data);
  if (await saveData()) {
    els.groupSettingsDialog.close();
    render();
  }
}

async function saveGroupFromDialog(event) {
  event.preventDefault();
  const name = els.groupNameInput.value.trim();

  if (!name) {
    return;
  }

  if (state.editingGroupId) {
    const group = getGroupById(state.editingGroupId);
    group.name = name;
  } else {
    const group = { id: createId("group"), name, bookmarks: [] };
    state.data.groups.push(group);
    state.activeGroupId = group.id;
  }

  if (await saveData()) {
    els.groupDialog.close();
    render();
  }
}

async function deleteActiveGroup() {
  if (state.data.groups.length <= 1) {
    alert("At least one group must remain.");
    return;
  }

  const group = getActiveGroup();
  const confirmed = confirm(`Delete group "${group.name}" and all its bookmarks?`);

  if (!confirmed) {
    return;
  }

  await Promise.all(group.bookmarks
    .filter((bookmark) => normalizeBookmarkIcon(bookmark.icon).type === "upload")
    .map(async (bookmark) => {
      await deleteBookmarkIcon(bookmark.id);
      revokeBookmarkIconObjectUrl(bookmark.id);
    }));
  state.data.groups = state.data.groups.filter((item) => item.id !== group.id);
  state.activeGroupId = getInitialGroupId(state.data);
  if (await saveData()) {
    render();
  }
}

function openAddBookmarkDialog() {
  state.editingBookmarkId = null;
  els.bookmarkDialogTitle.textContent = "Add bookmark";
  els.bookmarkTitleInput.value = "";
  els.bookmarkUrlInput.value = "";
  setBookmarkIconDraft({ type: "auto" });
  openDialog(els.bookmarkDialog, els.bookmarkTitleInput);
}

function openEditBookmarkDialog(bookmarkId) {
  const bookmark = getActiveGroup().bookmarks.find((item) => item.id === bookmarkId);

  if (!bookmark) {
    return;
  }

  state.editingBookmarkId = bookmarkId;
  els.bookmarkDialogTitle.textContent = "Edit bookmark";
  els.bookmarkTitleInput.value = bookmark.title;
  els.bookmarkUrlInput.value = bookmark.url;
  setBookmarkIconDraft(normalizeBookmarkIcon(bookmark.icon));
  openDialog(els.bookmarkDialog, els.bookmarkTitleInput);
}

function setBookmarkIconDraft(icon) {
  revokeBookmarkIconPreviewObjectUrl();
  state.bookmarkIconPendingBlob = null;
  state.bookmarkIconDraft = normalizeBookmarkIcon(icon);
  els.bookmarkIconUrlInput.value = state.bookmarkIconDraft.type === "url" ? state.bookmarkIconDraft.value || "" : "";
  els.bookmarkIconFileName.textContent = state.bookmarkIconDraft.fileName || "No image selected";
  updateBookmarkIconEditor();
  updateBookmarkIconPreview();
}

function setBookmarkIconSource(type) {
  state.bookmarkIconDraft = normalizeBookmarkIcon({
    ...state.bookmarkIconDraft,
    type,
    value: type === "url" ? state.bookmarkIconDraft?.value || "" : ""
  });

  if (type !== "upload") {
    state.bookmarkIconPendingBlob = null;
  }

  updateBookmarkIconEditor();
  updateBookmarkIconPreview();
}

function updateBookmarkIconEditor() {
  const icon = normalizeBookmarkIcon(state.bookmarkIconDraft);
  els.iconSourceButtons.forEach((button) => {
    const selected = button.dataset.iconSource === icon.type;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  els.iconUrlPanel.hidden = icon.type !== "url";
  els.iconUploadPanel.hidden = icon.type !== "upload";
  els.removeBookmarkIconBtn.disabled = icon.type === "auto";
}

function getSelectedBookmarkIconType() {
  const selectedButton = Array.from(els.iconSourceButtons).find((button) => (
    button.classList.contains("active") || button.getAttribute("aria-selected") === "true"
  ));
  return selectedButton?.dataset.iconSource || "auto";
}

function getBookmarkIconFromForm() {
  const type = getSelectedBookmarkIconType();

  if (type === "url") {
    return normalizeBookmarkIcon({
      type: "url",
      value: els.bookmarkIconUrlInput.value.trim()
    });
  }

  if (type === "upload") {
    if (!state.bookmarkIconPendingBlob && !state.bookmarkIconDraft?.fileName) {
      return { type: "auto" };
    }

    return normalizeBookmarkIcon({
      type: "upload",
      fileName: state.bookmarkIconDraft?.fileName || "",
      mimeType: state.bookmarkIconDraft?.mimeType || "",
      size: state.bookmarkIconDraft?.size || 0
    });
  }

  if (type === "none") {
    return { type: "none" };
  }

  return { type: "auto" };
}

function handleBookmarkIconUrlInput() {
  state.bookmarkIconDraft = normalizeBookmarkIcon({
    type: "url",
    value: els.bookmarkIconUrlInput.value.trim()
  });
  updateBookmarkIconEditor();
  updateBookmarkIconPreview();
}

async function handleBookmarkIconUpload(event) {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Choose an image file.");
    return;
  }

  if (file.size > MAX_BOOKMARK_ICON_UPLOAD_SIZE) {
    alert("Choose an image up to 5 MB.");
    return;
  }

  revokeBookmarkIconPreviewObjectUrl();
  const blob = file.slice(0, file.size, file.type);
  state.bookmarkIconPendingBlob = blob;
  state.bookmarkIconDraft = normalizeBookmarkIcon({
    type: "upload",
    fileName: file.name,
    mimeType: file.type,
    size: file.size
  });
  els.bookmarkIconFileName.textContent = file.name;
  updateBookmarkIconEditor();
  updateBookmarkIconPreview();
}

function resetBookmarkIconDraft() {
  setBookmarkIconDraft({ type: "auto" });
}

async function updateBookmarkIconPreview() {
  const icon = normalizeBookmarkIcon(state.bookmarkIconDraft);
  const title = els.bookmarkTitleInput.value || "Bookmark";
  const url = normalizeUrl(els.bookmarkUrlInput.value.trim());
  const initials = getInitials(title);

  revokeBookmarkIconPreviewObjectUrl();
  els.bookmarkIconPreview.textContent = initials;
  els.bookmarkIconPreview.classList.remove("has-image");
  els.bookmarkIconPreview.style.backgroundImage = "";

  if (icon.type === "none") {
    return;
  }

  if (icon.type === "url" && icon.value) {
    setBookmarkIconPreviewImage(icon.value);
    return;
  }

  if (icon.type === "upload") {
    if (state.bookmarkIconPendingBlob) {
      const objectUrl = URL.createObjectURL(state.bookmarkIconPendingBlob);
      state.bookmarkIconPreviewObjectUrl = objectUrl;
      setBookmarkIconPreviewImage(objectUrl);
      return;
    }

    if (state.editingBookmarkId) {
      const asset = await getBookmarkIcon(state.editingBookmarkId);

      if (asset?.blob) {
        const objectUrl = URL.createObjectURL(asset.blob);
        state.bookmarkIconPreviewObjectUrl = objectUrl;
        setBookmarkIconPreviewImage(objectUrl);
      }
    }
    return;
  }

  if (url) {
    setBookmarkIconPreviewImage(getFaviconUrl(url));
  }
}

function setBookmarkIconPreviewImage(src) {
  els.bookmarkIconPreview.textContent = "";
  els.bookmarkIconPreview.classList.add("has-image");
  els.bookmarkIconPreview.style.backgroundImage = `url("${cssUrlEscape(src)}")`;
}

function revokeBookmarkIconPreviewObjectUrl() {
  if (state.bookmarkIconPreviewObjectUrl) {
    URL.revokeObjectURL(state.bookmarkIconPreviewObjectUrl);
    state.bookmarkIconPreviewObjectUrl = null;
  }
}

async function syncBookmarkIconUpload(bookmarkId) {
  const icon = getBookmarkIconFromForm();

  if (icon.type === "upload" && state.bookmarkIconPendingBlob) {
    revokeBookmarkIconObjectUrl(bookmarkId);
    await saveBookmarkIcon(bookmarkId, state.bookmarkIconPendingBlob, {
      fileName: icon.fileName,
      mimeType: icon.mimeType,
      size: icon.size,
      updatedAt: new Date().toISOString()
    });
    state.bookmarkIconObjectUrls.set(bookmarkId, URL.createObjectURL(state.bookmarkIconPendingBlob));
    state.bookmarkIconPendingBlob = null;
    return;
  }

  if (icon.type !== "upload") {
    await deleteBookmarkIcon(bookmarkId);
    revokeBookmarkIconObjectUrl(bookmarkId);
    state.bookmarkIconPendingBlob = null;
  }
}

async function saveBookmarkFromDialog(event) {
  event.preventDefault();
  const title = els.bookmarkTitleInput.value.trim();
  const url = normalizeUrl(els.bookmarkUrlInput.value.trim());
  const icon = getBookmarkIconFromForm();

  if (!title || !url) {
    return;
  }

  const group = getActiveGroup();
  const hasPendingUpload = icon.type === "upload" && Boolean(state.bookmarkIconPendingBlob);
  let pendingUploadBookmarkId = null;

  if (state.editingBookmarkId) {
    const bookmark = group.bookmarks.find((item) => item.id === state.editingBookmarkId);
    bookmark.title = title;
    bookmark.url = url;
    bookmark.icon = icon;
    await syncBookmarkIconUpload(bookmark.id);
  } else {
    const bookmark = createBookmark(title, url);
    bookmark.icon = icon;
    group.bookmarks.push(bookmark);
    pendingUploadBookmarkId = hasPendingUpload ? bookmark.id : null;
    await syncBookmarkIconUpload(bookmark.id);
  }

  if (await saveData()) {
    els.bookmarkDialog.close();
    render();
  } else if (pendingUploadBookmarkId) {
    group.bookmarks = group.bookmarks.filter((bookmark) => bookmark.id !== pendingUploadBookmarkId);
    await deleteBookmarkIcon(pendingUploadBookmarkId);
    revokeBookmarkIconObjectUrl(pendingUploadBookmarkId);
  }
}

async function deleteBookmark(bookmarkId) {
  const group = getActiveGroup();
  const bookmark = group.bookmarks.find((item) => item.id === bookmarkId);

  if (!bookmark || !confirm(`Delete bookmark "${bookmark.title}"?`)) {
    return;
  }

  if (normalizeBookmarkIcon(bookmark.icon).type === "upload") {
    await deleteBookmarkIcon(bookmarkId);
    revokeBookmarkIconObjectUrl(bookmarkId);
  }

  group.bookmarks = group.bookmarks.filter((item) => item.id !== bookmarkId);
  if (await saveData()) {
    render();
  }
}

function handleDragStart(event) {
  if (state.searchQuery) {
    event.preventDefault();
    return;
  }

  state.draggedBookmarkId = event.currentTarget.dataset.bookmarkId;
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", state.draggedBookmarkId);
}

function handleDragOver(event) {
  if (!state.draggedBookmarkId || state.searchQuery) {
    return;
  }

  event.preventDefault();
  const target = event.currentTarget;
  const targetId = target.dataset.bookmarkId;

  if (targetId !== state.draggedBookmarkId) {
    target.classList.add("drop-target");
  }
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drop-target");
}

async function handleDrop(event) {
  event.preventDefault();
  const target = event.currentTarget;
  const targetId = target.dataset.bookmarkId;
  target.classList.remove("drop-target");

  if (!state.draggedBookmarkId || targetId === state.draggedBookmarkId) {
    return;
  }

  reorderBookmarks(state.draggedBookmarkId, targetId);
  await saveData();
  render();
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".drop-target").forEach((item) => item.classList.remove("drop-target"));
  state.draggedBookmarkId = null;
}

function reorderBookmarks(sourceId, targetId) {
  const bookmarks = getActiveGroup().bookmarks;
  const sourceIndex = bookmarks.findIndex((bookmark) => bookmark.id === sourceId);
  const targetIndex = bookmarks.findIndex((bookmark) => bookmark.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const [movedBookmark] = bookmarks.splice(sourceIndex, 1);
  bookmarks.splice(targetIndex, 0, movedBookmark);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "my-speed-dial.json";
  link.click();

  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    try {
      const importedData = normalizeImportedData(JSON.parse(reader.result));
      state.data = importedData;
      state.activeGroupId = getInitialGroupId(importedData);
      state.searchQuery = "";
      els.searchInput.value = "";
      await saveData();
      await hydrateBookmarkIconAssets();
      render();
    } catch (error) {
      alert("Import failed. Choose a valid speed dial JSON file.");
    }
  });
  reader.readAsText(file);
}

function normalizeImportedData(data) {
  if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
    throw new Error("Invalid import data");
  }

  return {
    version: 1,
    settings: normalizeSettings(data.settings),
    groups: data.groups.map((group) => ({
      id: typeof group.id === "string" ? group.id : createId("group"),
      name: String(group.name || "Untitled").trim() || "Untitled",
      bookmarks: Array.isArray(group.bookmarks)
        ? group.bookmarks.map((bookmark) => {
          const normalizedBookmark = createBookmark(
            String(bookmark.title || "Untitled").trim() || "Untitled",
            normalizeUrl(String(bookmark.url || "").trim())
          );
          normalizedBookmark.icon = normalizeBookmarkIcon(bookmark.icon);
          return normalizedBookmark;
        }).filter((bookmark) => bookmark.url)
        : []
    }))
  };
}

function normalizeData(data) {
  return {
    version: 1,
    settings: normalizeSettings(data.settings),
    groups: data.groups.map((group) => ({
      id: group.id,
      name: group.name,
      bookmarks: group.bookmarks.map((bookmark) => ({
        ...bookmark,
        icon: normalizeBookmarkIcon(bookmark.icon)
      }))
    }))
  };
}

function normalizeSettings(settings) {
  const tileSize = TILE_SIZES.has(settings?.tileSize) ? settings.tileSize : DEFAULT_SETTINGS.tileSize;
  const backgroundSource = settings?.backgroundSource === "upload" ? "upload" : "url";
  const rawBackgroundImageUrl = typeof settings?.backgroundImageUrl === "string"
    ? settings.backgroundImageUrl.trim()
    : DEFAULT_SETTINGS.backgroundImageUrl;
  const backgroundImageUrl = isForbiddenStoredUrl(rawBackgroundImageUrl) ? "" : rawBackgroundImageUrl;
  const legacyMeta = settings?.uploadedBackgroundMeta || {};
  const uploadedBackgroundName = typeof settings?.uploadedBackgroundName === "string"
    ? settings.uploadedBackgroundName
    : String(legacyMeta.name || DEFAULT_SETTINGS.uploadedBackgroundName);
  const uploadedBackgroundType = typeof settings?.uploadedBackgroundType === "string"
    ? settings.uploadedBackgroundType
    : String(legacyMeta.type || DEFAULT_SETTINGS.uploadedBackgroundType);
  const uploadedBackgroundSize = Number.isFinite(Number(settings?.uploadedBackgroundSize))
    ? Number(settings.uploadedBackgroundSize)
    : Number(legacyMeta.size || DEFAULT_SETTINGS.uploadedBackgroundSize);
  const openBookmarksInNewTab = typeof settings?.openBookmarksInNewTab === "boolean"
    ? settings.openBookmarksInNewTab
    : DEFAULT_SETTINGS.openBookmarksInNewTab;

  return {
    tileSize,
    backgroundSource,
    backgroundImageUrl,
    uploadedBackgroundName,
    uploadedBackgroundType,
    uploadedBackgroundSize,
    openBookmarksInNewTab
  };
}

function openAssetsDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(BOOKMARK_ICON_STORE)) {
        db.createObjectStore(BOOKMARK_ICON_STORE, { keyPath: "key" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function runAssetTransaction(mode, callback) {
  const db = await openAssetsDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, mode);
    const store = transaction.objectStore(ASSET_STORE);
    const request = callback(store);

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    transaction.addEventListener("complete", () => db.close());
    transaction.addEventListener("error", () => {
      db.close();
      reject(transaction.error);
    });
  });
}

async function runDbTransaction(storeName, mode, callback) {
  const db = await openAssetsDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    transaction.addEventListener("complete", () => db.close());
    transaction.addEventListener("error", () => {
      db.close();
      reject(transaction.error);
    });
  });
}

function saveUploadedBackground(asset) {
  return runAssetTransaction("readwrite", (store) => store.put(asset));
}

function getUploadedBackground() {
  return runAssetTransaction("readonly", (store) => store.get(BACKGROUND_ASSET_KEY));
}

function deleteUploadedBackground() {
  return runAssetTransaction("readwrite", (store) => store.delete(BACKGROUND_ASSET_KEY));
}

function saveBookmarkIcon(bookmarkId, blob, meta = {}) {
  return runDbTransaction(BOOKMARK_ICON_STORE, "readwrite", (store) => store.put({
    key: bookmarkId,
    blob,
    meta
  }));
}

function getBookmarkIcon(bookmarkId) {
  return runDbTransaction(BOOKMARK_ICON_STORE, "readonly", (store) => store.get(bookmarkId));
}

function deleteBookmarkIcon(bookmarkId) {
  return runDbTransaction(BOOKMARK_ICON_STORE, "readwrite", (store) => store.delete(bookmarkId));
}

function openDialog(dialog, focusElement) {
  dialog.showModal();
  requestAnimationFrame(() => {
    focusElement.focus();
    focusElement.select();
  });
}

function getInitialGroupId(data) {
  return data.groups[0]?.id || "";
}

function ensureActiveGroup() {
  if (!getGroupById(state.activeGroupId)) {
    state.activeGroupId = getInitialGroupId(state.data);
  }
}

function getActiveGroup() {
  return getGroupById(state.activeGroupId) || state.data.groups[0];
}

function getGroupById(groupId) {
  return state.data.groups.find((group) => group.id === groupId);
}

function getFilteredBookmarks(group) {
  if (!state.searchQuery) {
    return group.bookmarks;
  }

  return group.bookmarks.filter((bookmark) => {
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    return title.includes(state.searchQuery) || url.includes(state.searchQuery);
  });
}

function getAllBookmarks() {
  return state.data.groups.flatMap((group) => group.bookmarks);
}

function getSettings() {
  if (!state.data.settings) {
    state.data.settings = { ...DEFAULT_SETTINGS };
  }

  state.data.settings = normalizeSettings(state.data.settings);
  return state.data.settings;
}

function createBookmark(title, url) {
  return {
    id: createId("bookmark"),
    title,
    url,
    icon: { type: "auto" }
  };
}

function normalizeBookmarkIcon(icon) {
  const type = ["auto", "url", "upload", "none"].includes(icon?.type) ? icon.type : "auto";
  const normalized = { type };

  if (type === "url") {
    const value = typeof icon?.value === "string" ? icon.value.trim() : "";

    if (isForbiddenStoredUrl(value)) {
      return { type: "auto" };
    }

    normalized.value = value;
  }

  if (type === "upload") {
    normalized.fileName = String(icon?.fileName || "");
    normalized.mimeType = String(icon?.mimeType || "");
    normalized.size = Number(icon?.size || 0);
  }

  return normalized;
}

function isForbiddenStoredUrl(value) {
  return /^data:image/i.test(value) || /^blob:/i.test(value);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeUrl(value) {
  if (!value) {
    return "";
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function openBookmark(url) {
  if (getSettings().openBookmarksInNewTab) {
    window.open(url, "_blank", "noopener");
    return;
  }

  window.location.assign(url);
}

function getFaviconUrl(url) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`;
}

function getDomainFaviconUrl(url) {
  let domainUrl = url;

  try {
    domainUrl = new URL(url).origin;
  } catch (error) {
    domainUrl = url;
  }

  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainUrl)}&sz=128`;
}

function cssUrlEscape(value) {
  return value.replace(/["\\]/g, "\\$&");
}

function getInitials(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
