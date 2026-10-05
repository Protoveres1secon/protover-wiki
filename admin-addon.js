import { getApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection,
  getDocs, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// IMPORTANT: replace this with the UID of the real "Proto" / Tổng lệnh phòng account.
// The same UID must be protected in Firestore Rules. The UID is not a secret.
const ADMIN_UID = "PASTE_PROTO_UID_HERE";
const WORKER_URL = "https://cold-breeze-a6de.nguyentuankietproto.workers.dev";

const app = getApps().length ? getApp() : null;
if (!app) throw new Error("Admin addon phải được tải sau Firebase app chính.");
const auth = getAuth(app);
const db = getFirestore(app);

const esc = (s) => String(s ?? "").replace(/[&<>\"]/g, (m) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
}[m]));

let currentUser = null;
let adminUsers = [];
let selectedUid = null;
let adminReady = false;

function avatarHtml(u, cls = "adminAvatar") {
  const src = u?.avatarURL || u?.photoURL || u?.googlePhotoURL || "";
  const name = u?.username || u?.displayName || "Protoveres User";
  return src
    ? `<div class="${cls}"><img src="${esc(src)}" alt=""></div>`
    : `<div class="${cls}">${esc(name.trim().charAt(0).toUpperCase() || "P")}</div>`;
}

function toast(message, ok = true) {
  const host = document.getElementById("adminToastHost") || (() => {
    const h = document.createElement("div");
    h.id = "adminToastHost";
    h.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:10080;display:grid;gap:8px;max-width:min(420px,calc(100vw - 36px));";
    document.body.appendChild(h);
    return h;
  })();
  const box = document.createElement("div");
  box.style.cssText = `padding:12px 14px;border-radius:14px;background:${ok ? "#13221b" : "#281616"};border:1px solid ${ok ? "#2c6d4d" : "#7a3434"};color:#fff;box-shadow:0 15px 50px rgba(0,0,0,.35);font-size:13px;`;
  box.textContent = message;
  host.appendChild(box);
  setTimeout(() => box.remove(), 3500);
}

function injectStyles() {
  if (document.getElementById("adminAddonStyles")) return;
  const s = document.createElement("style");
  s.id = "adminAddonStyles";
  s.textContent = `
    .adminLauncher{display:inline-flex;align-items:center;gap:7px;margin:10px 0 0;padding:10px 13px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:linear-gradient(135deg,rgba(111,92,255,.22),rgba(41,190,255,.12));color:#fff;cursor:pointer;font-weight:800}
    .adminLauncher:hover{transform:translateY(-1px)}
    .adminOverlay{display:none;position:fixed;inset:0;background:rgba(4,8,18,.72);backdrop-filter:blur(10px);z-index:10020;padding:18px;overflow:auto}
    .adminOverlay.open{display:block}
    .adminShell{max-width:1250px;margin:0 auto;background:#0c1220;border:1px solid rgba(255,255,255,.1);border-radius:24px;box-shadow:0 30px 100px rgba(0,0,0,.5);overflow:hidden;color:#eef3ff}
    .adminTop{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
    .adminTitle{font-size:20px;font-weight:900}.adminSub{font-size:11px;color:#8d99b3;margin-top:3px}
    .adminClose{border:0;background:rgba(255,255,255,.07);color:#fff;border-radius:11px;padding:9px 11px;cursor:pointer}
    .adminBody{display:grid;grid-template-columns:minmax(280px,420px) minmax(0,1fr);min-height:620px}
    .adminMembers{border-right:1px solid rgba(255,255,255,.08);padding:16px;display:flex;flex-direction:column;min-width:0}
    .adminSearch{display:flex;gap:8px;margin-bottom:10px}.adminSearch input,.adminNoteInput,.adminReasonInput{width:100%;box-sizing:border-box;background:#111a2c;border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:11px;padding:11px 12px;outline:none}.adminSearch input:focus,.adminNoteInput:focus,.adminReasonInput:focus{border-color:#6979ff}
    .adminMemberList{overflow:auto;max-height:540px;padding-right:4px;display:grid;gap:7px}
    .adminMember{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid transparent;background:#111827;color:#fff;border-radius:14px;padding:10px;cursor:pointer}.adminMember:hover{background:#162038}.adminMember.active{border-color:#6979ff;background:#18203b}
    .adminMemberMain{min-width:0;flex:1}.adminMemberName{font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.adminMemberMeta{font-size:9px;color:#7f8ca7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}.adminBadge{font-size:9px;font-weight:900;padding:4px 7px;border-radius:99px;background:#1d2840;color:#a9b6d2}.adminBadge.banned{background:#4a2222;color:#ffadad}.adminBadge.admin{background:#31255b;color:#d4c8ff}
    .adminAvatar{width:38px;height:38px;min-width:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#33436f,#1e263c);overflow:hidden;font-weight:900}.adminAvatar img{width:100%;height:100%;object-fit:cover}
    .adminDetail{padding:22px;min-width:0}.adminEmpty{display:grid;place-items:center;min-height:520px;color:#7f8ca7;text-align:center}.adminProfileHead{display:flex;align-items:center;gap:14px;padding:14px;border:1px solid rgba(255,255,255,.08);background:#10192a;border-radius:18px}.adminProfileName{font-size:18px;font-weight:900}.adminUid{font-size:10px;color:#7f8ca7;word-break:break-all;margin-top:4px}.adminStatus{margin-top:5px;font-size:11px;font-weight:800}.adminStatus.ok{color:#69d69b}.adminStatus.bad{color:#ff8f8f}.adminGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.adminCard{border:1px solid rgba(255,255,255,.08);background:#10192a;border-radius:16px;padding:14px}.adminCard h4{margin:0 0 9px;font-size:13px}.adminActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.adminBtn{border:0;border-radius:11px;padding:10px 12px;background:#202d47;color:#fff;cursor:pointer;font-weight:800}.adminBtn.primary{background:#4b5df0}.adminBtn.danger{background:#8c3030}.adminBtn.good{background:#276447}.adminBtn:disabled{opacity:.5;cursor:not-allowed}.adminListStat{font-size:11px;color:#8d99b3;padding-bottom:8px}.adminHint{font-size:10px;color:#7886a2;line-height:1.45}.adminDangerBox{border-color:#6a2d2d;background:#241518}.adminNoteInput{min-height:96px;resize:vertical;margin-top:8px}.adminReasonInput{margin-top:8px}.adminConfirm{display:none;margin-top:10px}.adminConfirm.show{display:block}
    @media(max-width:860px){.adminBody{grid-template-columns:1fr}.adminMembers{border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.adminMemberList{max-height:310px}.adminGrid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function mountPanel() {
  if (document.getElementById("protoAdminPanel")) return;
  const community = document.getElementById("communityView");
  if (!community) return;

  const launcher = document.createElement("button");
  launcher.className = "adminLauncher";
  launcher.type = "button";
  launcher.id = "protoAdminLauncher";
  launcher.textContent = "👑 Quản trị • Tổng lệnh phòng";

  const anchor = community.querySelector(".rankBox") || community.lastElementChild;
  if (anchor?.parentNode) anchor.parentNode.insertBefore(launcher, anchor);
  else community.appendChild(launcher);

  const overlay = document.createElement("div");
  overlay.className = "adminOverlay";
  overlay.id = "protoAdminPanel";
  overlay.innerHTML = `
    <div class="adminShell" role="dialog" aria-modal="true" aria-label="Quản trị Protoveres">
      <div class="adminTop">
        <div><div class="adminTitle">👑 QUẢN TRỊ PROTOVERES</div><div class="adminSub">Danh hiệu: Tổng lệnh phòng • Quản lý thành viên</div></div>
        <button class="adminClose" id="adminCloseBtn" type="button">✕ Đóng</button>
      </div>
      <div class="adminBody">
        <aside class="adminMembers">
          <div class="adminSearch"><input id="adminUserSearch" type="search" placeholder="🔎 Tìm tên, email hoặc UID…" autocomplete="off"></div>
          <div class="adminListStat" id="adminListStat">Đang tải danh sách…</div>
          <div class="adminMemberList" id="adminMemberList"></div>
        </aside>
        <section class="adminDetail" id="adminDetail"><div class="adminEmpty">Chọn một thành viên ở bên trái để xem quyền quản lý.</div></section>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  launcher.addEventListener("click", () => {
    overlay.classList.add("open");
    loadUsers();
  });
  document.getElementById("adminCloseBtn").onclick = () => overlay.classList.remove("open");
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
  document.getElementById("adminUserSearch").addEventListener("input", renderUserList);
}

function filteredUsers() {
  const q = document.getElementById("adminUserSearch")?.value.trim().toLowerCase() || "";
  if (!q) return adminUsers;
  return adminUsers.filter(u => [u.username, u.displayName, u.email, u.uid].some(v => String(v || "").toLowerCase().includes(q)));
}

function renderUserList() {
  const root = document.getElementById("adminMemberList");
  const stat = document.getElementById("adminListStat");
  if (!root || !stat) return;
  const vals = filteredUsers();
  stat.textContent = `${vals.length} / ${adminUsers.length} thành viên`;
  root.innerHTML = vals.map(u => {
    const name = u.username || u.displayName || "Protoveres User";
    const banned = !!u.banned;
    const isAdmin = u.uid === ADMIN_UID;
    return `<button class="adminMember ${selectedUid === u.uid ? "active" : ""}" type="button" data-admin-uid="${esc(u.uid)}">
      ${avatarHtml(u)}
      <div class="adminMemberMain"><div class="adminMemberName">${esc(name)}</div><div class="adminMemberMeta">${esc(u.email || u.uid)}</div></div>
      ${isAdmin ? '<span class="adminBadge admin">👑 Admin</span>' : banned ? '<span class="adminBadge banned">🔴 Bị cấm</span>' : '<span class="adminBadge">🟢</span>'}
    </button>`;
  }).join("") || `<div class="adminHint">Không tìm thấy thành viên phù hợp.</div>`;
  root.querySelectorAll("[data-admin-uid]").forEach(b => b.onclick = () => selectUser(b.dataset.adminUid));
}

async function loadUsers() {
  const list = document.getElementById("adminMemberList");
  if (list) list.innerHTML = '<div class="adminHint">Đang tải tất cả thành viên…</div>';
  try {
    // Rules must allow this query ONLY for ADMIN_UID.
    const snap = await getDocs(collection(db, "users"));
    adminUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a,b) => String(a.username || a.displayName || a.email || a.uid).localeCompare(String(b.username || b.displayName || b.email || b.uid), "vi"));
    renderUserList();
    if (selectedUid && !adminUsers.some(u => u.uid === selectedUid)) {
      selectedUid = null;
      renderDetail(null);
    }
  } catch (e) {
    console.error("admin loadUsers", e);
    if (list) list.innerHTML = `<div class="adminHint" style="color:#ff9b9b">Không tải được danh sách. Hãy kiểm tra Firestore Rules cho Tổng lệnh phòng.<br><br>${esc(e?.message || e)}</div>`;
  }
}

function selectedUser() { return adminUsers.find(u => u.uid === selectedUid) || null; }

function renderDetail(u) {
  const root = document.getElementById("adminDetail");
  if (!root) return;
  if (!u) { root.innerHTML = '<div class="adminEmpty">Chọn một thành viên ở bên trái để xem quyền quản lý.</div>'; return; }
  const name = u.username || u.displayName || "Protoveres User";
  const banned = !!u.banned;
  root.innerHTML = `
    <div class="adminProfileHead">
      ${avatarHtml(u, "adminAvatar")}<div style="min-width:0;flex:1"><div class="adminProfileName">${esc(name)}</div><div class="adminUid">UID: ${esc(u.uid)}</div><div class="adminStatus ${banned ? "bad" : "ok"}">${banned ? "🔴 Tài khoản đang bị khóa" : "🟢 Tài khoản đang hoạt động"}</div></div>
    </div>
    <div class="adminGrid">
      <div class="adminCard"><h4>👤 Thông tin tài khoản</h4><div class="adminHint">Email: ${esc(u.email || "—")}</div><div class="adminHint">Quốc gia: ${esc(u.country || "—")}</div><div class="adminHint">Tuổi: ${esc(u.age ?? "—")}</div></div>
      <div class="adminCard"><h4>🏷️ Danh hiệu</h4><div class="adminHint">${u.role === "tong_lenh_phong" ? "👑 Tổng lệnh phòng" : "Thành viên"}</div><div class="adminHint" style="margin-top:5px">Quyền quản trị phải được khóa ở Firestore Rules.</div></div>
    </div>
    <div class="adminCard" style="margin-top:12px"><h4>📢 Gửi thông báo riêng</h4><div class="adminHint">Thông báo sẽ xuất hiện trong Trung tâm thông báo và có thể được đẩy ra thiết bị của họ.</div><textarea id="adminNoteInput" class="adminNoteInput" maxlength="1000" placeholder="Nhập nội dung thông báo…"></textarea><div class="adminActions"><button class="adminBtn primary" id="adminSendNoteBtn" type="button">📢 Gửi thông báo</button></div></div>
    <div class="adminCard ${banned ? "adminDangerBox" : ""}" style="margin-top:12px"><h4>🛡️ Quyền xử lý tài khoản</h4><div class="adminHint">${banned ? `Lý do hiện tại: ${esc(u.banReason || "Không ghi lý do")}` : "Cấm vĩnh viễn nghĩa là không có ngày tự mở khóa; chỉ Tổng lệnh phòng mới có thể gỡ."}</div><input id="adminReasonInput" class="adminReasonInput" maxlength="300" placeholder="Lý do cấm / ghi chú quản trị…" value="${esc(u.banReason || "")}"><div class="adminActions">${banned ? '<button class="adminBtn good" id="adminUnbanBtn" type="button">🟢 Gỡ cấm</button>' : '<button class="adminBtn danger" id="adminBanBtn" type="button">☠️ Cấm vĩnh viễn</button>'}<button class="adminBtn danger" id="adminDeleteProfileBtn" type="button">🗑️ Xóa hồ sơ dữ liệu</button></div><div class="adminHint" style="margin-top:8px">“Xóa hồ sơ dữ liệu” không tự xóa Firebase Authentication. Việc xóa Auth thật phải chạy bằng quyền server/Admin SDK.</div></div>`;

  document.getElementById("adminSendNoteBtn").onclick = () => sendAdminNotice(u.uid);
  document.getElementById("adminBanBtn")?.addEventListener("click", () => banUser(u.uid));
  document.getElementById("adminUnbanBtn")?.addEventListener("click", () => unbanUser(u.uid));
  document.getElementById("adminDeleteProfileBtn")?.addEventListener("click", () => softDeleteProfile(u.uid));
}

async function sendAdminNotice(targetUid, overrideMessage = "") {
  const input = document.getElementById("adminNoteInput");
  const message = String(overrideMessage || input?.value || "").trim();
  if (!message) return toast("Hãy nhập nội dung thông báo.", false);
  try {
    const targetProfile = await getDoc(doc(db, "users", targetUid));
    if (!targetProfile.exists()) throw new Error("Không tìm thấy người dùng.");
    const ref = await addDoc(collection(db, "users", targetUid, "notifications"), {
      type: "admin_notice",
      title: "📢 Thông báo từ Tổng lệnh phòng",
      message,
      fromUid: currentUser.uid,
      fromName: "Tổng lệnh phòng",
      fromAvatarURL: null,
      targetType: "profile",
      targetUid,
      read: false,
      createdAt: serverTimestamp()
    });
    try {
      const idToken = await currentUser.getIdToken();
      await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ targetUid, notificationId: ref.id })
      });
    } catch (pushError) { console.warn("admin push", pushError); }
    if (input && !overrideMessage) input.value = "";
    toast("✅ Đã gửi thông báo cho thành viên.");
  } catch (e) {
    console.error(e);
    toast("Không gửi được thông báo. Kiểm tra Firestore Rules.", false);
  }
}

async function banUser(uid) {
  if (uid === ADMIN_UID || uid === currentUser?.uid) return toast("Không thể tự cấm tài khoản Tổng lệnh phòng.", false);
  const reason = document.getElementById("adminReasonInput")?.value.trim() || "Vi phạm quy định Protoveres.";
  if (!confirm("Cấm vĩnh viễn tài khoản này? Chỉ Tổng lệnh phòng mới có thể gỡ.")) return;
  try {
    await setDoc(doc(db, "users", uid), { banned: true, banReason: reason, bannedAt: serverTimestamp(), bannedBy: currentUser.uid }, { merge: true });
    const target = adminUsers.find(u => u.uid === uid);
    if (target) Object.assign(target, { banned: true, banReason: reason });
    renderUserList(); renderDetail(target);
    toast("☠️ Đã cấm vĩnh viễn tài khoản.");
    await sendAdminNotice(uid, "Tài khoản của bạn đã bị cấm vĩnh viễn bởi Tổng lệnh phòng.");
  } catch (e) {
    console.error(e); toast("Firebase từ chối thao tác cấm. Hãy kiểm tra Rules.", false);
  }
}

async function unbanUser(uid) {
  try {
    await setDoc(doc(db, "users", uid), { banned: false, banReason: null, bannedAt: null, bannedBy: null }, { merge: true });
    const target = adminUsers.find(u => u.uid === uid);
    if (target) Object.assign(target, { banned: false, banReason: null });
    renderUserList(); renderDetail(target);
    toast("✅ Đã gỡ cấm.");
  } catch (e) { console.error(e); toast("Không gỡ cấm được. Kiểm tra Rules.", false); }
}

async function softDeleteProfile(uid) {
  if (uid === ADMIN_UID || uid === currentUser?.uid) return toast("Không thể xóa hồ sơ của Tổng lệnh phòng.", false);
  if (!confirm("Xóa hồ sơ dữ liệu và khóa tài khoản này?")) return;
  try {
    await setDoc(doc(db, "users", uid), { deleted: true, banned: true, banReason: "Hồ sơ đã bị xóa bởi Tổng lệnh phòng.", deletedAt: serverTimestamp(), deletedBy: currentUser.uid }, { merge: true });
    const target = adminUsers.find(u => u.uid === uid);
    if (target) Object.assign(target, { deleted: true, banned: true, banReason: "Hồ sơ đã bị xóa bởi Tổng lệnh phòng." });
    renderUserList(); renderDetail(target);
    toast("🗑️ Đã đánh dấu hồ sơ là đã xóa và khóa.");
  } catch (e) { console.error(e); toast("Không xóa hồ sơ được. Kiểm tra Rules.", false); }
}

function selectUser(uid) {
  selectedUid = uid;
  renderUserList();
  renderDetail(selectedUser());
}

function showAccountLock(reason, deleted = false) {
  let overlay = document.getElementById("protoAccountLockOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "protoAccountLockOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:10100;background:rgba(3,7,15,.96);backdrop-filter:blur(12px);display:grid;place-items:center;padding:20px;color:#fff;text-align:center;";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="max-width:560px;border:1px solid rgba(255,255,255,.1);background:#0e1626;border-radius:24px;padding:28px;box-shadow:0 25px 100px rgba(0,0,0,.5)"><div style="font-size:46px">${deleted ? "🗑️" : "☠️"}</div><h2 style="margin:10px 0 8px">${deleted ? "Tài khoản đã bị khóa" : "Tài khoản bị cấm vĩnh viễn"}</h2><p style="color:#9aa7c2;line-height:1.6">${esc(reason || "Tài khoản này không còn được phép sử dụng Protoveres.")}</p><button id="protoAccountLockLogout" style="margin-top:12px;border:0;border-radius:11px;padding:11px 15px;background:#4b5df0;color:#fff;font-weight:800;cursor:pointer">↪ Đăng xuất</button></div>`;
  overlay.style.display = "grid";
  document.getElementById("protoAccountLockLogout").onclick = () => signOut(auth);
}

function watchAccountStatus() {
  onAuthStateChanged(auth, (u) => {
    if (!u) {
      document.getElementById("protoAccountLockOverlay")?.remove();
      return;
    }
    onSnapshot(doc(db, "users", u.uid), (snap) => {
      const d = snap.exists() ? snap.data() : {};
      if (d.banned === true || d.deleted === true) {
        showAccountLock(d.banReason, d.deleted === true);
      } else {
        document.getElementById("protoAccountLockOverlay")?.remove();
      }
    }, (e) => console.warn("account status watcher", e));
  });
}

function watchOwnBanStatus() {
  onAuthStateChanged(auth, async (u) => {
    currentUser = u;
    if (!u || u.uid !== ADMIN_UID) {
      adminReady = false;
      document.getElementById("protoAdminLauncher")?.remove();
      document.getElementById("protoAdminPanel")?.remove();
      return;
    }
    adminReady = true;
    injectStyles();
    mountPanel();
  });
}

injectStyles();
watchAccountStatus();
watchOwnBanStatus();
