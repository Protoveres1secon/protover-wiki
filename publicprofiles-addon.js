import { getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// =========================================================
// PROTOVERES • PUBLIC PROFILE / RANKING BRIDGE
// =========================================================
// Purpose:
// - Move community-visible profile/ranking data out of /users.
// - Keep email, banned, deleted, admin, and other sensitive fields
//   inside /users.
// - Let the main web keep its existing UI while rankings/search read
//   from /publicProfiles instead.
//
// IMPORTANT:
// Add Firestore Rules for /publicProfiles before enabling this file.
// Owner migration uses the fixed Proto UID below.

const OWNER_UID = "R1viMcXH00TXEzSYmMt61Ga02Ny1";
const MIGRATION_FLAG = "protoveres_public_profiles_migrated_v1";
const SYNC_INTERVAL_MS = 60_000;

const app = getApps().length ? getApp() : null;
if (!app) {
  throw new Error("publicprofiles-addon phải được tải sau Firebase app chính.");
}

const auth = getAuth(app);
const db = getFirestore(app);

const esc = (s) => String(s ?? "").replace(/[&<>\"]/g, (m) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
}[m]));

function initials(name) {
  return (String(name || "P").trim().charAt(0) || "P").toUpperCase();
}

function timestampMs(ts) {
  return ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0);
}

function publicFields(data = {}) {
  return {
    username: data.username || data.displayName || "Protoveres User",
    avatarURL: data.avatarURL || null,
    coverURL: data.coverURL || null,
    country: data.country || null,
    age: data.age ?? null,
    googlePhotoURL: data.googlePhotoURL || null,
    createdAt: data.createdAt || null,
    loginCount: Number(data.loginCount || 0),
    updatedAt: serverTimestamp()
  };
}

async function getPrivateProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function syncOwnPublicProfile(uid) {
  const profile = await getPrivateProfile(uid);
  if (!profile) return;

  await setDoc(
    doc(db, "publicProfiles", uid),
    publicFields(profile),
    { merge: true }
  );
}

async function migrateAllPublicProfiles() {
  const user = auth.currentUser;
  if (!user || user.uid !== OWNER_UID) return;

  if (localStorage.getItem(MIGRATION_FLAG) === "1") return;

  const snap = await getDocs(collection(db, "users"));

  for (const d of snap.docs) {
    await setDoc(
      doc(db, "publicProfiles", d.id),
      publicFields(d.data() || {}),
      { merge: true }
    );
  }

  localStorage.setItem(MIGRATION_FLAG, "1");
  console.log(`✅ Protoveres publicProfiles migration complete: ${snap.size} users`);
}

async function sendFriendRequest(targetUid) {
  const user = auth.currentUser;
  if (!user || !targetUid || targetUid === user.uid) return;

  const me = await getDoc(doc(db, "publicProfiles", user.uid));
  const data = me.exists() ? me.data() : {};

  await setDoc(
    doc(db, "users", targetUid, "friendRequests", user.uid),
    {
      fromUid: user.uid,
      fromName: data.username || user.displayName || "Protoveres User",
      fromAvatarURL: data.avatarURL || null,
      createdAt: serverTimestamp()
    }
  );
}

async function fetchPublicProfile(uid) {
  const snap = await getDoc(doc(db, "publicProfiles", uid));
  return snap.exists() ? snap.data() : null;
}

function bindProfileButtons(root) {
  root.querySelectorAll("[data-public-profile]").forEach((button) => {
    button.onclick = async () => {
      const uid = button.dataset.publicProfile;
      const profile = await fetchPublicProfile(uid);
      if (!profile) return;

      const result = document.getElementById("uidSearchResult");
      if (result) renderProfile(result, uid, profile);
    };
  });

  root.querySelectorAll("[data-public-friend]").forEach((button) => {
    button.onclick = async () => {
      const uid = button.dataset.publicFriend;
      button.disabled = true;

      try {
        await sendFriendRequest(uid);
        button.textContent = "✅ Đã gửi";
      } catch (error) {
        console.error("public profile friend request", error);
        button.disabled = false;
        button.textContent = "➕ Kết bạn";
      }
    };
  });
}

function renderProfile(root, uid, profile) {
  const user = auth.currentUser;
  const name = profile.username || "Protoveres User";
  const avatar = profile.avatarURL || profile.googlePhotoURL || "";
  const cover = profile.coverURL || "";

  root.innerHTML = `
    <div class="profileView">
      <div class="profileCover">
        ${cover ? `<img src="${esc(cover)}" alt="Ảnh bìa">` : ""}
      </div>
      <div class="profileViewHead">
        ${avatar
          ? `<div class="profileViewAvatar"><img src="${esc(avatar)}" alt="Avatar"></div>`
          : `<div class="profileViewAvatar">${esc(initials(name))}</div>`}
        <div style="min-width:0">
          <h3 style="margin:0">${esc(name)}</h3>
          <div class="profileMeta">
            UID: ${esc(uid)}<br>
            🌍 ${esc(profile.country || "Chưa đặt quốc gia")}
            · 🎂 ${esc(profile.age ?? "Chưa đặt tuổi")}
          </div>
          <div class="actionRow" style="margin-top:10px">
            ${uid === user?.uid
              ? '<span class="chip">👑 Đây là bạn</span>'
              : '<button class="actionBtn primary" id="publicProfileFriendBtn" type="button">➕ Kết bạn</button>'}
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("publicProfileFriendBtn")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;

    try {
      await sendFriendRequest(uid);
      button.textContent = "✅ Đã gửi";
    } catch (error) {
      console.error("public profile request", error);
      button.disabled = false;
      button.textContent = "➕ Kết bạn";
    }
  });
}

async function publicSearchUid() {
  const input = document.getElementById("uidSearchInput");
  const root = document.getElementById("uidSearchResult");
  if (!input || !root) return;

  const uid = input.value.trim();
  if (!uid) {
    root.innerHTML = '<div class="msg show err">Hãy nhập UID.</div>';
    return;
  }

  const button = document.getElementById("uidSearchBtn");
  if (button) button.disabled = true;
  root.innerHTML = '<div class="emptyState">Đang tìm…</div>';

  try {
    const profile = await fetchPublicProfile(uid);
    if (!profile) {
      root.innerHTML = '<div class="msg show err">Không tìm thấy UID này.</div>';
      return;
    }

    const name = profile.username || "Protoveres User";
    const avatar = profile.avatarURL || profile.googlePhotoURL || "";
    const me = auth.currentUser;

    root.innerHTML = `
      <div class="communityItem" style="margin-top:10px">
        ${avatar
          ? `<div class="ciAvatar"><img src="${esc(avatar)}" alt=""></div>`
          : `<div class="ciAvatar">${esc(initials(name))}</div>`}
        <div class="ciMain">
          <b>${esc(name)}</b>
          <p>${esc(uid)}</p>
          <div class="actionRow">
            <button class="actionBtn" id="publicViewMemberBtn" type="button">👤 Xem hồ sơ</button>
            ${uid !== me?.uid
              ? '<button class="actionBtn primary" id="publicSendReqBtn" type="button">➕ Gửi lời mời</button>'
              : ""}
          </div>
        </div>
      </div>
    `;

    document.getElementById("publicViewMemberBtn")?.addEventListener("click", () => {
      renderProfile(root, uid, profile);
    });

    document.getElementById("publicSendReqBtn")?.addEventListener("click", async (event) => {
      const sendButton = event.currentTarget;
      sendButton.disabled = true;
      try {
        await sendFriendRequest(uid);
        sendButton.textContent = "✅ Đã gửi";
      } catch (error) {
        console.error("public search friend request", error);
        sendButton.disabled = false;
        sendButton.textContent = "➕ Gửi lời mời";
      }
    });
  } catch (error) {
    console.error("public search", error);
    root.innerHTML = `<div class="msg show err">${esc(error?.message || "Không tải được hồ sơ.")}</div>`;
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadPublicRankings() {
  if (renderingRankings) return;
  renderingRankings = true;
  const newestRoot = document.getElementById("newUsersRank");
  const loginRoot = document.getElementById("loginRank");
  const countEl = document.getElementById("totalUsersCount");

  try {
    const snap = await getDocs(collection(db, "publicProfiles"));
    const docs = snap.docs;

    if (countEl) countEl.textContent = String(docs.length);

    const newest = docs
      .slice()
      .sort((a, b) => timestampMs(b.data()?.createdAt) - timestampMs(a.data()?.createdAt))
      .slice(0, 10);

    if (newestRoot) {
      newestRoot.innerHTML = newest.length
        ? ""
        : '<div class="emptyState">Chưa có dữ liệu thành viên.</div>';

      newest.forEach((docSnap, index) => {
        const profile = docSnap.data() || {};
        const uid = docSnap.id;
        const name = profile.username || "Protoveres User";
        const avatar = profile.avatarURL || profile.googlePhotoURL || "";

        const item = document.createElement("div");
        item.className = "rankItem";
        item.innerHTML = `
          <div class="rankNum">#${index + 1}</div>
          <div class="rankAvatar">
            ${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(initials(name))}
          </div>
          <div class="rankMain">
            <b>${esc(name)}</b>
            <p>UID: ${esc(uid)}</p>
            <div class="rankActions">
              <button class="actionBtn" type="button" data-public-profile="${esc(uid)}">👤 Xem hồ sơ</button>
              ${uid !== auth.currentUser?.uid
                ? `<button class="actionBtn primary" type="button" data-public-friend="${esc(uid)}">➕ Kết bạn</button>`
                : ""}
            </div>
          </div>
        `;
        newestRoot.appendChild(item);
      });

      bindProfileButtons(newestRoot);
    }

    const mostLogged = docs
      .slice()
      .sort((a, b) => {
        const pa = a.data() || {};
        const pb = b.data() || {};
        const ca = Number(pa.loginCount || 0);
        const cb = Number(pb.loginCount || 0);
        if (cb !== ca) return cb - ca;
        return timestampMs(pb.createdAt) - timestampMs(pa.createdAt);
      })
      .slice(0, 10);

    if (loginRoot) {
      loginRoot.innerHTML = mostLogged.length
        ? ""
        : '<div class="emptyState">Chưa có dữ liệu thành viên.</div>';

      mostLogged.forEach((docSnap, index) => {
        const profile = docSnap.data() || {};
        const uid = docSnap.id;
        const name = profile.username || "Protoveres User";
        const avatar = profile.avatarURL || profile.googlePhotoURL || "";
        const loginCount = Number(profile.loginCount || 0);

        const item = document.createElement("div");
        item.className = "rankItem";
        item.innerHTML = `
          <div class="rankNum">#${index + 1}</div>
          <div class="rankAvatar">
            ${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(initials(name))}
          </div>
          <div class="rankMain">
            <b>${esc(name)}</b>
            <p>${loginCount} lượt đăng nhập</p>
            <div class="rankActions">
              <button class="actionBtn" type="button" data-public-profile="${esc(uid)}">👤 Xem hồ sơ</button>
              ${uid !== auth.currentUser?.uid
                ? `<button class="actionBtn primary" type="button" data-public-friend="${esc(uid)}">➕ Kết bạn</button>`
                : ""}
            </div>
          </div>
        `;
        loginRoot.appendChild(item);
      });

      bindProfileButtons(loginRoot);
    }
  } catch (error) {
    console.error("public ranking", error);
    if (newestRoot) newestRoot.innerHTML = '<div class="msg show err">Chưa tải được bảng xếp hạng công khai.</div>';
    if (loginRoot) loginRoot.innerHTML = '<div class="msg show err">Chưa tải được bảng xếp hạng công khai.</div>';
    if (countEl) countEl.textContent = "—";
  } finally {
    renderingRankings = false;
  }
}

function installSearchOverride() {
  const button = document.getElementById("uidSearchBtn");
  const input = document.getElementById("uidSearchInput");
  if (!button || !input) return;

  button.onclick = publicSearchUid;
  input.onkeydown = (event) => {
    if (event.key === "Enter") publicSearchUid();
  };
}

let renderingRankings = false;

function installRankingObserver() {
  const targets = [
    document.getElementById("newUsersRank"),
    document.getElementById("loginRank"),
    document.getElementById("totalUsersCount")
  ].filter(Boolean);

  if (!targets.length) return;

  let timer = null;
  const rerender = () => {
    if (renderingRankings) return;
    clearTimeout(timer);
    timer = setTimeout(() => loadPublicRankings().catch(() => {}), 120);
  };

  const observer = new MutationObserver(rerender);
  targets.forEach((target) => observer.observe(target, { childList: true, subtree: true }));
}

function schedulePublicRankingRefresh() {
  setTimeout(() => loadPublicRankings().catch(() => {}), 1800);
  setInterval(() => loadPublicRankings().catch(() => {}), SYNC_INTERVAL_MS);
}

async function initialize(u) {
  if (!u) return;

  installSearchOverride();

  // Every account keeps its own public profile current.
  try {
    await syncOwnPublicProfile(u.uid);
  } catch (error) {
    console.warn("public profile self-sync", error);
  }

  // One-time migration for the Owner account.
  // This uses the existing /users collection only for the migration step.
  if (u.uid === OWNER_UID) {
    try {
      await migrateAllPublicProfiles();
    } catch (error) {
      console.warn("public profile migration", error);
    }
  }

  installRankingObserver();
  schedulePublicRankingRefresh();
}

onAuthStateChanged(auth, (u) => {
  initialize(u).catch((error) => console.error("publicprofiles addon", error));
});
