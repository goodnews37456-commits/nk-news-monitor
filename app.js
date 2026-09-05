/* =========================================================
   북한 NEWS Monitor
   app.js - 뉴스 수집 안정화 버전
   ========================================================= */


/* =========================================================
   1. 기본 설정
   ========================================================= */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent(
    "북한 OR 김정은 OR 북핵 OR 미사일"
  ) +
  "&hl=ko&gl=KR&ceid=KR:ko";


let news = [];
let page = "home";
let cat = "전체";

const main = document.querySelector("#main");


/* =========================================================
   2. 문자열 안전 처리
   ========================================================= */

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


/* =========================================================
   3. 저장된 기사
   ========================================================= */

function getSaved() {

  try {

    const data =
      JSON.parse(
        localStorage.getItem("saved") || "[]"
      );

    return Array.isArray(data)
      ? data
      : [];

  } catch (e) {

    return [];

  }

}


function isSaved(item) {

  return getSaved().some(function (x) {

    return x.link === item.link;

  });

}


function toggle(item) {

  let saved = getSaved();

  const index =
    saved.findIndex(function (x) {

      return x.link === item.link;

    });


  if (index >= 0) {

    saved.splice(index, 1);

  } else {

    saved.unshift(item);

  }


  localStorage.setItem(
    "saved",
    JSON.stringify(saved)
  );


  render();

}


/* =========================================================
   4. 카테고리
   ========================================================= */

function match(item, category) {

  if (category === "전체") {

    return true;

  }


  const rules = {

    "정치/외교":
      "정치|외교|회담|정상|러시아|중국|미국|외무|남북|대화",

    "군사/안보":
      "미사일|핵|군사|군|무기|발사|안보|잠수함|탄도|ICBM|훈련|미군",

    "경제":
      "경제|무역|시장|식량|농업|제재|산업|수출|수입|돈|기업",

    "사회/문화":
      "사회|문화|교육|체육|주민|생활|보건|예술|학교"

  };


  const pattern = rules[category];


  if (!pattern) {

    return true;

  }


  return new RegExp(
    pattern,
    "i"
  ).test(
    item.title || ""
  );

}


/* =========================================================
   5. 카테고리 버튼
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

      ${
        categories
          .map(function (c) {

            return `
              <button
                class="${cat === c ? "on" : ""}"
                onclick="selectCategory(${JSON.stringify(c)})">
                ${esc(c)}
              </button>
            `;

          })
          .join("")
      }

    </div>
  `;

}


/* =========================================================
   6. 카테고리 선택
   ========================================================= */

function selectCategory(category) {

  cat = category;

  page = "news";

  render();

}


/* =========================================================
   7. 기사 카드
   ========================================================= */

function card(item) {

  const title =
    esc(item.title || "제목 없음");

  const source =
    esc(item.source || "Google News");

  const pub =
    esc(item.pub || "최근");


  return `
    <div
      class="card"
      onclick="openDetailByLink(${JSON.stringify(item.link)})"
    >

      <div class="top">

        <span class="new">
          NEW
        </span>

        <button
          class="save"
          onclick="event.stopPropagation();toggleByLink(${JSON.stringify(item.link)})"
        >
          ${isSaved(item) ? "🔖" : "♡"}
        </button>

      </div>


      <h3>
        ${title}
      </h3>


      <div class="source">

        ${source}
        ·
        ${pub}

      </div>

    </div>
  `;

}


/* =========================================================
   8. 기사 링크로 기사 찾기
   ========================================================= */

function findNewsByLink(link) {

  return news.find(function (item) {

    return item.link === link;

  });

}


function toggleByLink(link) {

  const item =
    findNewsByLink(link);


  if (item) {

    toggle(item);

  }

}


/* =========================================================
   9. 기사 상세 열기
   ========================================================= */

function openDetailByLink(link) {

  const item =
    findNewsByLink(link);


  if (item) {

    detail(item);

  }

}


/* =========================================================
   10. 기사 목록
   ========================================================= */

function list(items) {

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    return `
      <div class="empty">

        표시할 기사가 없습니다.<br>

        <span style="font-size:14px;">
          잠시 후 새로고침해 주세요.
        </span>

      </div>
    `;

  }


  return items
    .slice(0, 30)
    .map(card)
    .join("");

}


/* =========================================================
   11. 화면 렌더링
   ========================================================= */

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


  let html =
    '<div class="content">';


  /* -------------------------
     홈
  ------------------------- */

  if (page === "home") {

    html += `

      <div class="card notice">

        <div>
          🔔
        </div>

        <div>

          <b>
            새로운 기사가 도착했습니다
          </b>

          <div class="muted">
            최신 북한 관련 뉴스를 확인하세요
          </div>

        </div>

      </div>

      ${cats()}

      ${list(
        news.filter(function (item) {

          return match(item, cat);

        })
      )}

    `;

  }


  /* -------------------------
     뉴스
  ------------------------- */

  else if (page === "news") {

    html += `

      <div class="title">
        최신 뉴스
      </div>

      ${cats()}

      ${list(
        news.filter(function (item) {

          return match(item, cat);

        })
      )}

    `;

  }


  /* -------------------------
     저장됨
  ------------------------- */

  else if (page === "saved") {

    html += `

      <div class="title">
        저장됨
      </div>

      ${list(getSaved())}

    `;

  }


  /* -------------------------
     알림
  ------------------------- */

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

          새로운 북한 관련 기사가
          수집되면 이 화면에서 확인할 수 있습니다.

        </p>

      </div>


      <div class="card">

        <b>
          자동 업데이트
        </b>

        <p class="muted">

          앱을 열면 최신 뉴스를 확인합니다.

        </p>

      </div>

    `;

  }


  /* -------------------------
     설정
  ------------------------- */

  else if (page === "settings") {

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


  /* -------------------------
     검색
  ------------------------- */

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
          onclick="searchQ()"
        >
          검색
        </button>

      </div>


      <div id="res"></div>

    `;

  }


  html += "</div>";


  main.innerHTML =
    html;

}


/* =========================================================
   12. 기사 상세
   ========================================================= */

function detail(item) {

  const title =
    esc(item.title || "제목 없음");

  const source =
    esc(item.source || "Google News");

  const pub =
    esc(item.pub || "");


  main.innerHTML = `

    <div class="content detail">


      <button
        class="back"
        onclick="page='news';render()"
      >
        ‹ 뒤로
      </button>


      <h2>
        ${title}
      </h2>


      <div class="muted">

        ${source}
        ·
        ${pub}

      </div>


      <div class="card">

        <b>
          기사 안내
        </b>

        <p class="muted">

          수집된 기사 제목과 출처입니다.
          아래 버튼을 누르면 원문으로 이동합니다.

        </p>

      </div>


      <button
        class="btn"
        onclick="toggleByLink(${JSON.stringify(item.link)});openDetailByLink(${JSON.stringify(item.link)})"
      >
        ${isSaved(item) ? "저장 취소" : "기사 저장"}
      </button>


      <button
        class="btn"
        onclick="openOriginal(${JSON.stringify(item.link)})"
      >
        원문 기사 열기
      </button>


    </div>

  `;

}


/* =========================================================
   13. 원문 열기
   ========================================================= */

function openOriginal(link) {

  if (!link) {

    return;

  }


  window.open(
    link,
    "_blank"
  );

}


/* =========================================================
   14. 검색
   ========================================================= */

function searchQ() {

  const input =
    document.querySelector("#q");


  if (!input) {

    return;

  }


  const q =
    input.value
      .trim()
      .toLowerCase();


  const result =
    news.filter(function (item) {

      return (
        (item.title || "") +
        " " +
        (item.source || "")
      )
        .toLowerCase()
        .includes(q);

    });


  const box =
    document.querySelector("#res");


  if (box) {

    box.innerHTML =
      list(result);

  }

}


/* =========================================================
   15. Fetch 타임아웃
   ========================================================= */

async function fetchWithTimeout(
  url,
  timeout = 15000
) {

  const controller =
    new AbortController();


  const timer =
    setTimeout(
      function () {
        controller.abort();
      },
      timeout
    );


  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        }
      );


    clearTimeout(timer);


    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );

    }


    return response;

  } catch (error) {

    clearTimeout(timer);

    throw error;

  }

}


/* =========================================================
   16. RSS2JSON
   ========================================================= */

async function getRSS2JSON() {

  const url =
    "https://api.rss2json.com/v1/api.json" +
    "?rss_url=" +
    encodeURIComponent(RSS);


  const response =
    await fetchWithTimeout(
      url,
      15000
    );


  const data =
    await response.json();


  if (
    !data ||
    data.status !== "ok" ||
    !Array.isArray(data.items)
  ) {

    throw new Error(
      "RSS2JSON에서 기사를 받지 못했습니다."
    );

  }


  const result =
    data.items
      .map(function (item) {

        return {

          title:
            item.title || "",

          link:
            item.link || "",

          source:
            item.author ||
            item.source ||
            "Google News",

          pub:
            item.pubDate || ""

        };

      })
      .filter(function (item) {

        return (
          item.title &&
          item.link
        );

      });


  if (result.length === 0) {

    throw new Error(
      "RSS2JSON 기사 목록이 비어 있습니다."
    );

  }


  return result;

}


/* =========================================================
   17. AllOrigins
   ========================================================= */

async function getAllOrigins() {

  const url =
    "https://api.allorigins.win/get?url=" +
    encodeURIComponent(RSS);


  const response =
    await fetchWithTimeout(
      url,
      15000
    );


  const data =
    await response.json();


  if (
    !data ||
    !data.contents
  ) {

    throw new Error(
      "AllOrigins 응답이 비어 있습니다."
    );

  }


  return parseRSS(
    data.contents
  );

}


/* =========================================================
   18. RSS XML 직접 파싱
   ========================================================= */

function parseRSS(xmlText) {

  if (!xmlText) {

    throw new Error(
      "RSS 데이터가 없습니다."
    );

  }


  const parser =
    new DOMParser();


  const xml =
    parser.parseFromString(
      xmlText,
      "text/xml"
    );


  if (
    xml.querySelector("parsererror")
  ) {

    throw new Error(
      "RSS XML 파싱 실패"
    );

  }


  const items =
    Array.from(
      xml.querySelectorAll("item")
    );


  if (items.length === 0) {

    throw new Error(
      "RSS에서 기사를 찾지 못했습니다."
    );

  }


  const result =
    items
      .map(function (item) {

        const title =
          item.querySelector("title")
            ?.textContent
            ?.trim() || "";


        const link =
          item.querySelector("link")
            ?.textContent
            ?.trim() || "";


        const source =
          item.querySelector("source")
            ?.textContent
            ?.trim() ||
          "Google News";


        const pub =
          item.querySelector("pubDate")
            ?.textContent
            ?.trim() || "";


        return {

          title:
            title,

          link:
            link,

          source:
            source,

          pub:
            pub

        };

      })
      .filter(function (item) {

        return (
          item.title &&
          item.link
        );

      });


  if (result.length === 0) {

    throw new Error(
      "RSS 기사 데이터가 비어 있습니다."
    );

  }


  return result;

}


/* =========================================================
   19. Google RSS 직접 요청
   ========================================================= */

async function getDirectRSS() {

  const response =
    await fetchWithTimeout(
      RSS,
      15000
    );


  const text =
    await response.text();


  return parseRSS(
    text
  );

}


/* =========================================================
   20. 뉴스 저장
   ========================================================= */

function saveNews(items) {

  news =
    items
      .slice(0, 30);


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );

}


/* =========================================================
   21. 업데이트 시간
   ========================================================= */

function updateStatus(text) {

  const status =
    document.querySelector("#status");


  if (status) {

    status.textContent =
      text;

  }

}


/* =========================================================
   22. 뉴스 새로고침
   ========================================================= */

async function refresh() {

  updateStatus(
    "최신 뉴스 확인 중..."
  );


  /*
   -----------------------------------------
   방법 1
   RSS2JSON
   -----------------------------------------
  */

  try {

    console.log(
      "뉴스 가져오기: RSS2JSON"
    );


    const result =
      await getRSS2JSON();


    if (result.length > 0) {

      saveNews(result);


      updateStatus(
        "마지막 업데이트: " +
        new Date().toLocaleTimeString(
          "ko-KR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )
      );


      render();

      return;

    }

  } catch (error) {

    console.error(
      "RSS2JSON 실패:",
      error
    );

  }


  /*
   -----------------------------------------
   방법 2
   AllOrigins
   -----------------------------------------
  */

  try {

    console.log(
      "뉴스 가져오기: AllOrigins"
    );


    const result =
      await getAllOrigins();


    if (result.length > 0) {

      saveNews(result);


      updateStatus(
        "마지막 업데이트: " +
        new Date().toLocaleTimeString(
          "ko-KR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )
      );


      render();

      return;

    }

  } catch (error) {

    console.error(
      "AllOrigins 실패:",
      error
    );

  }


  /*
   -----------------------------------------
   방법 3
   Google RSS 직접 요청
   -----------------------------------------
  */

  try {

    console.log(
      "뉴스 가져오기: Google RSS"
    );


    const result =
      await getDirectRSS();


    if (result.length > 0) {

      saveNews(result);


      updateStatus(
        "마지막 업데이트: " +
        new Date().toLocaleTimeString(
          "ko-KR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )
      );


      render();

      return;

    }

  } catch (error) {

    console.error(
      "Google RSS 직접 요청 실패:",
      error
    );

  }


  /*
   -----------------------------------------
   기존 저장 데이터 사용
   -----------------------------------------
  */

  try {

    const saved =
      JSON.parse(
        localStorage.getItem("news") ||
        "[]"
      );


    news =
      Array.isArray(saved)
        ? saved
        : [];

  } catch (error) {

    news = [];

  }


  if (news.length > 0) {

    updateStatus(
      "네트워크 오류 · 저장된 기사 표시"
    );

  } else {

    updateStatus(
      "뉴스 데이터를 가져오지 못했습니다"
    );

  }


  render();

}


/* =========================================================
   23. 버튼 연결
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
    function () {

      page = "search";

      render();

    };

}


/* =========================================================
   24. 하단 메뉴
   ========================================================= */

document
  .querySelectorAll("nav button")
  .forEach(function (button) {

    button.onclick =
      function () {

        page =
          button.dataset.p;

        render();

      };

  });


/* =========================================================
   25. Service Worker
   ========================================================= */

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register("sw.js")
    .catch(function (error) {

      console.log(
        "Service Worker 오류:",
        error
      );

    });

}


/* =========================================================
   26. 기존 뉴스 불러오기
   ========================================================= */

try {

  const savedNews =
    JSON.parse(
      localStorage.getItem("news") ||
      "[]"
    );


  if (
    Array.isArray(savedNews)
  ) {

    news =
      savedNews;

  }

} catch (error) {

  news = [];

}


/* =========================================================
   27. 최초 화면
   ========================================================= */

render();


/* =========================================================
   28. 앱 시작 즉시 뉴스 가져오기
   ========================================================= */

refresh();


/* =========================================================
   29. 5분마다 자동 업데이트
   ========================================================= */

setInterval(
  refresh,
  5 * 60 * 1000
);
