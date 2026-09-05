/* =========================================
   북한 NEWS Monitor - app.js
   안정적인 RSS 뉴스 수집 + 분야별 분류 버전
========================================= */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("북한 OR 김정은 OR 북핵 OR 미사일") +
  "&hl=ko&gl=KR&ceid=KR:ko";

let news = [];
let page = "home";
let cat = "전체";

const main = document.querySelector("#main");


/* =========================================
   문자열 안전 처리
========================================= */

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


/* =========================================
   저장 기사
========================================= */

function getSaved() {
  try {
    const data = JSON.parse(
      localStorage.getItem("saved") || "[]"
    );

    return Array.isArray(data) ? data : [];
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

  const index = saved.findIndex(function (x) {
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


/* =========================================
   분야별 분류
========================================= */

function getCategory(item) {

  const text = (
    (item.title || "") +
    " " +
    (item.source || "")
  ).toLowerCase();


  /* 군사/안보 */
  if (
    /미사일|탄도미사일|icbm|핵실험|핵무기|핵탄두|군사|군|무기|발사|잠수함|잠수함발사|slbm|전투기|훈련|포병|방사포|미군|한미연합|안보|국방|정찰위성|위성/.test(text)
  ) {
    return "군사/안보";
  }


  /* 정치/외교 */
  if (
    /김정은|김여정|정치|외교|정상회담|회담|남북|북미|한미|중러|러시아|중국|미국|일본|외무|정부|당대회|노동당|국무위원회|대통령|외교부|통일부/.test(text)
  ) {
    return "정치/외교";
  }


  /* 경제 */
  if (
    /경제|무역|시장|식량|농업|제재|산업|수출|수입|화폐|환율|공장|기업|생산|곡물|쌀|비료|경제개발|관광/.test(text)
  ) {
    return "경제";
  }


  /* 사회/문화 */
  if (
    /사회|문화|교육|학교|학생|주민|생활|보건|의료|병원|체육|스포츠|예술|공연|영화|음악|청년|어린이/.test(text)
  ) {
    return "사회/문화";
  }


  return "정치/외교";
}


/* =========================================
   카테고리 필터
========================================= */

function match(item, category) {

  if (category === "전체") {
    return true;
  }

  return getCategory(item) === category;
}


/* =========================================
   카테고리 버튼
========================================= */

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
      ${categories.map(function (c) {

        return `
          <button
            class="${cat === c ? "on" : ""}"
            onclick="cat=${JSON.stringify(c)};page='news';render()">
            ${esc(c)}
          </button>
        `;

      }).join("")}
    </div>
  `;
}


/* =========================================
   기사 카드
========================================= */

function card(item) {

  const json = JSON.stringify(item)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "&#39;");

  const category = getCategory(item);

  return `
    <div
      class="card"
      onclick='detail(${json})'
    >

      <div class="top">

        <span class="new">
          ${esc(category)}
        </span>

        <button
          class="save"
          onclick='event.stopPropagation();toggle(${json})'
        >
          ${isSaved(item) ? "🔖" : "♡"}
        </button>

      </div>

      <h3>
        ${esc(item.title)}
      </h3>

      <div class="source">
        ${esc(item.source || "출처 미상")}
        ·
        ${esc(item.pub || "최근")}
      </div>

    </div>
  `;
}


/* =========================================
   기사 목록
========================================= */

function list(items) {

  if (!items || items.length === 0) {

    return `
      <div class="empty">
        표시할 기사가 없습니다.<br>
        새로고침을 눌러 다시 확인해 주세요.
      </div>
    `;
  }

  return items
    .slice(0, 30)
    .map(card)
    .join("");
}


/* =========================================
   화면 표시
========================================= */

function render() {

  document
    .querySelectorAll("nav button")
    .forEach(function (button) {

      button.classList.toggle(
        "active",
        button.dataset.p === page
      );

    });


  let html = '<div class="content">';


  /* -----------------------------
     홈
  ----------------------------- */

  if (page === "home") {

    html += `
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

      ${list(
        news.filter(function (item) {
          return match(item, cat);
        })
      )}
    `;
  }


  /* -----------------------------
     뉴스
  ----------------------------- */

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


  /* -----------------------------
     저장
  ----------------------------- */

  else if (page === "saved") {

    html += `
      <div class="title">
        저장됨
      </div>

      ${list(getSaved())}
    `;
  }


  /* -----------------------------
     알림
  ----------------------------- */

  else if (page === "alerts") {

    html += `
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
          앱을 열면 즉시 뉴스를 확인합니다.
        </p>
      </div>
    `;
  }


  /* -----------------------------
     설정
  ----------------------------- */

  else if (page === "settings") {

    html += `
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
          북한 NEWS Monitor · PWA v1.1
        </p>

      </div>
    `;
  }


  /* -----------------------------
     검색
  ----------------------------- */

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

  main.innerHTML = html;
}


/* =========================================
   기사 상세
========================================= */

function detail(item) {

  const json = JSON.stringify(item)
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
        ${esc(item.title)}
      </h2>

      <div class="muted">
        ${esc(item.source || "출처 미상")}
        ·
        ${esc(item.pub || "")}
      </div>

      <div class="card">

        <b>
          ${esc(getCategory(item))}
        </b>

        <p class="muted">
          수집된 기사입니다.
          원문은 아래 버튼으로 확인할 수 있습니다.
        </p>

      </div>

      <button
        class="btn"
        onclick='toggle(${json});detail(${json})'
      >
        ${isSaved(item) ? "저장 취소" : "기사 저장"}
      </button>

      <button
        class="btn"
        onclick='window.open(${JSON.stringify(item.link)}, "_blank")'
      >
        원문 기사 열기
      </button>

    </div>
  `;
}


/* =========================================
   검색
========================================= */

function searchQ() {

  const input =
    document.querySelector("#q");

  if (!input) {
    return;
  }

  const q =
    input.value.trim().toLowerCase();

  const result =
    news.filter(function (item) {

      return (
        (item.title + " " + item.source)
          .toLowerCase()
          .includes(q)
      );

    });

  const resultBox =
    document.querySelector("#res");

  if (resultBox) {
    resultBox.innerHTML =
      list(result);
  }
}


/* =========================================
   네트워크 요청
   핵심: 타임아웃 추가
========================================= */

async function fetchText(url, timeout = 8000) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(function () {
      controller.abort();
    }, timeout);


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
        "HTTP " + response.status
      );
    }


    const text =
      await response.text();


    if (!text || text.length < 50) {
      throw new Error("빈 응답");
    }


    return text;

  } finally {

    clearTimeout(timer);

  }
}


/* =========================================
   RSS XML 파싱
========================================= */

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


  if (items.length === 0) {
    throw new Error(
      "RSS 기사 없음"
    );
  }


  const result =
    items.map(function (item) {

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
        title: title,
        link: link,
        source: source,
        pub: pub
      };

    }).filter(function (item) {

      return (
        item.title &&
        item.link
      );

    });


  if (result.length === 0) {
    throw new Error(
      "유효한 기사 없음"
    );
  }


  return result;
}


/* =========================================
   RSS2JSON
========================================= */

async function getFromRSS2JSON() {

  const url =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(RSS);


  const response =
    await fetchText(url, 8000);


  const data =
    JSON.parse(response);


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
    data.items.map(function (item) {

      return {
        title: item.title || "",
        link: item.link || "",
        source:
          item.author ||
          "Google News",
        pub:
          item.pubDate || ""
      };

    }).filter(function (item) {

      return (
        item.title &&
        item.link
      );

    });


  if (result.length === 0) {
    throw new Error(
      "RSS2JSON 기사 없음"
    );
  }


  return result;
}


/* =========================================
   AllOrigins
========================================= */

async function getFromAllOrigins() {

  const url =
    "https://api.allorigins.win/raw?url=" +
    encodeURIComponent(RSS);


  const xmlText =
    await fetchText(
      url,
      8000
    );


  return parseRSS(xmlText);
}


/* =========================================
   뉴스 저장
========================================= */

function saveNews(result) {

  news =
    result.slice(0, 30);


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );


  const status =
    document.querySelector("#status");


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


  render();
}


/* =========================================
   뉴스 새로고침
========================================= */

async function refresh() {

  const status =
    document.querySelector("#status");


  if (status) {
    status.textContent =
      "최신 뉴스 확인 중...";
  }


  /*
     기존 저장 뉴스가 있으면
     먼저 화면에 보여줌
  */

  if (news.length > 0) {
    render();
  }


  /* -----------------------------
     1차: RSS2JSON
  ----------------------------- */

  try {

    const result =
      await getFromRSS2JSON();


    if (result.length > 0) {

      saveNews(result);

      return;
    }

  } catch (error) {

    console.log(
      "RSS2JSON 실패:",
      error
    );
  }


  /* -----------------------------
     2차: AllOrigins
  ----------------------------- */

  try {

    const result =
      await getFromAllOrigins();


    if (result.length > 0) {

      saveNews(result);

      return;
    }

  } catch (error) {

    console.log(
      "AllOrigins 실패:",
      error
    );
  }


  /* -----------------------------
     기존 데이터 사용
  ----------------------------- */

  try {

    const savedNews =
      JSON.parse(
        localStorage.getItem(
          "news"
        ) || "[]"
      );


    if (
      Array.isArray(savedNews) &&
      savedNews.length > 0
    ) {

      news = savedNews;


      if (status) {

        status.textContent =
          "네트워크 오류 · 저장된 기사 표시";
      }


      render();

      return;
    }

  } catch (error) {

    console.log(
      "저장 뉴스 읽기 실패:",
      error
    );
  }


  /* -----------------------------
     최종 실패
  ----------------------------- */

  if (status) {

    status.textContent =
      "뉴스 연결 실패 · 다시 시도해 주세요";
  }


  render();
}


/* =========================================
   버튼
========================================= */

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


/* =========================================
   하단 메뉴
========================================= */

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


/* =========================================
   저장된 뉴스 불러오기
========================================= */

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
      oldNews;
  }

} catch (error) {

  news = [];
}


/* =========================================
   화면 먼저 표시
========================================= */

render();


/* =========================================
   Service Worker
   캐시 업데이트 확인
========================================= */

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register(
      "sw.js"
    )
    .then(function (registration) {

      registration.update()
        .catch(function () {});

    })
    .catch(function (error) {

      console.log(
        "Service Worker 오류:",
        error
      );

    });
}


/* =========================================
   즉시 뉴스 가져오기
========================================= */

refresh();


/* =========================================
   5분마다 자동 업데이트
========================================= */

setInterval(
  refresh,
  5 * 60 * 1000
);
