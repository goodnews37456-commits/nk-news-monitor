/* =====================================================
   북한 NEWS Monitor
   app.js 최종 안정화 버전
   ===================================================== */


/* =====================================================
   1. Google News RSS 주소
   ===================================================== */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("북한 OR 김정은 OR 북핵 OR 미사일") +
  "&hl=ko&gl=KR&ceid=KR:ko";


/* =====================================================
   2. 기본 변수
   ===================================================== */

let news = [];
let page = "home";
let cat = "전체";

const main = document.querySelector("#main");


/* =====================================================
   3. 안전한 문자열 처리
   ===================================================== */

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


/* =====================================================
   4. 저장 기사
   ===================================================== */

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


/* =====================================================
   5. 기사 자동 분류
   ===================================================== */

function classify(item) {

  const text =
    (
      (item.title || "") +
      " " +
      (item.source || "")
    ).toLowerCase();


  /* 군사 / 안보 */

  if (
    /미사일|탄도|icbm|핵무기|핵실험|군사|군대|무기|발사|잠수함|전투기|훈련|포병|국방|안보|탄두|방사포|정찰위성|위성|미군/.test(text)
  ) {

    return "군사/안보";

  }


  /* 정치 / 외교 */

  if (
    /김정은|정치|외교|회담|정상회담|정상|대통령|정부|국무|외무|미국|중국|러시아|일본|유엔|대사|외교부|남북|한국|노동당|당대회|위원장|관계|협상/.test(text)
  ) {

    return "정치/외교";

  }


  /* 경제 */

  if (
    /경제|무역|시장|식량|농업|산업|수출|수입|제재|금융|화폐|공장|생산|관광|건설|기업|가격|쌀|비료/.test(text)
  ) {

    return "경제";

  }


  /* 사회 / 문화 */

  if (
    /사회|문화|교육|체육|주민|생활|보건|예술|공연|학교|학생|병원|의료|영화|축구|스포츠|청년/.test(text)
  ) {

    return "사회/문화";

  }


  /* 분류되지 않은 북한 관련 기사 */

  return "정치/외교";

}


/* =====================================================
   6. 기사 데이터 표준화
   ===================================================== */

function normalizeItem(item) {

  const result = {

    title: item.title || "",

    link: item.link || "",

    source:
      item.source ||
      "Google News",

    pub:
      item.pub ||
      "",

    category:
      item.category ||
      ""

  };


  if (!result.category) {

    result.category =
      classify(result);

  }


  return result;

}


/* =====================================================
   7. 날짜 변환
   ===================================================== */

function getTime(item) {

  if (!item || !item.pub) {

    return 0;

  }


  const time =
    Date.parse(item.pub);


  return isNaN(time)
    ? 0
    : time;

}


/* =====================================================
   8. 최신순 정렬
   ===================================================== */

function sortLatest(items) {

  return [...items].sort(
    function (a, b) {

      return getTime(b) - getTime(a);

    }
  );

}


/* =====================================================
   9. 카테고리 버튼
   ===================================================== */

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


/* =====================================================
   10. 기사 카드
   ===================================================== */

function card(item) {

  return `

    <div
      class="card news-card"
      data-link="${esc(item.link)}">

      <div class="top">

        <span class="new category-label">

          ${esc(
            item.category ||
            classify(item)
          )}

        </span>


        <button
          type="button"
          class="save save-button"
          data-save-link="${esc(item.link)}">

          ${isSaved(item) ? "🔖" : "♡"}

        </button>

      </div>


      <h3>

        ${esc(item.title)}

      </h3>


      <div class="source">

        ${esc(
          item.source ||
          "출처 미상"
        )}

        ·

        ${esc(
          item.pub ||
          "최근"
        )}

      </div>

    </div>

  `;

}


/* =====================================================
   11. 기사 목록
   ===================================================== */

function list(items) {

  if (
    !items ||
    items.length === 0
  ) {

    return `

      <div class="empty">

        표시할 기사가 없습니다.<br>

        다른 분야를 선택하거나
        새로고침해 주세요.

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


/* =====================================================
   12. 화면 렌더링
   ===================================================== */

function render() {

  if (!main) {

    return;

  }


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


  /* ===================================================
     홈
     =================================================== */

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

          return (
            cat === "전체" ||
            item.category === cat
          );

        })

      )}

    `;

  }


  /* ===================================================
     뉴스
     =================================================== */

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


  /* ===================================================
     저장됨
     =================================================== */

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


  /* ===================================================
     알림
     =================================================== */

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
          수집되면 이 화면에서
          확인할 수 있습니다.

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


  /* ===================================================
     설정
     =================================================== */

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
          id="notifySwitch"
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


  /* ===================================================
     검색
     =================================================== */

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


  /*
     중요:
     여기서는 카테고리 버튼에
     별도 이벤트를 연결하지 않습니다.

     main 전체에 이벤트를 하나만
     연결해 놓았기 때문에 render()
     이후에도 버튼이 정상 작동합니다.
  */


  bindSearchEvents();
  bindSettingsEvents();

}


/* =====================================================
   13. 검색 / 설정 이벤트
   ===================================================== */

function bindSearchEvents() {

  const backButton =
    document.querySelector(
      "#backButton"
    );


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
    document.querySelector(
      "#searchSubmit"
    );


  if (searchSubmit) {

    searchSubmit.addEventListener(
      "click",
      searchQ
    );

  }


  const input =
    document.querySelector("#q");


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

}


/* =====================================================
   14. 설정 이벤트
   ===================================================== */

function bindSettingsEvents() {

  const notify =
    document.querySelector(
      "#notifySwitch"
    );


  if (!notify) {

    return;

  }


  notify.addEventListener(
    "change",
    function () {

      localStorage.setItem(
        "notify",
        this.checked
          ? "on"
          : "off"
      );

    }
  );

}


/* =====================================================
   15. 기사 클릭 / 카테고리 / 저장
       이벤트 위임
   ===================================================== */

if (main) {

  main.addEventListener(
    "click",
    function (event) {


      /* ---------------------------------------------
         카테고리 버튼
         --------------------------------------------- */

      const categoryButton =
        event.target.closest(
          ".category-btn"
        );


      if (categoryButton) {

        event.preventDefault();
        event.stopPropagation();


        const selected =
          categoryButton.getAttribute(
            "data-category"
          );


        if (
          selected &&
          [
            "전체",
            "정치/외교",
            "군사/안보",
            "경제",
            "사회/문화"
          ].includes(selected)
        ) {

          cat = selected;

          page = "news";

          render();

        }


        return;

      }


      /* ---------------------------------------------
         저장 버튼
         --------------------------------------------- */

      const saveButton =
        event.target.closest(
          ".save-button"
        );


      if (saveButton) {

        event.preventDefault();
        event.stopPropagation();


        const link =
          saveButton.getAttribute(
            "data-save-link"
          );


        if (!link) {

          return;

        }


        const item =
          news.find(function (x) {

            return x.link === link;

          });


        if (item) {

          toggle(item);

        }


        return;

      }


      /* ---------------------------------------------
         기사 카드
         --------------------------------------------- */

      const newsCard =
        event.target.closest(
          ".news-card"
        );


      if (newsCard) {

        const link =
          newsCard.getAttribute(
            "data-link"
          );


        if (
          link &&
          link.startsWith("http")
        ) {

          window.open(
            link,
            "_blank"
          );

        }

      }

    }
  );

}


/* =====================================================
   16. 검색
   ===================================================== */

function searchQ() {

  const input =
    document.querySelector("#q");


  const resultBox =
    document.querySelector("#res");


  if (
    !input ||
    !resultBox
  ) {

    return;

  }


  const q =
    input.value
      .trim()
      .toLowerCase();


  if (!q) {

    resultBox.innerHTML =
      list(news);

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

}


/* =====================================================
   17. RSS 텍스트 가져오기
   ===================================================== */

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


/* =====================================================
   18. RSS XML 파싱
   ===================================================== */

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


  if (
    items.length === 0
  ) {

    throw new Error(
      "RSS 기사 없음"
    );

  }


  return items
    .map(function (item) {


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


/* =====================================================
   19. RSS2JSON
   ===================================================== */

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

        return normalizeItem({

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

        });

      })
      .filter(function (item) {

        return (
          item.title &&
          item.link
        );

      });


  if (
    result.length === 0
  ) {

    throw new Error(
      "기사 없음"
    );

  }


  return sortLatest(result);

}


/* =====================================================
   20. AllOrigins
   ===================================================== */

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


/* =====================================================
   21. Google RSS 직접 요청
   ===================================================== */

async function getDirect() {

  const xmlText =
    await fetchText(RSS);


  return sortLatest(
    parseRSS(xmlText)
  );

}


/* =====================================================
   22. 뉴스 저장
   ===================================================== */

function saveNews(result) {

  news =
    sortLatest(
      result.map(
        normalizeItem
      )
    );


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );

}


/* =====================================================
   23. 업데이트 성공
   ===================================================== */

function updateSuccess(result) {

  saveNews(result);


  const status =
    document.querySelector(
      "#status"
    );


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


/* =====================================================
   24. 뉴스 새로고침
   ===================================================== */

async function refresh() {

  const status =
    document.querySelector(
      "#status"
    );


  if (status) {

    status.textContent =
      "최신 뉴스 확인 중...";

  }


  /* -----------------------------------------------
     1순위 RSS2JSON
     ----------------------------------------------- */

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


  /* -----------------------------------------------
     2순위 AllOrigins
     ----------------------------------------------- */

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


  /* -----------------------------------------------
     3순위 직접 RSS
     ----------------------------------------------- */

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


  /* -----------------------------------------------
     모든 네트워크 요청 실패
     기존 뉴스 사용
     ----------------------------------------------- */

  try {

    const savedNews =
      JSON.parse(
        localStorage.getItem(
          "news"
        ) || "[]"
      );


    news =
      Array.isArray(savedNews)
        ? savedNews.map(
            normalizeItem
          )
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


/* =====================================================
   25. 상단 새로고침
   ===================================================== */

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


/* =====================================================
   26. 지금 새로고침
   ===================================================== */

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


/* =====================================================
   27. 검색 버튼
   ===================================================== */

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


/* =====================================================
   28. 하단 메뉴
   ===================================================== */

document
  .querySelectorAll("nav button")
  .forEach(function (button) {

    button.addEventListener(
      "click",
      function () {

        page =
          button.dataset.p;


        /*
           뉴스 메뉴를 누르면
           전체 뉴스부터 표시
        */

        if (
          page === "news"
        ) {

          cat = "전체";

        }


        render();

      }
    );

  });


/* =====================================================
   29. Service Worker
   ===================================================== */

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register(
      "sw.js"
    )
    .then(function (registration) {

      console.log(
        "Service Worker 등록 완료"
      );


      registration.update();

    })
    .catch(function (error) {

      console.log(
        "Service Worker 오류:",
        error
      );

    });

}


/* =====================================================
   30. 기존 뉴스 불러오기
   ===================================================== */

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
      oldNews.map(
        normalizeItem
      );


    news =
      sortLatest(news);

  }

} catch (error) {

  news = [];

}


/* =====================================================
   31. 최초 화면
   ===================================================== */

render();


/* =====================================================
   32. 앱 실행 즉시 업데이트
   ===================================================== */

refresh();


/* =====================================================
   33. 5분마다 자동 업데이트
   ===================================================== */

setInterval(
  refresh,
  5 * 60 * 1000
);
