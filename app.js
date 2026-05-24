"use strict";

const STORAGE_KEY = "speedDialData";
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
  draggedBookmarkId: null
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  state.data = await loadData();
  state.activeGroupId = getInitialGroupId(state.data);
  render();
}

function cacheElements() {
  els.groupTabs = document.querySelector("#groupTabs");
  els.searchInput = document.querySelector("#searchInput");
  els.addGroupBtn = document.querySelector("#addGroupBtn");
  els.renameGroupBtn = document.querySelector("#renameGroupBtn");
  els.deleteGroupBtn = document.querySelector("#deleteGroupBtn");
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
  els.bookmarkDialog = document.querySelector("#bookmarkDialog");
  els.bookmarkForm = document.querySelector("#bookmarkForm");
  els.bookmarkDialogTitle = document.querySelector("#bookmarkDialogTitle");
  els.bookmarkTitleInput = document.querySelector("#bookmarkTitleInput");
  els.bookmarkUrlInput = document.querySelector("#bookmarkUrlInput");
}

function bindEvents() {
  els.searchInput.addEventListener("input", handleSearch);
  els.addGroupBtn.addEventListener("click", openAddGroupDialog);
  els.renameGroupBtn.addEventListener("click", openRenameGroupDialog);
  els.deleteGroupBtn.addEventListener("click", deleteActiveGroup);
  els.exportBtn.addEventListener("click", exportData);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importData);
  els.addBookmarkBtn.addEventListener("click", openAddBookmarkDialog);
  els.groupForm.addEventListener("submit", saveGroupFromDialog);
  els.bookmarkForm.addEventListener("submit", saveBookmarkFromDialog);

  document.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
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
    groups
  };
}

async function loadData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const savedData = result[STORAGE_KEY];

  if (isValidData(savedData)) {
    return savedData;
  }

  const defaultData = createDefaultData();
  await saveData(defaultData);
  return defaultData;
}

async function saveData(data = state.data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
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

function render() {
  ensureActiveGroup();
  renderGroups();
  renderHeader();
  renderBookmarks();
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

  els.bookmarkGrid.replaceChildren();
  els.emptyState.hidden = bookmarks.length > 0;

  bookmarks.forEach((bookmark) => {
    els.bookmarkGrid.append(createBookmarkCard(bookmark));
  });
}

function createBookmarkCard(bookmark) {
  const card = document.createElement("article");
  card.className = "bookmark-card";
  card.tabIndex = 0;
  card.role = "link";
  card.title = `Open ${bookmark.title}`;
  card.draggable = !state.searchQuery;
  card.dataset.bookmarkId = bookmark.id;
  card.addEventListener("click", () => openBookmark(bookmark.url));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      openBookmark(bookmark.url);
    }
  });

  const main = document.createElement("div");
  main.className = "bookmark-main";

  const icon = document.createElement("div");
  icon.className = "bookmark-icon";
  icon.textContent = getInitials(bookmark.title);

  const title = document.createElement("div");
  title.className = "bookmark-title";
  title.textContent = bookmark.title;

  const url = document.createElement("div");
  url.className = "bookmark-url";
  url.textContent = bookmark.url;

  const actions = document.createElement("div");
  actions.className = "bookmark-actions";

  const editButton = createCardAction("E", "Edit bookmark", (event) => {
    event.preventDefault();
    openEditBookmarkDialog(bookmark.id);
  });

  const deleteButton = createCardAction("x", "Delete bookmark", async (event) => {
    event.preventDefault();
    await deleteBookmark(bookmark.id);
  });

  main.append(icon, title, url);
  actions.append(editButton, deleteButton);
  card.append(main, actions);
  bindDragEvents(card);

  return card;
}

function createCardAction(text, label, onClick) {
  const button = document.createElement("button");
  button.className = "card-action";
  button.type = "button";
  button.textContent = text;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick(event);
  });
  return button;
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

function openAddGroupDialog() {
  state.editingGroupId = null;
  els.groupDialogTitle.textContent = "Add group";
  els.groupNameInput.value = "";
  openDialog(els.groupDialog, els.groupNameInput);
}

function openRenameGroupDialog() {
  const group = getActiveGroup();
  state.editingGroupId = group.id;
  els.groupDialogTitle.textContent = "Rename group";
  els.groupNameInput.value = group.name;
  openDialog(els.groupDialog, els.groupNameInput);
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

  await saveData();
  els.groupDialog.close();
  render();
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

  state.data.groups = state.data.groups.filter((item) => item.id !== group.id);
  state.activeGroupId = getInitialGroupId(state.data);
  await saveData();
  render();
}

function openAddBookmarkDialog() {
  state.editingBookmarkId = null;
  els.bookmarkDialogTitle.textContent = "Add bookmark";
  els.bookmarkTitleInput.value = "";
  els.bookmarkUrlInput.value = "";
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
  openDialog(els.bookmarkDialog, els.bookmarkTitleInput);
}

async function saveBookmarkFromDialog(event) {
  event.preventDefault();
  const title = els.bookmarkTitleInput.value.trim();
  const url = normalizeUrl(els.bookmarkUrlInput.value.trim());

  if (!title || !url) {
    return;
  }

  const group = getActiveGroup();

  if (state.editingBookmarkId) {
    const bookmark = group.bookmarks.find((item) => item.id === state.editingBookmarkId);
    bookmark.title = title;
    bookmark.url = url;
  } else {
    group.bookmarks.push(createBookmark(title, url));
  }

  await saveData();
  els.bookmarkDialog.close();
  render();
}

async function deleteBookmark(bookmarkId) {
  const group = getActiveGroup();
  const bookmark = group.bookmarks.find((item) => item.id === bookmarkId);

  if (!bookmark || !confirm(`Delete bookmark "${bookmark.title}"?`)) {
    return;
  }

  group.bookmarks = group.bookmarks.filter((item) => item.id !== bookmarkId);
  await saveData();
  render();
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
    groups: data.groups.map((group) => ({
      id: typeof group.id === "string" ? group.id : createId("group"),
      name: String(group.name || "Untitled").trim() || "Untitled",
      bookmarks: Array.isArray(group.bookmarks)
        ? group.bookmarks.map((bookmark) => createBookmark(
          String(bookmark.title || "Untitled").trim() || "Untitled",
          normalizeUrl(String(bookmark.url || "").trim())
        )).filter((bookmark) => bookmark.url)
        : []
    }))
  };
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

function createBookmark(title, url) {
  return {
    id: createId("bookmark"),
    title,
    url
  };
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
  window.location.assign(url);
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
