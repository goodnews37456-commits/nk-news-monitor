/* =========================================
   북한 NEWS Monitor - app.js
   안정화 + 분야별 분류 + 원문 바로가기 버전
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

  localStorage.setItem(
    "saved",
    JSON.stringify(saved)
  );

  render();
}


/* =========================================
   기사 분야 자동 분류
========================================= */

function getCategory(item) {

  const text = (
    (item.title || "") +
    " " +
    (item.source || "")
  ).toLowerCase();


  /* 군사/안보를 먼저 검사 */
  const militaryKeywords = [
    "미사일",
    "탄도",
    "icbm",
    "핵무기",
    "핵실험",
    "북핵",
    "군사",
    "군",
    "무기",
    "발사",
    "잠수함",
    "잠수함발사",
    "훈련",
    "포병",
    "전투기",
    "미군",
    "한미연합",
    "안보",
    "방사포",
    "순항미사일",
    "탄두",
    "미사일",
    "미사일시험"
  ];

  if (
    militaryKeywords.some(function (keyword) {
      return text.includes(keyword);
    })
  ) {
    return "군사/안보";
  }


  /* 정치/외교 */
  const politicalKeywords = [
    "김정은",
    "정치",
    "외교",
    "회담",
    "정상회담",
    "정상",
    "북한 지도자",
    "북한 당국",
    "조선로동당",
    "노동당",
    "당대회",
    "외무성",
    "남북",
    "남북관계",
    "미국",
    "중국",
    "러시아",
    "일본",
    "한국",
    "대한민국",
    "트럼프",
    "대통령",
    "정부",
    "외교부",
    "통일부",
    "대사",
    "협상",
    "제재",
    "정책"
  ];

  if (
    politicalKeywords.some(function (keyword) {
      return text.includes(keyword);
    })
  ) {
    return "정치/외교";
  }


  /* 경제 */
  const economicKeywords = [
    "경제",
    "무역",
    "시장",
    "식량",
    "농업",
    "산업",
    "수출",
    "수입",
    "공장",
    "기업",
    "생산",
    "경제제재",
    "금융",
    "화폐",
    "농산물",
    "식품",
    "관광",
    "경제개발"
  ];

  if (
    economicKeywords.some(function (keyword) {
      return text.includes(keyword);
    })
  ) {
    return "경제";
  }


  /* 사회/문화 */
  const socialKeywords = [
    "사회",
    "문화",
    "교육",
    "학교",
    "학생",
    "체육",
    "스포츠",
    "주민",
    "생활",
    "보건",
    "의료",
    "병원",
    "예술",
    "공연",
    "영화",
    "방송",
    "문화재",
    "청년",
    "어린이"
  ];

  if (
    socialKeywords.some(function (keyword) {
      return text.includes(keyword);
    })
  ) {
    return "사회/문화";
  }


  /*
     어느 분야에도 명확하게 들어가지 않는 경우
     기본적으로 정치/외교로 분류
  */
  return "정치/외교";
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
            class="${cat === c ? "on" : ""}"
            data-category="${esc(c)}"
          >
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
    .querySelectorAll(".cats button")
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

  const category =
    item.category || getCategory(item);


  return `
    <div
      class="card news-card"
      data-link="${esc(item.link)}"
    >

      <div class="top">

        <span class="new category-badge">
          ${esc(category)}
        </span>

        <button
          type="button"
          class="save"
          data-save="1"
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
   기사 카드 이벤트 연결
========================================= */

function bindArticleCards(items) {

  const cards =
    document.querySelectorAll(".news-card");


  cards.forEach(function (cardElement, index) {

    const item = items[index];

    if (!item) {
      return;
    }


    /*
       하트 버튼
       기사 이동과 분리
    */

    const saveButton =
      cardElement.querySelector("[data-save]");


    if (saveButton) {

      saveButton.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          toggle(item);

        }
      );

    }


    /*
       기사 카드 클릭
       바로 원문으로 이동
    */

    cardElement.addEventListener(
      "click",
      function () {

        if (!item.link) {
          return;
        }

        window.location.href = item.link;

      }
    );

  });

}


/* =========================================
   기사 목록
========================================= */

function list(items) {

  if (!items || items.length === 0) {

    return `
      <div class="empty">

        표시할 기사가 없습니다.

        <br>

        다른 분야를 선택하거나
        새로고침을 눌러 주세요.

      </div>
    `;
  }


  return items
    .slice(0, 30)
    .map(card)
    .join("");
}


/* =========================================
   현재 분야 기사 필터
========================================= */

function getFilteredNews() {

  if (cat === "전체") {
    return news;
  }


  return news.filter(function (item) {

    const category =
      item.category || getCategory(item);

    return category === cat;

  });

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

      ${list(getFilteredNews())}

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

      ${list(getFilteredNews())}

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
          백그라운드 갱신은 브라우저 정책에
          따라 제한될 수 있습니다.

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
          type="checkbox"
          id="notifyCheck"
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
          북한 NEWS Monitor · PWA v1.1
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
        id="backHome"
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
          type="button"
          class="btn"
          id="searchBtn"
          style="width:90px;margin:0"
        >
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
     render() 후에 다시 버튼 이벤트 연결
  */

  bindCategoryButtons();


  /*
     기사 카드 이벤트
  */

  if (page === "home" || page === "news") {

    bindArticleCards(getFilteredNews());

  }


  if (page === "saved") {

    bindArticleCards(getSaved());

  }


  /*
     설정 알림
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
     검색 화면
  */

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


  const searchBtn =
    document.querySelector("#searchBtn");


  if (searchBtn) {

    searchBtn.addEventListener(
      "click",
      searchQ
    );

  }

}


/* =========================================
   기사 상세
   기존 상세 페이지는 사용하지 않음
   기사 카드를 누르면 바로 원문 이동
========================================= */


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
        (item.source || "") +
        " " +
        (item.category || "")

      )
        .toLowerCase()
        .includes(q);

    });


  const resultBox =
    document.querySelector("#res");


  if (!resultBox) {
    return;
  }


  resultBox.innerHTML =
    list(result);


  /*
     검색 결과 기사도
     바로 원문으로 이동하도록 연결
  */

  bindArticleCards(result);

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
        item
          .querySelector("title")
          ?.textContent
          ?.trim() || "";


      const link =
        item
          .querySelector("link")
          ?.textContent
          ?.trim() || "";


      const source =
        item
          .querySelector("source")
          ?.textContent
          ?.trim() ||
        "Google News";


      const pub =
        item
          .querySelector("pubDate")
          ?.textContent
          ?.trim() || "";


      return {

        title: title,

        link: link,

        source: source,

        pub: pub,

        category: getCategory({
          title: title,
          source: source
        })

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

        const title =
          item.title || "";


        const source =
          item.author ||
          "Google News";


        return {

          title: title,

          link:
            item.link || "",

          source: source,

          pub:
            item.pubDate || "",

          category:
            getCategory({
              title: title,
              source: source
            })

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


    if (result.length > 0) {

      news = result;


      localStorage.setItem(
        "news",
        JSON.stringify(news)
      );


      updateStatus();


      render();


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


    if (result.length > 0) {

      news = result;


      localStorage.setItem(
        "news",
        JSON.stringify(news)
      );


      updateStatus();


      render();


      return;

    }

  } catch (error) {

    console.log(
      "AllOrigins 실패:",
      error
    );

  }


  /*
     3. Google RSS 직접
  */

  try {

    const result =
      await getDirect();


    if (result.length > 0) {

      news = result;


      localStorage.setItem(
        "news",
        JSON.stringify(news)
      );


      updateStatus();


      render();


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
     저장된 뉴스 사용
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
   업데이트 시간
========================================= */

function updateStatus() {

  const status =
    document.querySelector("#status");


  if (!status) {
    return;
  }


  const now =
    new Date();


  status.textContent =
    "마지막 업데이트: " +
    now.toLocaleTimeString(
      "ko-KR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

}


/* =========================================
   상단 버튼
========================================= */

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
      "sw.js",
      {
        updateViaCache: "none"
      }
    )
    .then(function (registration) {

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
      localStorage.getItem(
        "news"
      ) || "[]"
    );


  if (Array.isArray(oldNews)) {

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
