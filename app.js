/* =========================================
   북한 NEWS Monitor - app.js
   안정화 통합 버전
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
   안전한 문자열 처리
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
   저장 기능
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
   기사 분류
========================================= */

function classify(item) {

  const text = (
    (item.title || "") +
    " " +
    (item.source || "")
  ).toLowerCase();


  /* 군사/안보 */

  const military =
    /미사일|탄도|icbm|핵무기|핵실험|군사|군대|무기|발사|잠수함|전투기|훈련|포병|미군|군단|국방|안보|미사일|순항미사일|탄두|방사포|위성/;

  if (military.test(text)) {
    return "군사/안보";
  }


  /* 정치/외교 */

  const politics =
    /김정은|정치|외교|회담|정상회담|정상|대통령|정부|국무|외무|북한|남북|한국|미국|중국|러시아|일본|유엔|대사|외교부|당대회|노동당|위원장|지도자|관계/;

  if (politics.test(text)) {
    return "정치/외교";
  }


  /* 경제 */

  const economy =
    /경제|무역|시장|식량|농업|산업|수출|수입|제재|금융|화폐|공장|생산|경제개발|관광|건설|기업|가격|쌀|비료/;

  if (economy.test(text)) {
    return "경제";
  }


  /* 사회/문화 */

  const society =
    /사회|문화|교육|체육|주민|생활|보건|예술|공연|학교|학생|병원|의료|문화예술|영화|드라마|축구|스포츠|청년/;

  if (society.test(text)) {
    return "사회/문화";
  }


  /* 아무 분류에도 해당하지 않으면 정치/외교 */

  return "정치/외교";
}


/* =========================================
   기사 데이터 정리
========================================= */

function normalizeItem(item) {

  const result = {
    title: item.title || "",
    link: item.link || "",
    source: item.source || "Google News",
    pub: item.pub || "",
    category: item.category || ""
  };

  if (!result.category) {
    result.category = classify(result);
  }

  return result;
}


/* =========================================
   날짜 변환
========================================= */

function getTime(item) {

  if (!item || !item.pub) {
    return 0;
  }

  const time = Date.parse(item.pub);

  return isNaN(time) ? 0 : time;
}


/* =========================================
   최신순 정렬
========================================= */

function sortLatest(items) {

  return [...items].sort(function (a, b) {

    return getTime(b) - getTime(a);

  });

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
            type="button"
            class="category-btn ${cat === c ? "on" : ""}"
            data-category="${esc(c)}">
            ${esc(c)}
          </button>
        `;

      }).join("")}

    </div>
  `;
}


/* =========================================
   카테고리 이벤트 연결
   인라인 onclick을 사용하지 않음
========================================= */

function bindCategoryButtons() {

  document
    .querySelectorAll(".category-btn")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          const selected =
            button.getAttribute("data-category");

          if (!selected) {
            return;
          }

          cat = selected;
          page = "news";

          render();

        }
      );

    });

}


/* =========================================
   기사 카드
========================================= */

function card(item) {

  const saved =
    isSaved(item);


  return `
    <div
      class="card news-card"
      data-link="${esc(item.link)}">

      <div class="top">

        <span class="new category-label">
          ${esc(item.category || classify(item))}
        </span>

        <button
          type="button"
          class="save save-button"
          data-save-link="${esc(item.link)}">
          ${saved ? "🔖" : "♡"}
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
        다른 분야를 선택하거나 새로고침해 주세요.
      </div>
    `;

  }


  const sorted =
    sortLatest(items);


  return sorted
    .slice(0, 50)
    .map(card)
    .join("");
}


/* =========================================
   기사 카드 이벤트 연결
========================================= */

function bindArticleButtons() {

  /* 기사 카드 */

  document
    .querySelectorAll(".news-card")
    .forEach(function (cardElement) {

      cardElement.addEventListener(
        "click",
        function (event) {

          /*
             저장 버튼을 누른 경우에는
             원문으로 이동하지 않음
          */

          if (
            event.target.closest(".save-button")
          ) {
            return;
          }


          const link =
            cardElement.getAttribute("data-link");


          if (!link) {
            return;
          }


          window.open(
            link,
            "_blank",
            "noopener,noreferrer"
          );

        }
      );

    });


  /* 저장 버튼 */

  document
    .querySelectorAll(".save-button")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();


          const link =
            button.getAttribute("data-save-link");


          const item =
            news.find(function (x) {
              return x.link === link;
            });


          if (item) {
            toggle(item);
          }

        }
      );

    });

}


/* =========================================
   화면 렌더링
========================================= */

function render() {

  if (!main) {
    return;
  }


  /* 하단 메뉴 */

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


  /* =====================================
     홈
  ===================================== */

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

          return (
            cat === "전체" ||
            item.category === cat
          );

        })
      )}

    `;

  }


  /* =====================================
     뉴스
  ===================================== */

  else if (page === "news") {

    html += `

      <div class="title">
        최신 뉴스
      </div>

      ${cats()}

      ${list(
        news.filter(function (item) {

          return (
            cat === "전체" ||
            item.category === cat
          );

        })
      )}

    `;

  }


  /* =====================================
     저장됨
  ===================================== */

  else if (page === "saved") {

    html += `

      <div class="title">
        저장됨
      </div>

      ${list(getSaved())}

    `;

  }


  /* =====================================
     알림
  ===================================== */

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
          백그라운드 갱신은 브라우저와
          운영체제 정책에 따라 제한될 수 있습니다.
        </p>

      </div>

    `;

  }


  /* =====================================
     설정
  ===================================== */

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


  /* =====================================
     검색
  ===================================== */

  else if (page === "search") {

    html += `

      <button
        type="button"
        class="back"
        id="backButton">
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
          type="button"
          class="btn"
          id="searchSubmit"
          style="width:90px;margin:0">
          검색
        </button>

      </div>


      <div id="res"></div>

    `;

  }


  html += "</div>";


  main.innerHTML = html;


  /* 이벤트 다시 연결 */

  bindCategoryButtons();
  bindArticleButtons();


  /* 검색 화면 이벤트 */

  const backButton =
    document.querySelector("#backButton");

  if (backButton) {

    backButton.addEventListener(
      "click",
      function () {

        page = "home";
        render();

      }
    );

  }


  const searchSubmit =
    document.querySelector("#searchSubmit");

  if (searchSubmit) {

    searchSubmit.addEventListener(
      "click",
      searchQ
    );

  }


  const notifyInput =
    document.querySelector(
      'input[type="checkbox"]'
    );

  if (notifyInput) {

    notifyInput.addEventListener(
      "change",
      function () {

        localStorage.setItem(
          "notify",
          this.checked ? "on" : "off"
        );

      }
    );

  }

}


/* =========================================
   검색
========================================= */

function searchQ() {

  const input =
    document.querySelector("#q");

  const resultBox =
    document.querySelector("#res");


  if (!input || !resultBox) {
    return;
  }


  const q =
    input.value.trim().toLowerCase();


  if (!q) {

    resultBox.innerHTML =
      list(news);

    bindArticleButtons();

    return;

  }


  const result =
    news.filter(function (item) {

      const text =
        (
          (item.title || "") +
          " " +
          (item.source || "") +
          " " +
          (item.category || "")
        ).toLowerCase();


      return text.includes(q);

    });


  resultBox.innerHTML =
    list(result);


  bindArticleButtons();

}


/* =========================================
   RSS 가져오기
========================================= */

async function fetchText(url) {

  const response =
    await fetch(
      url,
      {
        method: "GET",
        cache: "no-store"
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
      "빈 응답"
    );

  }


  return text;

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


  const parserError =
    xml.querySelector("parsererror");


  if (parserError) {

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


  return items
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


      return normalizeItem({
        title: title,
        link: link,
        source: source,
        pub: pub
      });

    })
    .filter(function (item) {

      return (
        item.title &&
        item.link
      );

    });

}


/* =========================================
   RSS2JSON
========================================= */

async function getFromRSS2JSON() {

  const url =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(RSS);


  const response =
    await fetchText(url);


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
    data.items
      .map(function (item) {

        let source =
          "Google News";


        if (
          item.source &&
          typeof item.source === "string"
        ) {

          source = item.source;

        } else if (
          item.author
        ) {

          source = item.author;

        }


        return normalizeItem({

          title:
            item.title || "",

          link:
            item.link || "",

          source:
            source,

          pub:
            item.pubDate || ""

        });

      })
      .filter(function (item) {

        return (
          item.title &&
          item.link
        );

      });


  if (result.length === 0) {

    throw new Error(
      "기사 없음"
    );

  }


  return sortLatest(result);

}


/* =========================================
   AllOrigins
========================================= */

async function getFromAllOrigins() {

  const url =
    "https://api.allorigins.win/raw?url=" +
    encodeURIComponent(RSS);


  const xmlText =
    await fetchText(url);


  return sortLatest(
    parseRSS(xmlText)
  );

}


/* =========================================
   직접 RSS
========================================= */

async function getDirect() {

  const xmlText =
    await fetchText(RSS);


  return sortLatest(
    parseRSS(xmlText)
  );

}


/* =========================================
   뉴스 저장
========================================= */

function saveNews(result) {

  news =
    sortLatest(
      result.map(normalizeItem)
    );


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );

}


/* =========================================
   업데이트 성공 처리
========================================= */

function updateSuccess(result) {

  saveNews(result);


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
     1. RSS2JSON
  */

  try {

    const result =
      await getFromRSS2JSON();


    if (
      result &&
      result.length > 0
    ) {

      updateSuccess(result);
      return;

    }

  } catch (error) {

    console.log(
      "RSS2JSON 실패:",
      error
    );

  }


  /*
     2. AllOrigins
  */

  try {

    const result =
      await getFromAllOrigins();


    if (
      result &&
      result.length > 0
    ) {

      updateSuccess(result);
      return;

    }

  } catch (error) {

    console.log(
      "AllOrigins 실패:",
      error
    );

  }


  /*
     3. 직접 RSS
  */

  try {

    const result =
      await getDirect();


    if (
      result &&
      result.length > 0
    ) {

      updateSuccess(result);
      return;

    }

  } catch (error) {

    console.log(
      "Google RSS 직접 요청 실패:",
      error
    );

  }


  /*
     모두 실패하면
     기존 데이터 사용
  */

  try {

    const savedNews =
      JSON.parse(
        localStorage.getItem("news") || "[]"
      );


    news =
      Array.isArray(savedNews)
        ? savedNews.map(normalizeItem)
        : [];


    news =
      sortLatest(news);

  } catch (error) {

    news = [];

  }


  if (status) {

    status.textContent =
      news.length > 0
        ? "네트워크 오류 · 저장된 기사 표시"
        : "뉴스 데이터를 가져오지 못했습니다";

  }


  render();

}


/* =========================================
   상단 새로고침 버튼
========================================= */

const refreshButton =
  document.querySelector("#refresh");


if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    refresh
  );

}


/* =========================================
   지금 새로고침
========================================= */

const quickButton =
  document.querySelector("#quick");


if (quickButton) {

  quickButton.addEventListener(
    "click",
    refresh
  );

}


/* =========================================
   검색 버튼
========================================= */

const searchButton =
  document.querySelector("#search");


if (searchButton) {

  searchButton.addEventListener(
    "click",
    function () {

      page = "search";

      render();

    }
  );

}


/* =========================================
   하단 메뉴
========================================= */

document
  .querySelectorAll("nav button")
  .forEach(function (button) {

    button.addEventListener(
      "click",
      function () {

        page =
          button.dataset.p;


        /*
           뉴스 메뉴로 이동할 때
           전체 뉴스부터 보여줌
        */

        if (page === "news") {
          cat = "전체";
        }


        render();

      }
    );

  });


/* =========================================
   Service Worker
========================================= */

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register("sw.js")
    .then(function (registration) {

      console.log(
        "Service Worker 등록 완료"
      );

      /*
         새 버전 확인
      */

      registration.update();

    })
    .catch(function (error) {

      console.log(
        "Service Worker 오류:",
        error
      );

    });

}


/* =========================================
   기존 뉴스 불러오기
========================================= */

try {

  const oldNews =
    JSON.parse(
      localStorage.getItem("news") || "[]"
    );


  if (Array.isArray(oldNews)) {

    news =
      oldNews.map(normalizeItem);

    news =
      sortLatest(news);

  }

} catch (error) {

  news = [];

}


/* =========================================
   최초 화면
========================================= */

render();


/* =========================================
   앱 실행 즉시 뉴스 가져오기
========================================= */

refresh();


/* =========================================
   5분마다 자동 업데이트
========================================= */

setInterval(
  refresh,
  5 * 60 * 1000
);
