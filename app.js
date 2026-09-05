const RSS =
  "https://news.google.com/rss/search?q=%EB%B6%81%ED%95%9C+OR+%EA%B9%80%EC%A0%95%EC%9D%80+OR+%EB%B6%81%ED%95%B5+OR+%EB%AF%B8%EC%82%AC%EC%9D%BC&hl=ko&gl=KR&ceid=KR:ko";

let news = JSON.parse(localStorage.news || "[]");
let page = "home";
let cat = "전체";

const main = document.querySelector("#main");

const esc = s =>
  String(s || "").replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c])
  );

const saved = () => JSON.parse(localStorage.saved || "[]");

const isSaved = n =>
  saved().some(x => x.link === n.link);

function toggle(n) {
  let a = saved();
  let i = a.findIndex(x => x.link === n.link);

  if (i >= 0) {
    a.splice(i, 1);
  } else {
    a.unshift(n);
  }

  localStorage.saved = JSON.stringify(a);
  render();
}

function match(n, c) {
  if (c === "전체") return true;

  const m = {
    "정치/외교": "정치|외교|회담|러시아|중국|미국",
    "군사/안보": "미사일|핵|군|무기|발사|안보",
    "경제": "경제|무역|시장|식량|농업|제재",
    "사회/문화": "사회|문화|교육|체육|주민"
  }[c];

  return new RegExp(m || "").test(n.title);
}

function cats() {
  return `
    <div class="cats">
      ${["전체", "정치/외교", "군사/안보", "경제", "사회/문화"]
        .map(
          c => `
            <button
              class="${cat === c ? "on" : ""}"
              onclick="cat='${c}';page='news';render()"
            >
              ${c}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function card(n) {
  const j = JSON.stringify(n).replace(/'/g, "&#39;");

  return `
    <div class="card" onclick='detail(${j})'>
      <div class="top">
        <span class="new">NEW</span>

        <button
          class="save"
          onclick='event.stopPropagation();toggle(${j})'
        >
          ${isSaved(n) ? "🔖" : "♡"}
        </button>
      </div>

      <h3>${esc(n.title)}</h3>

      <div class="source">
        ${esc(n.source || "출처 미상")}
        ·
        ${esc(n.pub || "최근")}
      </div>
    </div>
  `;
}

function list(a) {
  if (a.length) {
    return a.slice(0, 30).map(card).join("");
  }

  return `
    <div class="empty">
      표시할 기사가 없습니다.<br>
      새로고침을 눌러 다시 확인해 주세요.
    </div>
  `;
}

function render() {
  document
    .querySelectorAll("nav button")
    .forEach(b =>
      b.classList.toggle("active", b.dataset.p === page)
    );

  let h = '<div class="content">';

  if (page === "home") {
    h += `
      <div class="card notice">
        <div>🔔</div>

        <div>
          <b>새로운 기사가 도착했습니다</b>
          <div class="muted">
            최신 북한 관련 뉴스를 확인하세요
          </div>
        </div>
      </div>

      ${cats()}

      ${list(news.filter(n => match(n, cat)))}
    `;
  }

  else if (page === "news") {
    h += `
      <div class="title">최신 뉴스</div>
      ${cats()}
      ${list(news.filter(n => match(n, cat)))}
    `;
  }

  else if (page === "saved") {
    h += `
      <div class="title">저장됨</div>
      ${list(saved())}
    `;
  }

  else if (page === "alerts") {
    h += `
      <div class="title">알림</div>

      <div class="card">
        <b>🔔 새 기사 알림</b>
        <p class="muted">
          새로운 북한 관련 기사가 수집되면
          이 화면에서 확인할 수 있습니다.
        </p>
      </div>

      <div class="card">
        <b>자동 업데이트</b>
        <p class="muted">
          앱을 열면 즉시 확인합니다.
          백그라운드 갱신은 브라우저/OS 정책에 따라
          제한될 수 있습니다.
        </p>
      </div>
    `;
  }

  else if (page === "settings") {
    h += `
      <div class="title">설정</div>

      <div class="card">
        <b>새 기사 알림</b>

        <input
          type="checkbox"
          ${localStorage.notify !== "off" ? "checked" : ""}
          onchange="localStorage.notify=this.checked?'on':'off'"
        >
      </div>

      <div class="card">
        <b>뉴스 소스</b>
        <p class="muted">
          Google News RSS 기반 MVP
        </p>
      </div>

      <div class="card">
        <b>앱 정보</b>
        <p class="muted">
          북한 NEWS Monitor · PWA v1.0
        </p>
      </div>
    `;
  }

  else if (page === "search") {
    h += `
      <button
        class="back
