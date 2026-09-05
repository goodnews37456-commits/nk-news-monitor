/* =========================================================
   북한 NEWS Monitor - app.js
   안정화 버전

   기능
   - Google News RSS
   - 최신순 정렬
   - 카테고리
   - 원문 바로가기
   - 저장
   - 검색
   - 자동 업데이트
   - 네트워크 타임아웃
   - RSS 실패 자동 재시도
   - 기존 뉴스 캐시 표시
   - 이미지 기능 제거
   ========================================================= */

"use strict";


/* =========================================================
   RSS
   ========================================================= */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("북한 OR 김정은 OR 북핵 OR 미사일") +
  "&hl=ko&gl=KR&ceid=KR:ko";


/* =========================================================
   전역 상태
   ========================================================= */

let news = [];

let page = "home";

let cat = "전체";

let refreshing = false;


/* =========================================================
   DOM
   ========================================================= */

const main =
  document.querySelector("#main");


/* =========================================================
   문자열 이스케이프
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
   날짜
   ========================================================= */

function getTime(item) {

  const value =
    item?.pub ||
    item?.pubDate ||
    item?.date ||
    "";

  const time =
    new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;

}


function formatDate(value) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }

  return date.toLocaleString(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================================
   저장 기사
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

  } catch (error) {

    return [];

  }

}


function isSaved(item) {

  return getSaved().some(
    function (x) {

      return x.link === item.link;

    }
  );

}


function toggle(item) {

  let saved =
    getSaved();

  const index =
    saved.findIndex(
      function (x) {

        return x.link === item.link;

      }
    );


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
   카테고리
   ========================================================= */

function getCategory(item) {

  const text = (
    (item.title || "") +
    " " +
    (item.description || "")
  ).toLowerCase();


  /* 군사/안보 */

  if (
    /미사일|탄도미사일|icbm|slbm|핵무기|핵실험|핵탄두|군사|군대|무기|발사|포병|잠수함|전투기|훈련|도발|안보|국방|미군|한미연합|방사포/.test(text)
  ) {

    return "군사/안보";

  }


  /* 정치/외교 */

  if (
    /김정은|정치|외교|정상회담|회담|정상|북한|남북|통일|정부|대통령|미국|중국|러시아|일본|외무성|외무|대사|국무|당대회|노동당|지도자/.test(text)
  ) {

    return "정치/외교";

  }


  /* 경제 */

  if (
    /경제|무역|시장|식량|농업|산업|수출|수입|제재|금융|화폐|공장|기업|농산물|물가|경제협력/.test(text)
  ) {

    return "경제";

  }


  /* 사회/문화 */

  if (
    /사회|문화|교육|학교|학생|체육|스포츠|예술|공연|주민|생활|보건|의료|병원|관광|영화|음악/.test(text)
  ) {

    return "사회/문화";

  }


  return "정치/외교";

}


function match(item, category) {

  if (category === "전체") {

    return true;

  }

  return getCategory(item) === category;

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

      ${categories.map(
        function (c) {

          return `
            <button
              type="button"
              class="catBtn ${cat === c ? "on" : ""}"
              data-category="${esc(c)}">
              ${esc(c)}
            </button>
          `;

        }
      ).join("")}

    </div>
  `;

}


/* =========================================================
   기사 카드
   ========================================================= */

function card(item) {

  const category =
    getCategory(item);

  const saved =
    isSaved(item);


  return `
    <article
      class="card news-card"
      data-link="${esc(item.link)}">

      <div class="news-text">

        <div class="card-top">

          <span class="category-badge">
            ${esc(category)}
          </span>

          <button
            type="button"
            class="save"
            data-save-link="${esc(item.link)}"
            aria-label="기사 저장">
            ${saved ? "🔖" : "♡"}
          </button>

        </div>


        <h3 class="news-title">
          ${esc(item.title)}
        </h3>


        <div class="source">

          ${esc(
            item.source ||
            "Google News"
          )}

          ${
            item.pub
              ? " · " +
                esc(formatDate(item.pub))
              : ""
          }

        </div>

      </div>

    </article>
  `;

}


/* =========================================================
   기사 목록
   ========================================================= */

function list(items) {

  if (
    !items ||
    items.length === 0
  ) {

    return `
      <div class="empty">
        표시할 기사가 없습니다.<br>
        새로고침을 눌러 다시 확인해 주세요.
      </div>
    `;

  }


  const sorted =
    [...items].sort(
      function (a, b) {

        return getTime(b) - getTime(a);

      }
    );


  return sorted
    .slice(0, 50)
    .map(card)
    .join("");

}


/* =========================================================
   화면 렌더링
   ========================================================= */

function render() {

  if (!main) {

    console.error(
      "#main 요소를 찾을 수 없습니다."
    );

    return;

  }


  document
    .querySelectorAll("nav button")
    .forEach(
      function (button) {

        button.classList.toggle(
          "active",
          button.dataset.p === page
        );

      }
    );


  let html =
    '<div class="content">';


  /* =====================================================
     홈
     ===================================================== */

  if (page === "home") {

    html += `

      <div class="card notice">

        <div class="notice-icon">
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
        news.filter(
          function (item) {

            return match(item, cat);

          }
        )
      )}

    `;

  }


  /* =====================================================
     뉴스
     ===================================================== */

  else if (page === "news") {

    html += `

      <div class="title">
        최신 뉴스
      </div>

      ${cats()}

      ${list(
        news.filter(
          function (item) {

            return match(item, cat);

          }
        )
      )}

    `;

  }


  /* =====================================================
     저장
     ===================================================== */

  else if (page === "saved") {

    html += `

      <div class="title">
        저장됨
      </div>

      ${list(getSaved())}

    `;

  }


  /* =====================================================
     알림
     ===================================================== */

  else if (page === "alerts") {

    html += `

      <div class="title">
        알림
      </div>

      <div class="card simple-card">

        <b>
          🔔 새 기사 알림
        </b>

        <p class="muted">
          새로운 북한 관련 기사가
          수집되면 이 화면에서 확인할 수 있습니다.
        </p>

      </div>


      <div class="card simple-card">

        <b>
          자동 업데이트
        </b>

        <p class="muted">
          앱을 열면 최신 뉴스를 확인합니다.
        </p>

      </div>

    `;

  }


  /* =====================================================
     설정
     ===================================================== */

  else if (page === "settings") {

    html += `

      <div class="title">
        설정
      </div>


      <div class="card setting-card">

        <b>
          새 기사 알림
        </b>

        <input
          type="checkbox"
          id="notifyToggle"
          ${
            localStorage.getItem("notify") !== "off"
              ? "checked"
              : ""
          }>

      </div>


      <div class="card simple-card">

        <b>
          뉴스 소스
        </b>

        <p class="muted">
          Google News RSS 기반
        </p>

      </div>


      <div class="card simple-card">

        <b>
          앱 정보
        </b>

        <p class="muted">
          북한 NEWS Monitor · PWA v1.1
        </p>

      </div>

    `;

  }


  /* =====================================================
     검색
     ===================================================== */

  else if (page === "search") {

    html += `

      <button
        type="button"
        class="back"
        id="backHome">
        ‹ 뒤로
      </button>


      <div class="title">
        뉴스 검색
      </div>


      <div class="row">

        <input
          id="q"
          class="input"
          placeholder="북한, 김정은, 북핵, 미사일">


        <button
          type="button"
          class="btn search-btn"
          id="searchSubmit">
          검색
        </button>

      </div>


      <div id="res"></div>

    `;

  }


  html += "</div>";


  main.innerHTML =
    html;


  bindContentEvents();

}


/* =========================================================
   기사 원문 열기
   ========================================================= */

function openArticle(link) {

  if (!link) {

    return;

  }


  /*
     Google News RSS의 링크는
     실제 언론사 원문으로 연결됩니다.
  */

  window.open(
    link,
    "_blank",
    "noopener,noreferrer"
  );

}


/* =========================================================
   콘텐츠 이벤트
   ========================================================= */

function bindContentEvents() {


  /* =====================================================
     카테고리
     ===================================================== */

  document
    .querySelectorAll(".catBtn")
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();
            event.stopPropagation();


            cat =
              button.dataset.category ||
              "전체";


            /*
               카테고리를 눌렀을 때
               뉴스 화면으로 이동
            */

            page = "news";


            render();

          }
        );

      }
    );


  /* =====================================================
     기사 클릭
     ===================================================== */

  document
    .querySelectorAll(".news-card")
    .forEach(
      function (cardElement) {

        cardElement.addEventListener(
          "click",
          function () {

            const link =
              cardElement.dataset.link;

            openArticle(link);

          }
        );

      }
    );


  /* =====================================================
     저장 버튼
     ===================================================== */

  document
    .querySelectorAll("[data-save-link]")
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();
            event.stopPropagation();


            const link =
              button.dataset.saveLink;


            const item =
              news.find(
                function (x) {

                  return x.link === link;

                }
              ) ||
              getSaved().find(
                function (x) {

                  return x.link === link;

                }
              );


            if (item) {

              toggle(item);

            }

          }
        );

      }
    );


  /* =====================================================
     뒤로
     ===================================================== */

  const back =
    document.querySelector(
      "#backHome"
    );


  if (back) {

    back.addEventListener(
      "click",
      function () {

        page = "home";

        render();

      }
    );

  }


  /* =====================================================
     검색
     ===================================================== */

  const searchSubmit =
    document.querySelector(
      "#searchSubmit"
    );


  if (searchSubmit) {

    searchSubmit.addEventListener(
      "click",
      searchQ
    );

  }


  /* =====================================================
     검색 Enter
     ===================================================== */

  const input =
    document.querySelector(
      "#q"
    );


  if (input) {

    input.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Enter"
        ) {

          searchQ();

        }

      }
    );

  }


  /* =====================================================
     알림
     ===================================================== */

  const notify =
    document.querySelector(
      "#notifyToggle"
    );


  if (notify) {

    notify.addEventListener(
      "change",
      function () {

        localStorage.setItem(
          "notify",
          notify.checked
            ? "on"
            : "off"
        );

      }
    );

  }

}


/* =========================================================
   검색
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


  if (!q) {

    const resultBox =
      document.querySelector("#res");

    if (resultBox) {

      resultBox.innerHTML =
        list(news);

    }

    bindContentEvents();

    return;

  }


  const result =
    news.filter(
      function (item) {

        return (
          (
            (item.title || "") +
            " " +
            (item.source || "") +
            " " +
            (item.description || "")
          )
            .toLowerCase()
            .includes(q)
        );

      }
    );


  const resultBox =
    document.querySelector(
      "#res"
    );


  if (resultBox) {

    resultBox.innerHTML =
      list(result);

    bindContentEvents();

  }

}


/* =========================================================
   FETCH 타임아웃
   ========================================================= */

async function fetchWithTimeout(
  url,
  timeout = 8000
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


    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    return await response.text();

  } finally {

    clearTimeout(timer);

  }

}


/* =========================================================
   RSS2JSON
   ========================================================= */

async function getFromRSS2JSON() {

  const url =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(RSS);


  const text =
    await fetchWithTimeout(
      url,
      8000
    );


  const data =
    JSON.parse(text);


  if (
    !data ||
    data.status !== "ok" ||
    !Array.isArray(data.items)
  ) {

    throw new Error(
      "RSS2JSON 오류"
    );

  }


  const result =
    data.items
      .map(
        function (item) {

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
              item.pubDate || "",

            description:
              item.description || ""

          };

        }
      )
      .filter(
        function (item) {

          return (
            item.title &&
            item.link
          );

        }
      );


  if (
    result.length === 0
  ) {

    throw new Error(
      "RSS2JSON 기사 없음"
    );

  }


  return result;

}


/* =========================================================
   AllOrigins
   ========================================================= */

async function getFromAllOrigins() {

  const url =
    "https://api.allorigins.win/raw?url=" +
    encodeURIComponent(RSS);


  const xmlText =
    await fetchWithTimeout(
      url,
      8000
    );


  return parseRSS(xmlText);

}


/* =========================================================
   XML RSS
   ========================================================= */

function parseRSS(xmlText) {

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


  if (
    items.length === 0
  ) {

    throw new Error(
      "RSS 기사 없음"
    );

  }


  const result =
    items
      .map(
        function (item) {

          const title =
            item.querySelector(
              "title"
            )?.textContent?.trim() ||
            "";


          const link =
            item.querySelector(
              "link"
            )?.textContent?.trim() ||
            "";


          const source =
            item.querySelector(
              "source"
            )?.textContent?.trim() ||
            "Google News";


          const pub =
            item.querySelector(
              "pubDate"
            )?.textContent?.trim() ||
            "";


          const description =
            item.querySelector(
              "description"
            )?.textContent ||
            "";


          return {

            title,
            link,
            source,
            pub,
            description

          };

        }
      )
      .filter(
        function (item) {

          return (
            item.title &&
            item.link
          );

        }
      );


  if (
    result.length === 0
  ) {

    throw new Error(
      "기사 없음"
    );

  }


  return result;

}


/* =========================================================
   데이터 정리
   ========================================================= */

function normalizeNews(items) {

  const map =
    new Map();


  items.forEach(
    function (item) {

      if (
        !item ||
        !item.title ||
        !item.link
      ) {

        return;

      }


      const clean = {

        title:
          String(
            item.title
          ).trim(),

        link:
          String(
            item.link
          ).trim(),

        source:
          String(
            item.source ||
            "Google News"
          ).trim(),

        pub:
          String(
            item.pub ||
            item.pubDate ||
            ""
          ).trim(),

        description:
          String(
            item.description ||
            ""
          )

      };


      if (
        !map.has(
          clean.link
        )
      ) {

        map.set(
          clean.link,
          clean
        );

      }

    }
  );


  return Array.from(
    map.values()
  ).sort(
    function (a, b) {

      return getTime(b) -
             getTime(a);

    }
  );

}


/* =========================================================
   뉴스 적용
   ========================================================= */

function applyNews(result) {

  const normalized =
    normalizeNews(result);


  if (
    !normalized ||
    normalized.length === 0
  ) {

    throw new Error(
      "정리된 기사 없음"
    );

  }


  news =
    normalized;


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );


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

}


/* =========================================================
   상태 표시
   ========================================================= */

function updateStatus(text) {

  const status =
    document.querySelector(
      "#status"
    );


  if (status) {

    status.textContent =
      text;

  }

}


/* =========================================================
   저장된 뉴스 불러오기
   ========================================================= */

function loadStoredNews() {

  try {

    const oldNews =
      JSON.parse(
        localStorage.getItem(
          "news"
        ) || "[]"
      );


    if (
      Array.isArray(oldNews)
    ) {

      news =
        normalizeNews(
          oldNews
        );

    } else {

      news = [];

    }

  } catch (error) {

    news = [];

  }

}


/* =========================================================
   뉴스 새로고침
   ========================================================= */

async function refresh() {

  /*
     중복 요청 방지
  */

  if (refreshing) {

    return;

  }


  refreshing = true;


  updateStatus(
    "최신 뉴스 확인 중..."
  );


  /*
     이미 저장된 뉴스가 있다면
     화면을 먼저 보여줍니다.
  */

  if (
    news.length > 0
  ) {

    render();

  }


  /* =====================================================
     1. RSS2JSON
     ===================================================== */

  try {

    console.log(
      "[NEWS] RSS2JSON 요청"
    );


    const result =
      await getFromRSS2JSON();


    console.log(
      "[NEWS] RSS2JSON 성공:",
      result.length
    );


    applyNews(result);

    refreshing = false;

    return;

  } catch (error) {

    console.log(
      "[NEWS] RSS2JSON 실패:",
      error
    );

  }


  /* =====================================================
     2. AllOrigins
     ===================================================== */

  try {

    console.log(
      "[NEWS] AllOrigins 요청"
    );


    const result =
      await getFromAllOrigins();


    console.log(
      "[NEWS] AllOrigins 성공:",
      result.length
    );


    applyNews(result);

    refreshing = false;

    return;

  } catch (error) {

    console.log(
      "[NEWS] AllOrigins 실패:",
      error
    );

  }


  /* =====================================================
     3. 실패
     ===================================================== */

  /*
     기존 뉴스가 있으면 그것을 표시
  */

  loadStoredNews();


  if (
    news.length > 0
  ) {

    updateStatus(
      "연결 오류 · 저장된 기사 표시"
    );

  } else {

    updateStatus(
      "뉴스를 불러오지 못했습니다"
    );

  }


  render();


  refreshing = false;

}


/* =========================================================
   상단 새로고침
   ========================================================= */

const refreshButton =
  document.querySelector(
    "#refresh"
  );


if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    function () {

      refresh();

    }
  );

}


/* =========================================================
   빠른 새로고침
   ========================================================= */

const quickButton =
  document.querySelector(
    "#quick"
  );


if (quickButton) {

  quickButton.addEventListener(
    "click",
    function () {

      refresh();

    }
  );

}


/* =========================================================
   검색 버튼
   ========================================================= */

const searchButton =
  document.querySelector(
    "#search"
  );


if (searchButton) {

  searchButton.addEventListener(
    "click",
    function () {

      page = "search";

      render();

    }
  );

}


/* =========================================================
   하단 메뉴
   ========================================================= */

document
  .querySelectorAll("nav button")
  .forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          page =
            button.dataset.p ||
            "home";


          /*
             뉴스 메뉴로 들어갈 때
             현재 선택된 카테고리를 유지
          */

          render();

        }
      );

    }
  );


/* =========================================================
   Service Worker
   ========================================================= */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    function () {

      navigator.serviceWorker
        .register(
          "sw.js?v=20260905-01",
          {
            updateViaCache: "none"
          }
        )
        .then(
          function (registration) {

            console.log(
              "[SW] 등록 완료"
            );


            /*
               새 SW가 있으면 즉시 업데이트 확인
            */

            registration.update();

          }
        )
        .catch(
          function (error) {

            console.log(
              "[SW] 오류:",
              error
            );

          }
        );

    }
  );

}


/* =========================================================
   기존 뉴스
   ========================================================= */

loadStoredNews();


/* =========================================================
   최초 화면
   ========================================================= */

render();


/* =========================================================
   최초 뉴스 가져오기
   ========================================================= */

refresh();


/* =========================================================
   5분 자동 업데이트
   ========================================================= */

setInterval(
  function () {

    refresh();

  },
  5 * 60 * 1000
);


/* =========================================================
   페이지가 다시 활성화될 때 업데이트
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  function () {

    if (
      document.visibilityState ===
      "visible"
    ) {

      refresh();

    }

  }
);
