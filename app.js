const RSS =
  "https://news.google.com/rss/search?q=%EB%B6%81%ED%95%9C+OR+%EA%B9%80%EC%A0%95%EC%9D%80+OR+%EB%B6%81%ED%95%B5+OR+%EB%AF%B8%EC%82%AC%EC%9D%BC&hl=ko&gl=KR&ceid=KR:ko";

let news = [];
let page = "home";
let cat = "전체";

const main = document.querySelector("#main");

const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function loadNews() {
  try {
    return JSON.parse(localStorage.getItem("news") || "[]");
  } catch (e) {
    return [];
  }
}

function saveNews(data) {
  localStorage.setItem("news", JSON.stringify(data));
}

news = loadNews();

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

function toggle(n) {
  let a = saved();
  const i = a.findIndex((x) => x.link === n.link);

  if (i >= 0) {
    a.splice(i, 1);
  } else {
    a.unshift(n);
  }

  localStorage.setItem("saved", JSON.stringify(a));
  render();
}

function match(n, c) {
  if (c === "전체") return true;

  const map = {
    "정치/외교": "정치|외교|회담|러시아|중국|미국|정상|외무",
    "군사/안보": "미사일|핵|군|무기|발사|안보|군사|미군|북핵",
    "경제": "경제|무역|시장|식량|농업|제재|수출|수입",
    "사회/문화": "사회|문화|교육|체육|주민|학교|선수|예술"
  };

  const keyword = map[c];

  if (!keyword) return true;

  return new RegExp(keyword, "i").test(
    (n.title || "") + " " + (n.source || "")
  );
}

function cats() {
  return `
    <div class="cats">
      ${[
        "전체",
        "정치/외교",
        "군사/안보",
        "경제",
        "사회/문화"
      ]
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
  if (!a || !a.length) {
    return `
      <div class="empty">
        표시할 기사가 없습니다.<br>
        새로고침을 눌러 다시 확인해 주세요.
      </div>
    `;
  }

  return a.slice(0, 30).map(card).join("");
}

function render() {
  document
    .querySelectorAll("nav button")
    .forEach((b) =>
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

      ${list(news.filter((n) => match(n, cat)))}
    `;
  }

  else if (page === "news") {
    h += `
      <div class="title">최신 뉴스</div>

      ${cats()}

      ${list(news.filter((n) => match(n, cat)))}
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
          Google News RSS 기반
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
        class="back"
        onclick="page='home';render()"
      >
        ‹ 뒤로
      </button>

      <div class="title">뉴스 검색</div>

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

  main.innerHTML = h + "</div>";
}

function detail(n) {
  const j = JSON.stringify(n).replace(/'/g, "&#39;");

  main.innerHTML = `
    <div class="content detail">

      <button
        class="back"
        onclick="page='news';render()"
      >
        ‹ 뒤로
      </button>

      <h2>${esc(n.title)}</h2>

      <div class="muted">
        ${esc(n.source || "출처 미상")}
        ·
        ${esc(n.pub || "")}
      </div>

      <div class="card">
        <b>기사 안내</b>

        <p class="muted">
          수집된 기사 제목과 출처입니다.
          원문은 아래 버튼으로 확인할 수 있습니다.
        </p>
      </div>

      <button
        class="btn"
        onclick='toggle(${j});detail(${j})'
      >
        ${isSaved(n) ? "저장 취소" : "기사 저장"}
      </button>

      <button
        class="btn"
        onclick='window.open(${JSON.stringify(n.link)}, "_blank")'
      >
        원문 기사 열기
      </button>

    </div>
  `;
}

function searchQ() {
  const input = document.querySelector("#q");

  if (!input) return;

  const q = input.value.trim().toLowerCase();

  const result = news.filter((n) =>
    ((n.title || "") + " " + (n.source || ""))
      .toLowerCase()
      .includes(q)
  );

  document.querySelector("#res").innerHTML = list(result);
}


/* =========================================
   RSS 가져오기
   여러 주소를 차례대로 시도
   ========================================= */

async function fetchRSS() {

  /* 방법 1 : AllOrigins */
  try {
    const url =
      "https://api.allorigins.win/raw?url=" +
      encodeURIComponent(RSS);

    const response = await fetch(url, {
      cache: "no-store"
    });

    if (response.ok) {
      const text = await response.text();

      if (text && text.includes("<item")) {
        return text;
      }
    }
  } catch (e) {
    console.log("AllOrigins 실패");
  }


  /* 방법 2 : CorsProxy */
  try {
    const url =
      "https://corsproxy.io/?" +
      encodeURIComponent(RSS);

    const response = await fetch(url, {
      cache: "no-store"
    });

    if (response.ok) {
      const text = await response.text();

      if (text && text.includes("<item")) {
        return text;
      }
    }
  } catch (e) {
    console.log("CorsProxy 실패");
  }


  /* 방법 3 : AllOrigins GET */
  try {
    const url =
      "https://api.allorigins.win/get?url=" +
      encodeURIComponent(RSS);

    const response = await fetch(url, {
      cache: "no-store"
    });

    if (response.ok) {
      const json = await response.json();

      if (
        json &&
        json.contents &&
        json.contents.includes("<item")
      ) {
        return json.contents;
      }
    }
  } catch (e) {
    console.log("AllOrigins GET 실패");
  }


  throw new Error("RSS를 가져오지 못했습니다.");
}


/* =========================================
   뉴스 새로고침
   ========================================= */

async function refresh() {

  const status = document.querySelector("#status");

  if (status) {
    status.textContent = "최신 뉴스 확인 중...";
  }

  try {

    const xmlText = await fetchRSS();

    const xml = new DOMParser().parseFromString(
      xmlText,
      "text/xml"
    );

    const items = [
      ...xml.querySelectorAll("item")
    ];

    if (!items.length) {
      throw new Error("뉴스 항목이 없습니다.");
    }

    const newNews = items
      .slice(0, 30)
      .map((item) => {

        const title =
          item.querySelector("title")?.textContent?.trim() || "";

        const link =
          item.querySelector("link")?.textContent?.trim() || "";

        const source =
          item.querySelector("source")?.textContent?.trim() ||
          "Google News";

        const pub =
          item.querySelector("pubDate")?.textContent?.trim() ||
          "";

        return {
          title,
          link,
          source,
          pub
        };

      })
      .filter((n) => n.title && n.link);


    if (!newNews.length) {
      throw new Error("뉴스 데이터가 비어 있습니다.");
    }


    news = newNews;

    saveNews(news);


    if (status) {
      status.textContent =
        "마지막 업데이트: " +
        new Date().toLocaleTimeString(
          "ko-KR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        ) +
        " · " +
        news.length +
        "건";
    }


  } catch (e) {

    console.error("뉴스 업데이트 오류:", e);

    const oldNews = loadNews();

    if (oldNews.length) {
      news = oldNews;

      if (status) {
        status.textContent =
          "네트워크 오류 · 저장된 기사 " +
          news.length +
          "건 표시";
      }
    } else {

      if (status) {
        status.textContent =
          "뉴스를 가져오지 못했습니다. 잠시 후 다시 시도하세요.";
      }
    }
  }

  render();
}


/* =========================================
   버튼 연결
   ========================================= */

const refreshButton =
  document.querySelector("#refresh");

if (refreshButton) {
  refreshButton.onclick = refresh;
}


const quickButton =
  document.querySelector("#quick");

if (quickButton) {
  quickButton.onclick = refresh;
}


const searchButton =
  document.querySelector("#search");

if (searchButton) {
  searchButton.onclick = () => {
    page = "search";
    render();
  };
}


document
  .querySelectorAll("nav button")
  .forEach((button) => {

    button.onclick = () => {
      page = button.dataset.p;
      render();
    };

  });


/* =========================================
   서비스 워커
   ========================================= */

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register("sw.js")
    .catch((error) => {
      console.log("Service Worker 오류:", error);
    });

}


/* =========================================
   시작
   ========================================= */

render();

refresh();


/* 5분마다 자동 업데이트 */

setInterval(refresh, 5 * 60 * 1000);
