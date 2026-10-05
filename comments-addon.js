import {
  getApp,
  getApps
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDMO3B9o5Wsd5c42hSIpj_iiKL1wTLbJNg",
  authDomain: "protoveres-wiki.firebaseapp.com",
  projectId: "protoveres-wiki",
  storageBucket: "protoveres-wiki.firebasestorage.app",
  messagingSenderId: "164663077620",
  appId: "1:164663077620:web:3497f37ffed540b8520ca1"
};

const WORKER_URL =
  "https://cold-breeze-a6de.nguyentuankietproto.workers.dev";

const app = getApps().length ? getApp() : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
const listeners = new Map();
const initializedPosts = new WeakSet();

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[ch]));
}

function initials(name) {
  return (String(name || "P").trim().charAt(0) || "P").toUpperCase();
}

function dateText(ts) {
  try {
    if (!ts) return "Vừa xong";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(d);
  } catch {
    return "";
  }
}

async function profile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : {};
  } catch {
    return {};
  }
}

function injectCss() {
  if (document.getElementById("protoveresCommentsAddonCss")) return;

  const style = document.createElement("style");
  style.id = "protoveresCommentsAddonCss";
  style.textContent = `
    .pv-comment-btn{
      border:1px solid var(--line,#33415f);
      background:#ffffff06;
      color:#dbe8ff;
      border-radius:10px;
      padding:7px 10px;
      font-size:10px;
      font-weight:850;
      cursor:pointer
    }
    .pv-comment-btn:hover{background:#ffffff12}
    .pv-comment-btn.active{
      background:#735cff22;
      border-color:#9a8cff66
    }
    .pv-comment-panel{
      display:none;
      padding:12px;
      border-top:1px solid var(--line,#33415f);
      background:#ffffff03
    }
    .pv-comment-panel.open{display:block}
    .pv-comment-list{
      display:grid;
      gap:9px;
      max-height:320px;
      overflow:auto
    }
    .pv-comment-empty{
      padding:12px;
      border:1px dashed var(--line,#33415f);
      border-radius:12px;
      color:#74839d;
      font-size:10px;
      text-align:center
    }
    .pv-comment{
      display:flex;
      gap:9px;
      align-items:flex-start
    }
    .pv-comment-avatar{
      width:30px;
      height:30px;
      border-radius:10px;
      display:grid;
      place-items:center;
      overflow:hidden;
      flex:none;
      background:linear-gradient(135deg,#617eff,#ad60ff,#ff64cb);
      font-size:9px;
      font-weight:1000
    }
    .pv-comment-avatar img{
      width:100%;
      height:100%;
      object-fit:cover
    }
    .pv-comment-body{
      min-width:0;
      flex:1;
      padding:8px 10px;
      border:1px solid var(--line,#33415f);
      border-radius:12px;
      background:#ffffff04
    }
    .pv-comment-body b{font-size:10px}
    .pv-comment-text{
      margin-top:3px;
      font-size:10px;
      line-height:1.5;
      white-space:pre-wrap;
      overflow-wrap:anywhere;
      color:#dce5f7
    }
    .pv-comment-meta{
      margin-top:4px;
      color:#71809a;
      font-size:8px;
      display:flex;
      gap:7px;
      flex-wrap:wrap;
      align-items:center
    }
    .pv-comment-delete{
      border:0;
      background:transparent;
      color:#ff9caf;
      font-size:8px;
      padding:0;
      cursor:pointer
    }
    .pv-comment-form{
      display:flex;
      gap:7px;
      align-items:flex-end;
      margin-top:10px
    }
    .pv-comment-input{
      flex:1;
      min-height:46px;
      max-height:120px;
      resize:vertical;
      padding:9px 10px;
      border-radius:11px;
      border:1px solid var(--line,#33415f);
      background:#050a16;
      color:#fff;
      outline:none;
      font:inherit;
      font-size:10px;
      line-height:1.5
    }
    .pv-comment-send{
      border:1px solid var(--line,#33415f);
      background:linear-gradient(135deg,#735cff33,#00cfff18);
      color:#eef3ff;
      border-radius:10px;
      padding:9px 11px;
      font-size:10px;
      font-weight:850;
      cursor:pointer
    }
    .pv-comment-send:disabled{
      opacity:.55;
      cursor:wait
    }
  `;
  document.head.appendChild(style);
}

function renderComments(card, comments) {
  const list = card.querySelector(".pv-comment-list");
  const button = card.querySelector(".pv-comment-btn");
  if (!list || !button) return;

  button.textContent =
    `💬 Bình luận${comments.length ? ` (${comments.length})` : ""}`;

  if (!comments.length) {
    list.innerHTML =
      '<div class="pv-comment-empty">Chưa có bình luận. Hãy là người đầu tiên 💬</div>';
    return;
  }

  list.innerHTML = comments.map(c => {
    const name = c.authorName || "Protoveres User";
    const avatar = c.authorAvatarURL || "";
    const deleteButton =
      currentUser?.uid === c.uid
        ? `<button class="pv-comment-delete" type="button"
             data-pv-delete="${esc(c.id)}">Xoá</button>`
        : "";

    return `
      <div class="pv-comment">
        <div class="pv-comment-avatar">
          ${
            avatar
              ? `<img src="${esc(avatar)}" alt="">`
              : esc(initials(name))
          }
        </div>
        <div class="pv-comment-body">
          <b>${esc(name)}</b>
          <div class="pv-comment-text">${esc(c.text || "")}</div>
          <div class="pv-comment-meta">
            <span>${esc(dateText(c.createdAt))}</span>
            ${deleteButton}
          </div>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-pv-delete]").forEach(btn => {
    btn.onclick = async () => {
      const postId = card.dataset.socialPostId;
      const commentId = btn.dataset.pvDelete;

      if (!postId || !commentId || !currentUser) return;

      try {
        await deleteDoc(
          doc(db, "posts", postId, "comments", commentId)
        );
      } catch (error) {
        alert(
          error?.code === "permission-denied"
            ? "Firebase từ chối xoá bình luận."
            : (error?.message || "Không xoá được bình luận.")
        );
      }
    };
  });
}

function listenComments(card) {
  const postId = card.dataset.socialPostId;
  if (!postId) return;

  const old = listeners.get(postId);
  if (old) old();

  const list = card.querySelector(".pv-comment-list");
  if (list) {
    list.innerHTML =
      '<div class="pv-comment-empty">Đang tải bình luận…</div>';
  }

  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );

  const unsubscribe = onSnapshot(
    q,
    snap => {
      const comments = [];
      snap.forEach(d => {
        comments.push({
          id: d.id,
          ...d.data()
        });
      });

      renderComments(card, comments);
    },
    error => {
      if (list) {
        list.innerHTML =
          `<div class="pv-comment-empty">Không tải được bình luận: ${esc(
            error?.message || "Lỗi Firebase"
          )}</div>`;
      }
    }
  );

  listeners.set(postId, unsubscribe);
}

async function createNotification(targetUid, postId, message) {
  if (!currentUser || !targetUid || targetUid === currentUser.uid) return;

  try {
    const ref = await addDoc(
      collection(db, "users", targetUid, "notifications"),
      {
        type: "post_comment",
        targetType: "post",
        postId,
        fromUid: currentUser.uid,
        fromName: currentUser.displayName || "Protoveres User",
        fromAvatarURL: currentUser.photoURL || null,
        message: `💬 ${
          currentUser.displayName || "Một thành viên"
        } đã bình luận bài đăng của bạn: ${message.slice(0, 120)}`,
        read: false,
        createdAt: serverTimestamp()
      }
    );

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          targetUid,
          notificationId: ref.id
        })
      });

      if (!response.ok) {
        console.warn(
          "Protoveres comment push failed:",
          await response.text()
        );
      }
    } catch (pushError) {
      console.warn("Comment push error:", pushError);
    }
  } catch (error) {
    console.warn("Comment notification failed:", error);
  }
}

async function submitComment(card) {
  if (!currentUser) return;

  const postId = card.dataset.socialPostId;
  const input = card.querySelector(".pv-comment-input");
  const send = card.querySelector(".pv-comment-send");

  if (!postId || !input) return;

  const text = input.value.trim();
  if (!text) return;

  if (text.length > 1000) {
    alert("Bình luận tối đa 1000 ký tự.");
    return;
  }

  if (send) {
    send.disabled = true;
    send.textContent = "…";
  }

  try {
    const postSnap = await getDoc(
      doc(db, "posts", postId)
    );

    if (!postSnap.exists()) {
      throw new Error("Không tìm thấy bài đăng.");
    }

    const post = postSnap.data();

    const myProfile = await profile(currentUser.uid);

    await addDoc(
      collection(db, "posts", postId, "comments"),
      {
        uid: currentUser.uid,
        authorName:
          myProfile.username ||
          myProfile.displayName ||
          currentUser.displayName ||
          "Protoveres User",
        authorAvatarURL:
          myProfile.avatarURL ||
          myProfile.photoURL ||
          currentUser.photoURL ||
          null,
        text,
        createdAt: serverTimestamp()
      }
    );

    input.value = "";

    if (post.ownerUid && post.ownerUid !== currentUser.uid) {
      await createNotification(
        post.ownerUid,
        postId,
        text
      );
    }
  } catch (error) {
    alert(
      error?.code === "permission-denied"
        ? "Firebase từ chối bình luận. Hãy chắc chắn Rules /comments đã Publish."
        : (error?.message || "Không gửi được bình luận.")
    );
  } finally {
    if (send) {
      send.disabled = false;
      send.textContent = "Gửi";
    }
  }
}

function setupCard(card) {
  if (!card || initializedPosts.has(card)) return;

  const postId = card.dataset.socialPostId;
  const actions = card.querySelector(".postActions");

  if (!postId || !actions) return;

  initializedPosts.add(card);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "postAction pv-comment-btn";
  button.textContent = "💬 Bình luận";
  button.dataset.pvCommentButton = "1";

  const panel = document.createElement("div");
  panel.className = "pv-comment-panel";
  panel.innerHTML = `
    <div class="pv-comment-list">
      <div class="pv-comment-empty">
        Chưa mở bình luận.
      </div>
    </div>

    <div class="pv-comment-form">
      <textarea
        class="pv-comment-input"
        maxlength="1000"
        placeholder="Viết bình luận…"
      ></textarea>
      <button class="pv-comment-send" type="button">Gửi</button>
    </div>
  `;

  const shareButton =
    actions.querySelector("[data-social-share]");

  if (shareButton) {
    actions.insertBefore(button, shareButton);
  } else {
    actions.appendChild(button);
  }

  card.insertBefore(
    panel,
    card.querySelector(".postPrivateNote") || null
  );

  button.onclick = () => {
    const open = panel.classList.toggle("open");
    button.classList.toggle("active", open);

    if (open) {
      listenComments(card);
    }
  };

  panel
    .querySelector(".pv-comment-send")
    .addEventListener("click", () => submitComment(card));

  panel
    .querySelector(".pv-comment-input")
    .addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitComment(card);
      }
    });
}

function scanPosts() {
  document
    .querySelectorAll(".postCard[data-social-post-id]")
    .forEach(setupCard);
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    injectCss();
    scanPosts();
  }
});

injectCss();

const observer = new MutationObserver(() => {
  if (!currentUser) return;
  scanPosts();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
