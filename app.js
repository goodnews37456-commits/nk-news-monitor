/* =========================================
   북한 NEWS Monitor - app.js
   안정화 + 분야별 분류 버튼 수정 버전
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

  try {
    localStorage.setItem(
      "saved",
      JSON.stringify(saved)
    );
  } catch (e) {
    console.log("저장 오류:", e);
  }

  render();
}


/* =========================================
   분야별 분류
========================================= */

function getCategory(item) {

  const title =
    String(item.title || "").toLowerCase();

  /*
     우선순위가 중요합니다.

     군사/안보 키워드가 있으면
     정치 기사보다 군사 기사로 우선 분류합니다.
  */

  const military =
    /미사일|탄도미사일|icbm|핵무기|핵실험|군사|군대|무기|발사|잠수함|잠수함발사|slbm|전투기|훈련|포병|군단|방사포|순항미사일|탄두|미군|한미연합|안보|무력/.test(
      title
    );

  if (military) {
    return "군사/안보";
  }


  const economy =
    /경제|무역|시장|식량|농업|산업|수출|수입|공장|생산|경제개발|제재|금융|화폐|물가|배급|농산물|기업|건설|관광/.test(
      title
    );

  if (economy) {
    return "경제";
  }


  const society =
    /사회|문화|교육|학교|학생|체육|스포츠|주민|생활|보건|의료|병원|예술|공연|영화|노동자|청년|어린이|여성|문화예술/.test(
      title
    );

  if (society) {
    return "사회/문화";
  }


  const politics =
    /김정은|김여정|북한|조선|정치|외교|회담|정상|대통령|정부|당대회|노동당|당중앙|외무성|남북|남한|한국|미국|중국|러시아|일본|유엔|정상회담|관계|협력|방문|대표단|대사|외교관/.test(
      title
    );

  if (politics) {
    return "정치/외교";
  }


  /*
     아무 키워드에도 해당하지 않으면
     전체 뉴스에서는 보이게 하고
     분야 선택에서는 정치/외교로 기본 분류합니다.
  */

  return "정치/외교";
}


/* =========================================
   분야 필터
========================================= */

function match(item, category) {

  if (category === "전체") {
    return true;
  }

  return getCategory(item) === category;
}


/* =========================================
   분야 버튼
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
   분야 버튼 이벤트 연결
========================================= */

function bindCategoryButtons() {

  document
    .querySelectorAll(".category-button")
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

          /*
             선택한 분야 저장
          */

          cat = selected;

          /*
             뉴스 화면으로 이동
          */

          page = "news";

          /*
             다시 화면 표시
          */

          render();

        }
      );

    });
}


/* =========================================
   기사 카드
========================================= */

function card(item) {

  const category =
    getCategory(item);

  const categoryClass =
    category === "정치/외교"
      ? "politics"
      : category === "군사/안보"
      ? "military"
      : category === "경제"
      ? "economy"
      : "society";


  const json =
    JSON.stringify(item)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "&#39;");


  return `
    <div
      class="card"
      onclick='detail(${json})'>

      <div class="top">

        <span class="new ${categoryClass}">
          ${esc(category)}
        </span>

        <button
          type="button"
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
        다른 분야를 선택하거나<br>
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

  /*
     하단 메뉴 활성화
  */

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


  /* =======================================
     홈
  ======================================= */

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
        news.filter(function (item) {
          return match(item, cat);
        })
      )}

    `;
  }


  /* =======================================
     뉴스
  ======================================= */

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


  /* =======================================
     저장됨
  ======================================= */

  else if (page === "saved") {

    html += `

      <div class="title">
        저장됨
      </div>


      ${list(getSaved())}

    `;
  }


  /* =======================================
     알림
  ======================================= */

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
          백그라운드 갱신은 브라우저와
          운영체제 정책에 따라 제한될 수 있습니다.
        </p>

      </div>

    `;
  }


  /* =======================================
     설정
  ======================================= */

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
          id="notifyCheck"
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


  /* =======================================
     검색
  ======================================= */

  else if (page === "search") {

    html += `

      <button
        type="button"
        class="back"
        id="searchBack">
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


  /*
     중요:
     화면을 새로 그린 뒤
     분야 버튼 이벤트를 다시 연결합니다.
  */

  bindCategoryButtons();


  /*
     설정 알림 이벤트
  */

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


  /*
     검색 화면 이벤트
  */

  const searchBack =
    document.querySelector("#searchBack");

  if (searchBack) {

    searchBack.addEventListener(
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
        type="button"
        class="back"
        id="detailBack">
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
        type="button"
        class="btn"
        onclick='toggle(${json});detail(${json})'>

        ${isSaved(item) ? "저장 취소" : "기사 저장"}

      </button>


      <button
        type="button"
        class="btn"
        onclick='window.open(${JSON.stringify(
          item.link
        )}, "_blank")'>

        원문 기사 열기

      </button>

    </div>

  `;


  const back =
    document.querySelector("#detailBack");

  if (back) {

    back.addEventListener(
      "click",
      function () {

        page = "news";
        render();

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
    input.value
      .trim()
      .toLowerCase();


  const result =
    news.filter(function (item) {

      const text =
        (
          String(item.title || "") +
          " " +
          String(item.source || "")
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


  if (
    !text ||
    text.length < 50
  ) {

    throw new Error(
      "빈 응답"
    );

  }


  return text;
}


/* =========================================
   RSS → 기사 배열
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
    xml.querySelector(
      "parsererror"
    );


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
   직접 RSS
========================================= */

async function getDirect() {

  const xmlText =
    await fetchText(RSS);


  return parseRSS(xmlText);
}


/* =========================================
   뉴스 데이터 저장
========================================= */

function saveNews(result) {

  news = result;


  try {

    localStorage.setItem(
      "news",
      JSON.stringify(news)
    );

  } catch (e) {

    console.log(
      "뉴스 저장 오류:",
      e
    );

  }


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

      saveNews(result);

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

      saveNews(result);

      return;

    }

  } catch (error) {

    console.log(
      "AllOrigins 실패:",
      error
    );

  }


  /*
     3. Google RSS 직접 요청
  */

  try {

    const result =
      await getDirect();


    if (
      result &&
      result.length > 0
    ) {

      saveNews(result);

      return;

    }

  } catch (error) {

    console.log(
      "Google RSS 직접 요청 실패:",
      error
    );

  }


  /*
     4. 기존 저장 뉴스 사용
  */

  try {

    const savedNews =
      JSON.parse(
        localStorage.getItem(
          "news"
        ) || "[]"
      );


    news =
      Array.isArray(savedNews)
        ? savedNews
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

    news = oldNews;

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
