/* =========================================
   북한 NEWS Monitor - app.js
   전체 수정본
   - RSS 뉴스 수집
   - 안정적인 카테고리 분류
   - 카테고리 버튼 클릭 수정
   - 기사별 분류 표시
   - 저장 기능
   - 검색 기능
   - 자동 새로고침
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
   기사 카테고리 분류
========================================= */

function classify(item) {

  const text = (
    (item.title || "") +
    " " +
    (item.source || "")
  ).toLowerCase();


  /* -------------------------
     군사 / 안보
  ------------------------- */

  const military =
    /미사일|탄도미사일|icbm|핵무기|핵실험|핵탄두|잠수함|잠수함발사|slbm|군사|군대|무기|무인기|드론|포병|전투기|군함|함정|발사|도발|훈련|군사훈련|안보|방사포|순항미사일|전략무기/;

  if (military.test(text)) {
    return "군사/안보";
  }


  /* -------------------------
     정치 / 외교
  ------------------------- */

  const politics =
    /김정은|김여정|정치|외교|정상회담|정상회의|회담|북미|북중|남북|미국|중국|러시아|한국|대한민국|일본|외무성|외교부|대사|대통령|정부|당대회|노동당|국무위원회|최고인민회의|국가|통일|관계|협상|합의|선언|방문|친선|교류|정세/;

  if (politics.test(text)) {
    return "정치/외교";
  }


  /* -------------------------
     경제
  ------------------------- */

  const economy =
    /경제|무역|시장|식량|농업|농산물|수출|수입|산업|공장|기업|생산|건설|금융|은행|화폐|물가|가격|제재|대북제재|광업|석탄|에너지|전력|철도|경제개발|관광|관광객/;

  if (economy.test(text)) {
    return "경제";
  }


  /* -------------------------
     사회 / 문화
  ------------------------- */

  const society =
    /사회|문화|교육|학교|학생|교원|체육|스포츠|주민|생활|보건|병원|의료|예술|공연|음악|영화|방송|문학|청년|어린이|청소년|축구|농구|마라톤|대회|기념|복지|재난|기후|환경/;

  if (society.test(text)) {
    return "사회/문화";
  }


  /* -------------------------
     그 외
  ------------------------- */

  return "정치/외교";
}


/* =========================================
   기사에 카테고리 추가
========================================= */

function normalizeItem(item) {

  const result = {
    title: item.title || "",
    link: item.link || "",
    source: item.source || "Google News",
    pub: item.pub || ""
  };

  result.category =
    item.category ||
    classify(result);

  return result;
}


/* =========================================
   카테고리 목록
========================================= */

const CATEGORIES = [
  "전체",
  "정치/외교",
  "군사/안보",
  "경제",
  "사회/문화"
];


/* =========================================
   카테고리별 기사 필터
========================================= */

function filterByCategory(items) {

  if (!Array.isArray(items)) {
    return [];
  }

  if (cat === "전체") {
    return items;
  }

  return items.filter(function (item) {

    const category =
      item.category ||
      classify(item);

    return category === cat;

  });
}


/* =========================================
   카테고리 버튼
   중요:
   HTML onclick 사용하지 않음
========================================= */

function cats() {

  return `
    <div class="cats">

      ${CATEGORIES.map(function (c) {

        return `
          <button
            type="button"
            class="category-button ${cat === c ? "on" : ""}"
            data-category="${esc(c)}">

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

  const category =
    item.category ||
    classify(item);

  const saved =
    isSaved(item);

  return `
    <div
      class="card news-card"
      data-link="${esc(item.link)}">

      <div class="top">

        <span class="new">
          ${esc(category)}
        </span>

        <button
          type="button"
          class="save"
          data-action="save">

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

        다른 분야를 선택하거나
        새로고침을 눌러 다시 확인해 주세요.

      </div>
    `;
  }


  return items
    .slice(0, 50)
    .map(card)
    .join("");
}


/* =========================================
   화면 렌더링
========================================= */

function render() {

  /* 하단 메뉴 활성화 */

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
        filterByCategory(news)
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
        filterByCategory(news)
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

      ${list(
        getSaved()
      )}

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

        <b>
          새 기사 알림
        </b>

        <input
          id="notifyCheck"
          type="checkbox"
          ${
            localStorage.getItem("notify") !== "off"
              ? "checked"
              : ""
          }
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


  /* =====================================
     검색
  ===================================== */

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
          placeholder="북한, 김정은, 북핵, 미사일"
        >

        <button
          type="button"
          class="btn"
          id="searchExecute"
          style="width:90px;margin:0">

          검색

        </button>

      </div>

      <div id="res"></div>

    `;
  }


  html += "</div>";


  main.innerHTML = html;


  /* 새로 생성된 이벤트 연결 */

  bindPageEvents();
}


/* =========================================
   페이지별 이벤트
========================================= */

function bindPageEvents() {


  /* ---------------------------------------
     카테고리 버튼
  --------------------------------------- */

  document
    .querySelectorAll(".category-button")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          const selected =
            button.dataset.category;

          if (!selected) {
            return;
          }

          cat = selected;
          page = "news";

          render();

        }
      );

    });


  /* ---------------------------------------
     기사 클릭
  --------------------------------------- */

  document
    .querySelectorAll(".news-card")
    .forEach(function (article) {

      article.addEventListener(
        "click",
        function () {

          const link =
            article.dataset.link;

          const item =
            news.find(function (x) {
              return x.link === link;
            }) ||
            getSaved().find(function (x) {
              return x.link === link;
            });

          if (item) {
            detail(item);
          }

        }
      );

    });


  /* ---------------------------------------
     저장 버튼
  --------------------------------------- */

  document
    .querySelectorAll(
      '.news-card [data-action="save"]'
    )
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          const article =
            button.closest(".news-card");

          if (!article) {
            return;
          }

          const link =
            article.dataset.link;

          const item =
            news.find(function (x) {
              return x.link === link;
            }) ||
            getSaved().find(function (x) {
              return x.link === link;
            });

          if (item) {
            toggle(item);
          }

        }
      );

    });


  /* ---------------------------------------
     설정 알림
  --------------------------------------- */

  const notifyCheck =
    document.querySelector("#notifyCheck");

  if (notifyCheck) {

    notifyCheck.addEventListener(
      "change",
      function () {

        localStorage.setItem(
          "notify",
          this.checked ? "on" : "off"
        );

      }
    );

  }


  /* ---------------------------------------
     검색 실행
  --------------------------------------- */

  const searchExecute =
    document.querySelector("#searchExecute");

  if (searchExecute) {

    searchExecute.addEventListener(
      "click",
      searchQ
    );

  }


  /* ---------------------------------------
     검색 뒤로가기
  --------------------------------------- */

  const backHome =
    document.querySelector("#backHome");

  if (backHome) {

    backHome.addEventListener(
      "click",
      function () {

        page = "home";
        render();

      }
    );

  }

}


/* =========================================
   기사 상세
========================================= */

function detail(item) {

  const category =
    item.category ||
    classify(item);

  const saved =
    isSaved(item);


  main.innerHTML = `

    <div class="content detail">

      <button
        type="button"
        class="back"
        id="detailBack">

        ‹ 뒤로

      </button>

      <div class="new">
        ${esc(category)}
      </div>

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
        type="button"
        class="btn"
        id="detailSave">

        ${saved ? "저장 취소" : "기사 저장"}

      </button>

      <button
        type="button"
        class="btn"
        id="detailOpen">

        원문 기사 열기

      </button>

    </div>

  `;


  /* 뒤로가기 */

  const detailBack =
    document.querySelector("#detailBack");

  if (detailBack) {

    detailBack.addEventListener(
      "click",
      function () {

        page = "news";
        render();

      }
    );

  }


  /* 저장 */

  const detailSave =
    document.querySelector("#detailSave");

  if (detailSave) {

    detailSave.addEventListener(
      "click",
      function () {

        toggle(item);
        detail(item);

      }
    );

  }


  /* 원문 */

  const detailOpen =
    document.querySelector("#detailOpen");

  if (detailOpen) {

    detailOpen.addEventListener(
      "click",
      function () {

        if (item.link) {

          window.open(
            item.link,
            "_blank"
          );

        }

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

  if (!input) {
    return;
  }


  const q =
    input.value.trim().toLowerCase();


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


  const resultBox =
    document.querySelector("#res");


  if (resultBox) {

    resultBox.innerHTML =
      list(result);

  }

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
   RSS 파싱
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


      const result = {

        title: title,

        link: link,

        source: source,

        pub: pub

      };


      result.category =
        classify(result);


      return result;

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

        const result = {

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


        result.category =
          classify(result);


        return result;

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
    await fetchText(url);


  return parseRSS(xmlText);
}


/* =========================================
   Google RSS 직접 요청
========================================= */

async function getDirect() {

  const xmlText =
    await fetchText(RSS);


  return parseRSS(xmlText);
}


/* =========================================
   뉴스 저장
========================================= */

function saveNews(result) {

  news =
    result.map(normalizeItem);


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );

}


/* =========================================
   성공 상태 표시
========================================= */

function showSuccess() {

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


  /* ---------------------------------------
     1. RSS2JSON
  --------------------------------------- */

  try {

    const result =
      await getFromRSS2JSON();


    if (result.length > 0) {

      saveNews(result);

      showSuccess();

      render();

      return;

    }

  } catch (error) {

    console.log(
      "RSS2JSON 실패:",
      error
    );

  }


  /* ---------------------------------------
     2. AllOrigins
  --------------------------------------- */

  try {

    const result =
      await getFromAllOrigins();


    if (result.length > 0) {

      saveNews(result);

      showSuccess();

      render();

      return;

    }

  } catch (error) {

    console.log(
      "AllOrigins 실패:",
      error
    );

  }


  /* ---------------------------------------
     3. 직접 RSS
  --------------------------------------- */

  try {

    const result =
      await getDirect();


    if (result.length > 0) {

      saveNews(result);

      showSuccess();

      render();

      return;

    }

  } catch (error) {

    console.log(
      "Google RSS 직접 요청 실패:",
      error
    );

  }


  /* ---------------------------------------
     모든 네트워크 실패
  --------------------------------------- */

  try {

    const savedNews =
      JSON.parse(
        localStorage.getItem(
          "news"
        ) || "[]"
      );


    news =
      Array.isArray(savedNews)
        ? savedNews.map(normalizeItem)
        : [];

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

        render();

      }
    );

  });


/* =========================================
   Service Worker
========================================= */

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register(
      "sw.js"
    )
    .catch(function (error) {

      console.log(
        "Service Worker 오류:",
        error
      );

    });

}


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


  if (Array.isArray(oldNews)) {

    news =
      oldNews.map(
        normalizeItem
      );

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
