/* =========================================
   북한 NEWS Monitor
   안정화된 app.js 전체 버전
========================================= */


/* =========================================
   기본 설정
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
   저장된 뉴스 불러오기
========================================= */

function loadNews() {

  try {

    const data =
      JSON.parse(
        localStorage.getItem("news") || "[]"
      );

    if (Array.isArray(data)) {
      return data;
    }

  } catch (e) {

    console.log("저장된 뉴스 불러오기 실패", e);

  }

  return [];
}


news = loadNews();


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
   저장된 기사
========================================= */

function getSaved() {

  try {

    const data =
      JSON.parse(
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


/* =========================================
   카테고리
========================================= */

function match(item, category) {

  if (category === "전체") {
    return true;
  }


  const rules = {

    "정치/외교":
      "정치|외교|회담|정상|러시아|중국|미국|외무|남북|한국|북한",

    "군사/안보":
      "미사일|핵|군사|군|무기|발사|안보|잠수함|탄도|ICBM|훈련|미군",

    "경제":
      "경제|무역|시장|식량|농업|제재|산업|수출|수입|공장",

    "사회/문화":
      "사회|문화|교육|체육|주민|생활|보건|예술|관광"

  };


  const pattern = rules[category];


  if (!pattern) {
    return true;
  }


  return new RegExp(
    pattern,
    "i"
  ).test(
    (item.title || "") +
    " " +
    (item.source || "")
  );

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

  const json =
    JSON.stringify(item)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "&#39;");


  return `
    <div
      class="card"
      onclick='detail(${json})'>

      <div class="top">

        <span class="new">
          NEW
        </span>

        <button
          class="save"
          onclick='event.stopPropagation();toggle(${json})'>
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
   화면 렌더링
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


  let html =
    '<div class="content">';


  /* -----------------------------------------
     홈
  ----------------------------------------- */

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


  /* -----------------------------------------
     뉴스
  ----------------------------------------- */

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


  /* -----------------------------------------
     저장됨
  ----------------------------------------- */

  else if (page === "saved") {

    html += `

      <div class="title">
        저장됨
      </div>


      ${list(getSaved())}

    `;

  }


  /* -----------------------------------------
     알림
  ----------------------------------------- */

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
          앱을 열면 최신 뉴스를 확인합니다.
          백그라운드 갱신은 브라우저와
          운영체제 정책에 따라 제한될 수 있습니다.
        </p>

      </div>

    `;

  }


  /* -----------------------------------------
     설정
  ----------------------------------------- */

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
          Google News RSS 기반
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


  /* -----------------------------------------
     검색
  ----------------------------------------- */

  else if (page === "search") {

    html += `

      <button
        class="back"
        onclick="page='home';render()">

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
          onclick="searchQ()">

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

  const json =
    JSON.stringify(item)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "&#39;");


  main.innerHTML = `

    <div class="content detail">


      <button
        class="back"
        onclick="page='news';render()">

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
          기사 안내
        </b>

        <p class="muted">

          수집된 기사 제목과 출처입니다.
          원문은 아래 버튼으로 확인할 수 있습니다.

        </p>

      </div>


      <button
        class="btn"
        onclick='toggle(${json});detail(${json})'>

        ${isSaved(item) ? "저장 취소" : "기사 저장"}

      </button>


      <button
        class="btn"
        onclick='openArticle(${JSON.stringify(item.link)})'>

        원문 기사 열기

      </button>


    </div>

  `;

}


/* =========================================
   원문 열기
========================================= */

function openArticle(url) {

  if (!url) {
    return;
  }


  window.open(
    url,
    "_blank"
  );

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


  const resultBox =
    document.querySelector("#res");


  if (resultBox) {

    resultBox.innerHTML =
      list(result);

  }

}


/* =========================================
   네트워크 요청
   일정 시간 이상 응답이 없으면 중단
========================================= */

async function fetchText(url) {

  const controller =
    new AbortController();


  const timer =
    setTimeout(function () {

      controller.abort();

    }, 15000);


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

      throw new Error(
        "응답 데이터가 너무 짧습니다"
      );

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

    })
    .filter(function (item) {

      return (
        item.title &&
        item.link
      );

    });


  if (result.length === 0) {

    throw new Error(
      "유효한 기사가 없습니다"
    );

  }


  return result;

}


/* =========================================
   RSS2JSON
========================================= */

async function getRSS2JSON() {

  const url =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(RSS);


  const text =
    await fetchText(url);


  let data;


  try {

    data =
      JSON.parse(text);

  } catch (e) {

    throw new Error(
      "RSS2JSON JSON 파싱 실패"
    );

  }


  if (
    !data ||
    data.status !== "ok" ||
    !Array.isArray(data.items)
  ) {

    throw new Error(
      "RSS2JSON 서버 오류"
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
      "RSS2JSON 기사 없음"
    );

  }


  return result;

}


/* =========================================
   AllOrigins
========================================= */

async function getAllOrigins() {

  const url =
    "https://api.allorigins.win/raw?url=" +
    encodeURIComponent(RSS);


  const xml =
    await fetchText(url);


  return parseRSS(xml);

}


/* =========================================
   Corsproxy
========================================= */

async function getCorsProxy() {

  const url =
    "https://corsproxy.io/?url=" +
    encodeURIComponent(RSS);


  const xml =
    await fetchText(url);


  return parseRSS(xml);

}


/* =========================================
   CodeTabs Proxy
========================================= */

async function getCodeTabs() {

  const url =
    "https://api.codetabs.com/v1/proxy?quest=" +
    encodeURIComponent(RSS);


  const xml =
    await fetchText(url);


  return parseRSS(xml);

}


/* =========================================
   Google RSS 직접 요청
========================================= */

async function getDirectRSS() {

  const xml =
    await fetchText(RSS);


  return parseRSS(xml);

}


/* =========================================
   중복 실행 방지
========================================= */

let refreshing = false;


/* =========================================
   성공한 뉴스 저장
========================================= */

function saveNews(items) {

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    return false;

  }


  news =
    items
      .filter(function (item) {

        return (
          item &&
          item.title &&
          item.link
        );

      })
      .slice(0, 30);


  if (news.length === 0) {

    return false;

  }


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );


  localStorage.setItem(
    "lastNewsUpdate",
    String(Date.now())
  );


  return true;

}


/* =========================================
   새로고침
========================================= */

async function refresh() {


  /* 이미 가져오는 중이면 중복 실행하지 않음 */

  if (refreshing) {

    console.log(
      "이미 뉴스 업데이트 중입니다."
    );

    return;

  }


  refreshing = true;


  const status =
    document.querySelector("#status");


  if (status) {

    status.textContent =
      "최신 뉴스 확인 중...";

  }


  render();


  const methods = [

    {
      name: "RSS2JSON",
      fn: getRSS2JSON
    },

    {
      name: "AllOrigins",
      fn: getAllOrigins
    },

    {
      name: "CorsProxy",
      fn: getCorsProxy
    },

    {
      name: "CodeTabs",
      fn: getCodeTabs
    },

    {
      name: "Google RSS",
      fn: getDirectRSS
    }

  ];


  let success = false;


  try {


    for (
      let i = 0;
      i < methods.length;
      i++
    ) {


      const method =
        methods[i];


      try {

        console.log(
          method.name +
          " 뉴스 가져오기 시작"
        );


        const result =
          await method.fn();


        if (
          Array.isArray(result) &&
          result.length > 0
        ) {


          if (
            saveNews(result)
          ) {


            success = true;


            console.log(
              method.name +
              " 뉴스 가져오기 성공:",
              result.length
            );


            break;

          }

        }


      } catch (error) {


        console.log(
          method.name +
          " 실패:",
          error
        );


      }


    }


    /* -----------------------------------------
       성공
    ----------------------------------------- */

    if (success) {


      if (status) {

        status.textContent =
          "마지막 업데이트: " +
          new Date()
            .toLocaleTimeString(
              "ko-KR",
              {
                hour: "2-digit",
                minute: "2-digit"
              }
            );

      }


      render();


      return;

    }


    /* -----------------------------------------
       모든 서버 실패
       기존 뉴스는 절대로 삭제하지 않음
    ----------------------------------------- */

    news =
      loadNews();


    if (status) {


      if (news.length > 0) {

        status.textContent =
          "업데이트 실패 · 기존 기사 표시";

      } else {

        status.textContent =
          "뉴스 데이터를 가져오지 못했습니다";

      }

    }


    render();


  } finally {


    refreshing = false;

  }

}


/* =========================================
   버튼 연결
========================================= */

const refreshButton =
  document.querySelector("#refresh");


if (refreshButton) {

  refreshButton.onclick =
    function () {

      refresh();

    };

}


const quickButton =
  document.querySelector("#quick");


if (quickButton) {

  quickButton.onclick =
    function () {

      refresh();

    };

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
   Service Worker
========================================= */

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register("sw.js")
    .then(function () {

      console.log(
        "Service Worker 등록 성공"
      );

    })
    .catch(function (error) {

      console.log(
        "Service Worker 오류:",
        error
      );

    });

}


/* =========================================
   화면 먼저 표시
========================================= */

render();


/* =========================================
   앱 실행 시 뉴스 가져오기
========================================= */

refresh();


/* =========================================
   5분마다 자동 업데이트
========================================= */

setInterval(
  function () {

    refresh();

  },
  5 * 60 * 1000
);
