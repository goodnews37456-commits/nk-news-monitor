/* =========================================================
   북한 NEWS Monitor - app.js
   안정화 + 카테고리 + 최신순 + 원문 바로가기
   + 기사 이미지 자동 표시 버전
   ========================================================= */


/* =========================================================
   기본 설정
   ========================================================= */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("북한 OR 김정은 OR 북핵 OR 미사일") +
  "&hl=ko&gl=KR&ceid=KR:ko";

let news = [];
let page = "home";
let cat = "전체";

const main = document.querySelector("#main");


/* =========================================================
   안전한 문자열 처리
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
   저장 기능
   ========================================================= */

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


/* =========================================================
   카테고리 자동 분류
   ========================================================= */

function getCategory(item) {

  const text = (
    (item.title || "") +
    " " +
    (item.source || "") +
    " " +
    (item.description || "")
  ).toLowerCase();


  /* 군사/안보 */

  const military =
    /미사일|탄도|icbm|slbm|핵무기|핵실험|핵탄두|북핵|군사|군부|군대|무기|발사|포병|전투기|잠수함|훈련|미군|안보|국방|방사포|미사일|미사일시험/;


  if (military.test(text)) {

    return "군사/안보";

  }


  /* 정치/외교 */

  const politics =
    /김정은|김여정|정치|외교|정상회담|회담|정상|북한|남북|대남|대북|미국|중국|러시아|한국|대한민국|정부|외무성|외무|당대회|노동당|위원장|국무위원장|통일|외교부|정상회의/;


  if (politics.test(text)) {

    return "정치/외교";

  }


  /* 경제 */

  const economy =
    /경제|무역|시장|식량|농업|산업|수출|수입|제재|경제제재|공장|기업|생산|농산물|쌀|물가|금융|화폐|건설|경제개발/;


  if (economy.test(text)) {

    return "경제";

  }


  /* 사회/문화 */

  const society =
    /사회|문화|교육|학교|학생|체육|스포츠|예술|공연|주민|생활|보건|병원|의료|문화예술|영화|음악|관광|청년|여성|어린이/;


  if (society.test(text)) {

    return "사회/문화";

  }


  /* 기본 */

  return "정치/외교";

}


/* =========================================================
   카테고리 필터
   ========================================================= */

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

      ${categories.map(function (c) {

        return `
          <button
            type="button"
            class="cat-btn ${cat === c ? "on" : ""}"
            data-category="${esc(c)}">
            ${esc(c)}
          </button>
        `;

      }).join("")}

    </div>
  `;

}


/* =========================================================
   날짜 정리
   ========================================================= */

function formatDate(value) {

  if (!value) {

    return "";

  }


  const date =
    new Date(value);

  if (isNaN(date.getTime())) {

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
   이미지 URL 확인
   ========================================================= */

function validImageUrl(url) {

  if (!url) {

    return "";

  }

  url = String(url).trim();

  if (!url) {

    return "";

  }


  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {

    return url;

  }


  return "";

}


/* =========================================================
   HTML 안의 첫 번째 이미지 추출
   ========================================================= */

function extractImageFromHTML(html) {

  if (!html) {

    return "";

  }


  try {

    const parser =
      new DOMParser();

    const doc =
      parser.parseFromString(
        String(html),
        "text/html"
      );


    const img =
      doc.querySelector("img");


    if (img) {

      return validImageUrl(
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original")
      );

    }

  } catch (e) {

    console.log(
      "HTML 이미지 추출 실패",
      e
    );

  }


  /* 정규식 보조 */

  const match =
    String(html).match(
      /<img[^>]+src=["']([^"']+)["']/i
    );


  if (match && match[1]) {

    return validImageUrl(match[1]);

  }


  return "";

}


/* =========================================================
   RSS XML에서 이미지 추출
   ========================================================= */

function extractRSSImage(item) {

  let image = "";


  /* media:content */

  try {

    const mediaContent =
      item.getElementsByTagName(
        "media:content"
      );

    if (
      mediaContent &&
      mediaContent.length > 0
    ) {

      image =
        mediaContent[0].getAttribute("url") ||
        "";

    }

  } catch (e) {}


  /* media:thumbnail */

  if (!image) {

    try {

      const thumbnail =
        item.getElementsByTagName(
          "media:thumbnail"
        );

      if (
        thumbnail &&
        thumbnail.length > 0
      ) {

        image =
          thumbnail[0].getAttribute("url") ||
          "";

      }

    } catch (e) {}

  }


  /* enclosure */

  if (!image) {

    try {

      const enclosure =
        item.querySelector(
          "enclosure"
        );

      if (enclosure) {

        const type =
          enclosure.getAttribute("type") || "";

        const url =
          enclosure.getAttribute("url") || "";

        if (
          type.indexOf("image") >= 0 ||
          /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)
        ) {

          image = url;

        }

      }

    } catch (e) {}

  }


  /* description */

  if (!image) {

    try {

      const description =
        item.querySelector(
          "description"
        );

      if (description) {

        image =
          extractImageFromHTML(
            description.textContent
          );

      }

    } catch (e) {}

  }


  return validImageUrl(image);

}


/* =========================================================
   기사 카드
   ========================================================= */

function card(item) {

  const json =
    JSON.stringify(item)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "&#39;");


  const category =
    item.category ||
    getCategory(item);


  const image =
    validImageUrl(item.image);


  /*
     이미지가 있으면 실제 기사 이미지
     이미지가 없으면 북한 국기 SVG
  */

  const imageHTML = image

    ? `
      <img
        class="article-image"
        src="${esc(image)}"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="
          this.onerror=null;
          this.src='icon.svg';
          this.classList.add('fallback-image');
        "
      >
    `

    : `
      <div class="image-placeholder">
        🇰🇵
      </div>
    `;


  return `
    <article
      class="card article-card"
      data-link="${esc(item.link)}">

      <div class="article-left">

        <div class="article-top">

          <span class="category-badge">
            ${esc(category)}
          </span>

          <button
            type="button"
            class="save"
            data-save="true">
            ${isSaved(item) ? "🔖" : "♡"}
          </button>

        </div>


        <h3 class="article-title">
          ${esc(item.title)}
        </h3>


        <div class="source">

          ${esc(item.source || "Google News")}

          <span>·</span>

          ${esc(formatDate(item.pub))}

        </div>

      </div>


      <div class="article-right">

        ${imageHTML}

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


  return items
    .slice(0, 30)
    .map(card)
    .join("");

}


/* =========================================================
   화면 렌더링
   ========================================================= */

function render() {


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
        news.filter(function (item) {

          return match(
            item,
            cat
          );

        })
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
        news.filter(function (item) {

          return match(
            item,
            cat
          );

        })
      )}

    `;

  }


  /* =====================================================
     저장됨
     ===================================================== */

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


  /* =====================================================
     알림
     ===================================================== */

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


  /* =====================================================
     설정
     ===================================================== */

  else if (page === "settings") {

    html += `

      <div class="title">
        설정
      </div>


      <div class="card settings-card">

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
          placeholder="북한, 김정은, 북핵, 미사일"
        >


        <button
          type="button"
          class="btn"
          id="searchRun">
          검색
        </button>

      </div>


      <div id="res"></div>

    `;

  }


  html += "</div>";


  main.innerHTML = html;


  bindContentEvents();

}


/* =========================================================
   화면 내부 버튼 이벤트
   ========================================================= */

function bindContentEvents() {


  /* 카테고리 */

  document
    .querySelectorAll(".cat-btn")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          cat =
            button.dataset.category ||
            "전체";

          page = "news";

          render();

        }
      );

    });


  /* 기사 카드 */

  document
    .querySelectorAll(".article-card")
    .forEach(function (article) {

      article.addEventListener(
        "click",
        function () {

          const link =
            article.dataset.link;

          if (link) {

            window.location.href =
              link;

          }

        }
      );


      /* 저장 버튼 */

      const saveButton =
        article.querySelector(
          "[data-save='true']"
        );


      if (saveButton) {

        saveButton.addEventListener(
          "click",
          function (event) {

            event.preventDefault();
            event.stopPropagation();


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

      }

    });


  /* 검색 뒤로가기 */

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


  /* 검색 실행 */

  const searchRun =
    document.querySelector(
      "#searchRun"
    );


  if (searchRun) {

    searchRun.addEventListener(
      "click",
      searchQ
    );

  }


  /* 설정 알림 */

  document
    .querySelectorAll(
      ".settings-card input"
    )
    .forEach(function (input) {

      input.addEventListener(
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

    });

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


  const result =
    news.filter(function (item) {

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

    });


  const resultBox =
    document.querySelector("#res");


  if (resultBox) {

    resultBox.innerHTML =
      list(result);

    bindContentEvents();

  }

}


/* =========================================================
   fetch
   ========================================================= */

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


/* =========================================================
   RSS XML 파싱
   ========================================================= */

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
      xml.querySelectorAll(
        "item"
      )
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


      const description =
        item.querySelector(
          "description"
        )?.textContent ||
        "";


      const image =
        extractRSSImage(
          item
        );


      return {

        title: title,

        link: link,

        source: source,

        pub: pub,

        description:
          description,

        image:
          image,

        category:
          getCategory({
            title:
              title,

            source:
              source,

            description:
              description
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


/* =========================================================
   RSS2JSON
   ========================================================= */

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


        /* -----------------------------------------
           이미지 후보
        ----------------------------------------- */

        let image = "";


        /* RSS2JSON thumbnail */

        if (item.thumbnail) {

          image =
            item.thumbnail;

        }


        /* enclosure */

        if (!image && item.enclosure) {

          if (
            typeof item.enclosure ===
            "object"
          ) {

            image =
              item.enclosure.link ||
              item.enclosure.url ||
              "";

          }

        }


        /* description 안 이미지 */

        if (!image) {

          image =
            extractImageFromHTML(
              item.description ||
              item.content ||
              ""
            );

        }


        /* -----------------------------------------
           설명
        ----------------------------------------- */

        const description =
          item.description ||
          item.content ||
          "";


        return {

          title:
            item.title ||
            "",


          link:
            item.link ||
            "",


          source:
            item.author ||
            item.source ||
            "Google News",


          pub:
            item.pubDate ||
            "",


          description:
            description,


          image:
            validImageUrl(image),


          category:
            getCategory({

              title:
                item.title ||
                "",

              source:
                item.author ||
                item.source ||
                "",

              description:
                description

            })

        };

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
    await fetchText(url);


  return parseRSS(
    xmlText
  );

}


/* =========================================================
   직접 RSS
   ========================================================= */

async function getDirect() {

  const xmlText =
    await fetchText(
      RSS
    );


  return parseRSS(
    xmlText
  );

}


/* =========================================================
   최신순 정렬
   ========================================================= */

function sortLatest(items) {

  return items.sort(
    function (a, b) {

      const da =
        new Date(
          a.pub || 0
        ).getTime();


      const db =
        new Date(
          b.pub || 0
        ).getTime();


      return db - da;

    }
  );

}


/* =========================================================
   뉴스 저장 및 화면 업데이트
   ========================================================= */

function setNews(result) {

  news =
    sortLatest(
      Array.isArray(result)
        ? result
        : []
    );


  localStorage.setItem(
    "news",
    JSON.stringify(news)
  );


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


/* =========================================================
   뉴스 새로고침
   ========================================================= */

async function refresh() {

  const status =
    document.querySelector(
      "#status"
    );


  if (status) {

    status.textContent =
      "최신 뉴스 확인 중...";

  }


  /* -----------------------------------------
     1. RSS2JSON
  ----------------------------------------- */

  try {

    const result =
      await getFromRSS2JSON();


    if (
      result &&
      result.length > 0
    ) {

      setNews(
        result
      );

      return;

    }

  } catch (error) {

    console.log(
      "RSS2JSON 실패:",
      error
    );

  }


  /* -----------------------------------------
     2. AllOrigins
  ----------------------------------------- */

  try {

    const result =
      await getFromAllOrigins();


    if (
      result &&
      result.length > 0
    ) {

      setNews(
        result
      );

      return;

    }

  } catch (error) {

    console.log(
      "AllOrigins 실패:",
      error
    );

  }


  /* -----------------------------------------
     3. Google RSS 직접
  ----------------------------------------- */

  try {

    const result =
      await getDirect();


    if (
      result &&
      result.length > 0
    ) {

      setNews(
        result
      );

      return;

    }

  } catch (error) {

    console.log(
      "Google RSS 직접 요청 실패:",
      error
    );

  }


  /* -----------------------------------------
     네트워크 실패
  ----------------------------------------- */

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


/* =========================================================
   상단 새로고침 버튼
   ========================================================= */

const refreshButton =
  document.querySelector(
    "#refresh"
  );


if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    refresh
  );

}


/* =========================================================
   지금 새로고침
   ========================================================= */

const quickButton =
  document.querySelector(
    "#quick"
  );


if (quickButton) {

  quickButton.addEventListener(
    "click",
    refresh
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
  .querySelectorAll(
    "nav button"
  )
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


/* =========================================================
   Service Worker
   ========================================================= */

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register(
      "sw.js"
    )
    .catch(
      function (error) {

        console.log(
          "Service Worker 오류:",
          error
        );

      }
    );

}


/* =========================================================
   저장된 뉴스 불러오기
   ========================================================= */

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
      sortLatest(
        oldNews
      );

  }

} catch (error) {

  news = [];

}


/* =========================================================
   최초 화면
   ========================================================= */

render();


/* =========================================================
   앱 실행 즉시 뉴스 가져오기
   ========================================================= */

refresh();


/* =========================================================
   5분마다 자동 업데이트
   ========================================================= */

setInterval(
  refresh,
  5 * 60 * 1000
);
