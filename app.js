/* =========================================================
   북한 NEWS Monitor
   app.js 전체 교체본
   ========================================================= */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("북한 OR 김정은 OR 북핵 OR 미사일") +
  "&hl=ko&gl=KR&ceid=KR:ko";

let news = JSON.parse(localStorage.getItem("news") || "[]");
let page = "home";
let cat = "전체";

const main = document.querySelector("#main");


/* =========================================================
   기본 함수
   ========================================================= */

const esc = (s) =>
  String(s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[c]
  );


function saved() {
  try {
    return JSON.parse(localStorage.getItem("saved") || "[]");
  } catch (e) {
    return [];
  }
}


function isSaved(n) {
  return saved().some((x) => x.link === n.link);
}


/* =========================================================
   저장 / 삭제
   ========================================================= */

function toggle(n) {
  let arr = saved();

  const index = arr.findIndex((x) => x.link === n.link);

  if (index >= 0) {
    arr.splice(index, 1);
  } else {
    arr.unshift(n);
  }

  localStorage.setItem("saved", JSON.stringify(arr));

  render();
}


/* =========================================================
   뉴스 카테고리
   ========================================================= */

function match(n, c) {
  if (c === "전체") return true;

  const map = {
    "정치/외교":
      "정치|외교|회담|러시아|중국|미국|정상|외교",

    "군사/안보":
      "미사일|핵|군|무기|발사|안보|군사|탄도|미사일",

    "경제":
      "경제|무역|시장|식량|농업|제재|산업|금융",

    "사회/문화":
      "사회|문화|교육|체육|주민|생활|예술|스포츠"
  };

  const keyword = map[c] || "";

  return new RegExp(keyword, "i").test(n.title || "");
}


/* =========================================================
   카테고리 버튼
   ========================================================= */

function cats() {
  const categories = [
    "전체",
    "정치/외교",
    "군사/안보",
    "경제",
    "사회/문화"
  ];

  return `
    <div class="cats">
      ${categories
        .map(
          (c) => `
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


/* =========================================================
   뉴스 카드
   ========================================================= */

function card(n) {
  const json = JSON.stringify(n)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "&#39;");

  return `
    <div class="card" onclick='detail(${json})'>

      <div class="top">

        <span class="new">NEW</span>

        <button
          class="save"
          onclick='event.stopPropagation();toggle(${json})'
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


/* =========================================================
   뉴스 목록
   ========================================================= */

function list(arr) {
  if (!arr || arr.length === 0) {
    return `
      <div class="empty">
        표시할 기사가 없습니다.
        <br>
        잠시 후 다시 새로고침해 주세요.
      </div>
    `;
  }

  return arr.slice(0, 30).map(card).join("");
}


/* =========================================================
   화면 렌더링
   ========================================================= */

function render() {

  document
    .querySelectorAll("nav button")
    .forEach((b) => {
      b.classList.toggle(
        "active",
        b.dataset.p === page
      );
    });


  let h = '<div class="content">';


  /* ---------------- 홈 ---------------- */

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
    `;

    h += cats();

    h += list(
      news.filter((n) => match(n, cat))
    );
  }


  /* ---------------- 뉴스 ---------------- */

  else if (page === "news") {

    h += `
      <div class="title">
        최신 뉴스
      </div>
    `;

    h += cats();

    h += list(
      news.filter((n) => match(n, cat))
    );
  }


  /* ---------------- 저장됨 ---------------- */

  else if (page === "saved") {

    h += `
      <div class="title">
        저장됨
      </div>
    `;

    h += list(saved());
  }


  /* ---------------- 알림 ---------------- */

  else if (page === "alerts") {

    h += `
      <div class="title">
        알림
      </div>

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
          앱을 열면 최신 뉴스를 확인합니다.
        </p>

      </div>
    `;
  }


  /* ---------------- 설정 ---------------- */

  else if (page === "settings") {

    h += `
      <div class="title">
        설정
      </div>

      <div class="card">

        <b>새 기사 알림</b>

        <input
          type="checkbox"
          ${
            localStorage.getItem("notify") !== "off"
              ? "checked"
              : ""
          }
          onchange="
            localStorage.setItem(
              'notify',
              this.checked ? 'on' : 'off'
            )
          "
        >

      </div>

      <div class="card">

        <b>뉴스 소스</b>

        <p class="muted">
          Google News RSS
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


  /* ---------------- 검색 ---------------- */

  else if (page === "search") {

    h += `
      <button
        class="back"
        onclick="page='home';render()"
      >
        ‹ 뒤로
      </button>

      <div class="title">
        뉴스 검색
      </div>

      <div class="row">

        <input
          id="q"
          class="input"
          placeholder="북한, 김정은, 북핵, 미사일"
        >

        <button
          class="btn"
          style="width:90px;margin:0"
          onclick="searchQ()"
        >
          검색
        </button>

      </div>

      <div id="res"></div>
    `;
  }


  h += "</div>";

  main.innerHTML = h;
}


/* =========================================================
   기사 상세
   ========================================================= */

function detail(n) {

  const json = JSON.stringify(n)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "&#39;");

  main.innerHTML = `

    <div class="content detail">

      <button
        class="back"
        onclick="page='news';render()"
      >
        ‹ 뒤로
      </button>

      <h2>
        ${esc(n.title)}
      </h2>

      <div class="muted">
        ${esc(n.source || "출처 미상")}
        ·
        ${esc(n.pub || "최근")}
      </div>

      <div class="card">

        <b>기사 안내</b>

        <p class="muted">
          수집된 기사 제목과 출처입니다.
          아래 버튼을 눌러 원문을 확인할 수 있습니다.
        </p>

      </div>

      <button
        class="btn"
        onclick='toggle(${json});detail(${json})'
      >
        ${isSaved(n) ? "저장 취소" : "기사 저장"}
      </button>

      <button
        class="btn"
        onclick='window.open(${JSON.stringify(
          n.link
        )},"_blank")'
      >
        원문 기사 열기
      </button>

    </div>
  `;
}


/* =========================================================
   검색
   ========================================================= */

function searchQ() {

  const input = document.querySelector("#q");

  if (!input) return;

  const q = input.value
    .trim()
    .toLowerCase();

  const result = news.filter((n) =>
    (
      (n.title || "") +
      " " +
      (n.source || "")
    )
      .toLowerCase()
      .includes(q)
  );

  const box = document.querySelector("#res");

  if (box) {
    box.innerHTML = list(result);
  }
}


/* =========================================================
   RSS → 뉴스 데이터 변환
   ========================================================= */

function convertRSS(xmlText) {

  const parser = new DOMParser();

  const xml = parser.parseFromString(
    xmlText,
    "text/xml"
  );

  const items = [
    ...xml.querySelectorAll("item")
  ];

  return items
    .map((item) => {

      const title =
        item.querySelector("title")
          ?.textContent
          ?.trim() || "";

      const link =
        item.querySelector("link")
          ?.textContent
          ?.trim() || "";

      const pub =
        item.querySelector("pubDate")
          ?.textContent
          ?.trim() || "";

      const source =
        item.querySelector("source")
          ?.textContent
          ?.trim() || "";

      return {
        title,
        link,
        pub,
        source
      };

    })
    .filter(
      (n) => n.title && n.link
    );
}


/* =========================================================
   rss2json 방식
   ========================================================= */

async function getFromRSS2JSON() {

  const url =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(RSS);

  const response =
    await fetch(
      url,
      {
        cache: "no-store"
      }
    );

  if (!response.ok) {
    throw new Error(
      "RSS2JSON HTTP " +
      response.status
    );
  }

  const data =
    await response.json();

  if (
    !data ||
    data.status !== "ok" ||
    !Array.isArray(data.items)
  ) {
    throw new Error(
      "RSS2JSON 데이터 오류"
    );
  }

  return data.items
    .map((item) => ({
      title: item.title || "",
      link: item.link || "",
      pub: item.pubDate || "",
      source:
        item.author ||
        item.publisher ||
        "Google News"
    }))
    .filter(
      (n) => n.title && n.link
    );
}


/* =========================================================
   AllOrigins 방식
   보조 방법
   ========================================================= */

async function getFromAllOrigins() {

  const url =
    "https://api.allorigins.win/raw?url=" +
    encodeURIComponent(RSS);

  const response =
    await fetch(
      url,
      {
        cache: "no-store"
      }
    );

  if (!response.ok) {
    throw new Error(
      "AllOrigins HTTP " +
      response.status
    );
  }

  const text =
    await response.text();

  if (
    !text ||
    !text.includes("<item")
  ) {
    throw new Error(
      "RSS XML 데이터 없음"
    );
  }

  return convertRSS(text);
}


/* =========================================================
   뉴스 새로고침
   ========================================================= */

async function refresh() {

  const status =
    document.querySelector("#status");


  if (status) {
    status.textContent =
      "최신 뉴스 확인 중...";
  }


  let result = null;


  /* -----------------------------------------
     1차: rss2json
     ----------------------------------------- */

  try {

    result =
      await getFromRSS2JSON();

  } catch (e) {

    console.log(
      "rss2json 실패:",
      e
    );

  }


  /* -----------------------------------------
     2차: AllOrigins
     ----------------------------------------- */

  if (
    !result ||
    result.length === 0
  ) {

    try {

      result =
        await getFromAllOrigins();

    } catch (e) {

      console.log(
        "AllOrigins 실패:",
        e
      );

    }
  }


  /* -----------------------------------------
     성공
     ----------------------------------------- */

  if (
    result &&
    result.length > 0
  ) {

    news =
      result
        .slice(0, 30);

    localStorage.setItem(
      "news",
      JSON.stringify(news)
    );


    if (status) {

      status.textContent =
        "마지막 업데이트: " +
        new Date().toLocaleTimeString(
          "ko-KR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );

    }

  }


  /* -----------------------------------------
     실패
     ----------------------------------------- */

  else {

    if (status) {

      status.textContent =
        "뉴스 서버 연결 실패 · 다시 시도해 주세요";

    }

  }


  render();
}


/* =========================================================
   버튼 연결
   ========================================================= */

const refreshButton =
  document.querySelector("#refresh");

if (refreshButton) {
  refreshButton.onclick =
    refresh;
}


const quickButton =
  document.querySelector("#quick");

if (quickButton) {
  quickButton.onclick =
    refresh;
}


const searchButton =
  document.querySelector("#search");

if (searchButton) {

  searchButton.onclick =
    () => {

      page = "search";

      render();

    };
}


/* =========================================================
   하단 메뉴
   ========================================================= */

document
  .querySelectorAll("nav button")
  .forEach((button) => {

    button.onclick =
      () => {

        page =
          button.dataset.p;

        render();

      };

  });


/* =========================================================
   Service Worker
   ========================================================= */

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register("sw.js")
    .catch((e) => {

      console.log(
        "Service Worker 오류:",
        e
      );

    });

}


/* =========================================================
   시작
   ========================================================= */

render();

refresh();


/* =========================================================
   5분마다 자동 새로고침
   ========================================================= */

setInterval(
  refresh,
  5 * 60 * 1000
);
