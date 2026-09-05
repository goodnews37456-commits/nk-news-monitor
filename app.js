// ============================================================
// 북한 NEWS Monitor - app.js
// ============================================================

// Google News RSS
const RSS =
  "https://news.google.com/rss/search?q=%EB%B6%81%ED%95%9C+OR+%EA%B9%80%EC%A0%95%EC%9D%80+OR+%EB%B6%81%ED%95%B5+OR+%EB%AF%B8%EC%82%AC%EC%9D%BC&hl=ko&gl=KR&ceid=KR:ko";

// ------------------------------------------------------------
// 기본 상태
// ------------------------------------------------------------

let news = [];

try {
  news = JSON.parse(localStorage.getItem("news") || "[]");
} catch (e) {
  news = [];
}

let page = "home";
let cat = "전체";

const main = document.querySelector("#main");
const statusEl = document.querySelector("#status");

// ------------------------------------------------------------
// HTML 특수문자 처리
// ------------------------------------------------------------

function esc(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c];
    }
  );
}

// ------------------------------------------------------------
// 저장 기사
// ------------------------------------------------------------

function getSaved() {
  try {
    return JSON.parse(localStorage.getItem("saved") || "[]");
  } catch (e) {
    return [];
  }
}

function isSaved(article) {
  return getSaved().some(function (item) {
    return item.link === article.link;
  });
}

function toggleSave(article) {
  let list = getSaved();

  const index = list.findIndex(function (item) {
    return item.link === article.link;
  });

  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.unshift(article);
  }

  localStorage.setItem("saved", JSON.stringify(list));

  render();
}

// ------------------------------------------------------------
// 카테고리
// ------------------------------------------------------------

function matchCategory(article, category) {

  if (category === "전체") {
    return true;
  }

  const keywords = {
    "정치/외교":
      "정치|외교|회담|정상회담|러시아|중국|미국|한국|남북|대화|협상|김정은",

    "군사/안보":
      "미사일|핵|군|무기|발사|안보|잠수함|탄도|ICBM|군사|훈련|미사일",

    "경제":
      "경제|무역|시장|식량|농업|제재|산업|공장|수출|수입|금융",

    "사회/문화":
      "사회|문화|교육|체육|주민|생활|학교|예술|공연|관광"
  };

  const pattern = keywords[category];

  if (!pattern) {
    return true;
  }

  const text =
    (article.title || "") +
    " " +
    (article.description || "");

  return new RegExp(pattern, "i").test(text);
}

// ------------------------------------------------------------
// 카테고리 버튼
// ------------------------------------------------------------

function categoryButtons() {

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
        .map(function (category) {

          return `
            <button
              class="${cat === category ? "on" : ""}"
              onclick="selectCategory('${category}')"
            >
              ${category}
            </button>
          `;

        })
        .join("")}
    </div>
  `;
}

function selectCategory(category) {
  cat = category;
  page = "news";
  render();
}

// ------------------------------------------------------------
// 기사 카드
// ------------------------------------------------------------

function articleCard(article) {

  const json = JSON.stringify(article)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "&#39;");

  return `
    <div class="card article-card"
         onclick='openDetail(${json})'>

      <div class="top">

        <span class="new">
          NEW
        </span>

        <button
          class="save"
          onclick='event.stopPropagation();toggleSave(${json})'
        >
          ${isSaved(article) ? "🔖" : "♡"}
        </button>

      </div>

      <h3>
        ${esc(article.title)}
      </h3>

      <div class="source">
        ${esc(article.source || "출처 미상")}
        ·
        ${esc(article.pub || "최근")}
      </div>

    </div>
  `;
}

// ------------------------------------------------------------
// 기사 목록
// ------------------------------------------------------------

function articleList(list) {

  if (!list || list.length === 0) {

    return `
      <div class="empty">
        표시할 기사가 없습니다.
        <br><br>
        위의 ↻ 버튼을 눌러 다시 확인해 주세요.
      </div>
    `;
  }

  return list
    .slice(0, 30)
    .map(articleCard)
    .join("");
}

// ------------------------------------------------------------
// 홈 / 뉴스 / 저장 / 알림 / 설정 / 검색 화면
// ------------------------------------------------------------

function render() {

  if (!main) {
    return;
  }

  document
    .querySelectorAll("nav button")
    .forEach(function (button) {

      button.classList.toggle(
        "active",
        button.dataset.p === page
      );

    });

  let html = `<div class="content">`;

  // ----------------------------------------------------------
  // 홈
  // ----------------------------------------------------------

  if (page === "home") {

    html += `

      <div class="card notice">

        <div style="font-size:28px">
          🔔
        </div>

        <div>
          <b>새로운 기사가 도착했습니다</b>

          <div class="muted">
            최신 북한 관련 뉴스를 확인하세요
          </div>
        </div>

      </div>

      ${categoryButtons()}

      ${articleList(
        news.filter(function (article) {
          return matchCategory(article, cat);
        })
      )}

    `;
  }

  // ----------------------------------------------------------
  // 뉴스
  // ----------------------------------------------------------

  else if (page === "news") {

    html += `

      <div class="title">
        최신 뉴스
      </div>

      ${categoryButtons()}

      ${articleList(
        news.filter(function (article) {
          return matchCategory(article, cat);
        })
      )}

    `;
  }

  // ----------------------------------------------------------
  // 저장됨
  // ----------------------------------------------------------

  else if (page === "saved") {

    html += `

      <div class="title">
        저장됨
      </div>

      ${articleList(getSaved())}

    `;
  }

  // ----------------------------------------------------------
  // 알림
  // ----------------------------------------------------------

  else if (page === "alerts") {

    html += `

      <div class="title">
        알림
      </div>

      <div class="card">

        <b>
          🔔 새 기사 알림
        </b>

        <p class="muted">
          새로운 북한 관련 기사가 수집되면
          이 화면에서 확인할 수 있습니다.
        </p>

      </div>

      <div class="card">

        <b>
          자동 업데이트
        </b>

        <p class="muted">
          앱을 열면 즉시 뉴스를 확인합니다.
          평상시에는 5분마다 자동으로 확인합니다.
        </p>

      </div>

    `;
  }

  // ----------------------------------------------------------
  // 설정
  // ----------------------------------------------------------

  else if (page === "settings") {

    const notificationEnabled =
      localStorage.getItem("notify") !== "off";

    html += `

      <div class="title">
        설정
      </div>

      <div class="card">

        <b>
          새 기사 알림
        </b>

        <input
          type="checkbox"
          ${notificationEnabled ? "checked" : ""}
          onchange="
            localStorage.setItem(
              'notify',
              this.checked ? 'on' : 'off'
            )
          "
        >

      </div>

      <div class="card">

        <b>
          자동 업데이트
        </b>

        <p class="muted">
          앱 실행 시 즉시 업데이트하며
          평상시 5분마다 확인합니다.
        </p>

      </div>

      <div class="card">

        <b>
          뉴스 소스
        </b>

        <p class="muted">
          Google News RSS
        </p>

      </div>

      <div class="card">

        <b>
          앱 정보
        </b>

        <p class="muted">
          북한 NEWS Monitor · PWA v1.0
        </p>

      </div>

    `;
  }

  // ----------------------------------------------------------
  // 검색
  // ----------------------------------------------------------

  else if (page === "search") {

    html += `

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
          onclick="searchNews()"
        >
          검색
        </button>

      </div>

      <div id="res">
      </div>

    `;
  }

  html += `</div>`;

  main.innerHTML = html;
}

// ------------------------------------------------------------
// 기사 상세
// ------------------------------------------------------------

function openDetail(article) {

  const json = JSON.stringify(article)
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
        ${esc(article.title)}
      </h2>

      <div class="muted">
        ${esc(article.source || "")}
        ·
        ${esc(article.pub || "")}
      </div>

      <div class="card">

        <b>
          기사 안내
        </b>

        <p class="muted">
          수집된 기사 제목과 출처입니다.
          원문은 아래 버튼을 눌러 확인할 수 있습니다.
        </p>

      </div>

      <button
        class="btn"
        onclick='toggleSave(${json});openDetail(${json})'
      >
        ${isSaved(article) ? "저장 취소" : "기사 저장"}
      </button>

      <button
        class="btn"
        onclick='openOriginal(${JSON.stringify(article.link)})'
      >
        원문 기사 열기
      </button>

    </div>
  `;
}

function openOriginal(url) {

  if (!url) {
    return;
  }

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

// ------------------------------------------------------------
// 검색
// ------------------------------------------------------------

function searchNews() {

  const input = document.querySelector("#q");

  const resultBox =
    document.querySelector("#res");

  if (!input || !resultBox) {
    return;
  }

  const keyword =
    input.value.trim().toLowerCase();

  if (!keyword) {

    resultBox.innerHTML = `
      <div class="empty">
        검색어를 입력해 주세요.
      </div>
    `;

    return;
  }

  const result = news.filter(function (article) {

    const text =
      (article.title || "") +
      " " +
      (article.source || "") +
      " " +
      (article.description || "");

    return text
      .toLowerCase()
      .includes(keyword);

  });

  resultBox.innerHTML =
    articleList(result);
}

// ------------------------------------------------------------
// RSS XML → 기사 변환
// ------------------------------------------------------------

function parseRSS(xmlText) {

  const parser =
    new DOMParser();

  const xml =
    parser.parseFromString(
      xmlText,
      "text/xml"
    );

  const parserError =
    xml.querySelector("parsererror");

  if (parserError) {
    throw new Error(
      "RSS XML을 읽을 수 없습니다."
    );
  }

  const items =
    [...xml.querySelectorAll("item")];

  if (!items.length) {
    throw new Error(
      "RSS 기사 항목이 없습니다."
    );
  }

  return items
    .slice(0, 30)
    .map(function (item) {

      return {

        title:
          item.querySelector("title")
            ?.textContent
            ?.trim() || "",

        link:
          item.querySelector("link")
            ?.textContent
            ?.trim() || "",

        source:
          item.querySelector("source")
            ?.textContent
            ?.trim() ||
          "Google News",

        pub:
          item.querySelector("pubDate")
            ?.textContent
            ?.trim() || "",

        description:
          item.querySelector("description")
            ?.textContent
            ?.trim() || ""

      };

    })
    .filter(function (article) {

      return article.title &&
             article.link;

    });
}

// ------------------------------------------------------------
// RSS 가져오기
// ------------------------------------------------------------

async function fetchRSS() {

  // 첫 번째 방법
  const allOriginsURL =
    "https://api.allorigins.win/raw?url=" +
    encodeURIComponent(RSS);

  try {

    const response =
      await fetch(
        allOriginsURL,
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

    const articles =
      parseRSS(text);

    if (articles.length) {
      return articles;
    }

  } catch (error) {

    console.log(
      "첫 번째 RSS 접근 실패:",
      error
    );

  }

  // 두 번째 방법
  const corsProxy =
    "https://corsproxy.io/?" +
    encodeURIComponent(RSS);

  try {

    const response =
      await fetch(
        corsProxy,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "CorsProxy HTTP " +
        response.status
      );
    }

    const text =
      await response.text();

    const articles =
      parseRSS(text);

    if (articles.length) {
      return articles;
    }

  } catch (error) {

    console.log(
      "두 번째 RSS 접근 실패:",
      error
    );

  }

  throw new Error(
    "뉴스 RSS를 가져오지 못했습니다."
  );
}

// ------------------------------------------------------------
// 뉴스 업데이트
// ------------------------------------------------------------

async function refresh() {

  if (statusEl) {

    statusEl.textContent =
      "최신 뉴스 확인 중...";

  }

  try {

    const articles =
      await fetchRSS();

    news = articles;

    localStorage.setItem(
      "news",
      JSON.stringify(news)
    );

    const time =
      new Date().toLocaleTimeString(
        "ko-KR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    if (statusEl) {

      statusEl.textContent =
        "마지막 업데이트: " +
        time +
        " · " +
        news.length +
        "건";

    }

    render();

  } catch (error) {

    console.error(
      "뉴스 업데이트 실패:",
      error
    );

    if (statusEl) {

      statusEl.textContent =
        news.length
          ? "업데이트 실패 · 저장된 기사 표시"
          : "뉴스를 가져오지 못했습니다.";

    }

    render();
  }
}

// ------------------------------------------------------------
// 버튼 연결
// ------------------------------------------------------------

const refreshButton =
  document.querySelector("#refresh");

if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    refresh
  );

}

const quickButton =
  document.querySelector("#quick");

if (quickButton) {

  quickButton.addEventListener(
    "click",
    refresh
  );

}

const searchButton =
  document.querySelector("#search");

if (searchButton) {

  searchButton.addEventListener(
    "click",
    function () {

      page = "search";

      render();

      setTimeout(function () {

        const input =
          document.querySelector("#q");

        if (input) {
          input.focus();
        }

      }, 50);

    }
  );

}

// ------------------------------------------------------------
// 하단 메뉴
// ------------------------------------------------------------

document
  .querySelectorAll("nav button")
  .forEach(function (button) {

    button.addEventListener(
      "click",
      function () {

        page =
          button.dataset.p;

        render();

      }
    );

  });

// ------------------------------------------------------------
// Service Worker
// ------------------------------------------------------------

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register("./sw.js")
    .then(function () {

      console.log(
        "Service Worker 등록 완료"
      );

    })
    .catch(function (error) {

      console.log(
        "Service Worker 등록 실패:",
        error
      );

    });

}

// ------------------------------------------------------------
// 앱 시작
// ------------------------------------------------------------

// 기존 저장 뉴스가 있으면 먼저 표시
render();

// 앱을 열었을 때 즉시 업데이트
refresh();

// 평상시 5분마다 업데이트
setInterval(
  refresh,
  5 * 60 * 1000
);

// 앱이 다시 화면에 나타날 때 업데이트
document.addEventListener(
  "visibilitychange",
  function () {

    if (
      document.visibilityState === "visible"
    ) {
      refresh();
    }

  }
);
