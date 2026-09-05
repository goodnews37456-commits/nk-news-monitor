/* =========================================================
   북한 NEWS Monitor - app.js
   안정화 완성 버전

   기능
   1. 북한 관련 뉴스 RSS
   2. 최신순 정렬
   3. 정치/외교
   4. 군사/안보
   5. 경제
   6. 사회/문화
   7. 기사 저장
   8. 검색
   9. 기사 클릭 시 원문 바로가기
   10. 기사 대표 이미지 표시
   11. 이미지 없을 경우 기본 이미지 표시
   12. 네트워크 실패 시 저장된 뉴스 표시
   13. 5분 자동 업데이트
   ========================================================= */


/* =========================================================
   RSS 주소
   ========================================================= */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent(
    "북한 OR 김정은 OR 북핵 OR 미사일"
  ) +
  "&hl=ko&gl=KR&ceid=KR:ko";


/* =========================================================
   기본 상태
   ========================================================= */

let news = [];

let page = "home";

let cat = "전체";

let isRefreshing = false;

const main =
  document.querySelector("#main");


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
   날짜
   ========================================================= */

function getTime(item) {

  const value =
    item.pub ||
    item.pubDate ||
    item.date ||
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
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
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

    return Array.isArray(data)
      ? data
      : [];

  } catch (e) {

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

  const text =
    (
      (item.title || "") +
      " " +
      (item.description || "")
    ).toLowerCase();


  /* 군사/안보를 먼저 검사 */

  if (
    /미사일|탄도미사일|icbm|slbm|핵무기|핵실험|핵탄두|군사|군대|무기|발사|포병|잠수함|전투기|훈련|도발|안보|국방|미군|한미연합|방사포|미사일시험/.test(text)
  ) {

    return "군사/안보";

  }


  /* 경제 */

  if (
    /경제|무역|시장|식량|농업|산업|수출|수입|제재|금융|화폐|공장|기업|농산물|물가|경제협력|외화/.test(text)
  ) {

    return "경제";

  }


  /* 사회/문화 */

  if (
    /사회|문화|교육|학교|학생|체육|스포츠|예술|공연|주민|생활|보건|의료|병원|관광|영화|음악|문화예술/.test(text)
  ) {

    return "사회/문화";

  }


  /* 정치/외교 */

  if (
    /김정은|정치|외교|정상회담|회담|정상|북한|남북|통일|정부|대통령|미국|중국|러시아|일본|외무성|외무|대사|국무|당대회|노동당|지도자|한반도/.test(text)
  ) {

    return "정치/외교";

  }


  /* 기본값 */

  return "정치/외교";

}


function match(item, category) {

  if (category === "전체") {
    return true;
  }

  return (
    getCategory(item) === category
  );

}


/* =========================================================
   기본 이미지
   ========================================================= */

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg"
         width="800"
         height="500"
         viewBox="0 0 800 500">

      <rect
        width="800"
        height="500"
        fill="#dfe5ef"/>

      <rect
        x="40"
        y="40"
        width="720"
        height="420"
        rx="35"
        fill="#cbd5e1"/>

      <text
        x="400"
        y="235"
        text-anchor="middle"
        font-size="85">
        🇰🇵
      </text>

      <text
        x="400"
        y="330"
        text-anchor="middle"
        font-size="30"
        font-family="Arial, sans-serif"
        fill="#334155">
        북한 NEWS
      </text>

    </svg>
  `);


/* =========================================================
   이미지 URL 정리
   ========================================================= */

function cleanImageUrl(url) {

  if (!url) {
    return "";
  }

  let value =
    String(url).trim();

  if (!value) {
    return "";
  }

  /* HTML entity */

  value =
    value
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  /* protocol-relative URL */

  if (
    value.startsWith("//")
  ) {

    value =
      "https:" + value;

  }

  return value;

}


/* =========================================================
   description에서 이미지 추출
   ========================================================= */

function extractImageFromHTML(html) {

  if (!html) {
    return "";
  }

  try {

    const box =
      document.createElement("div");

    box.innerHTML = html;

    const img =
      box.querySelector("img");

    if (!img) {
      return "";
    }

    return cleanImageUrl(
      img.getAttribute("src") ||
      img.getAttribute("data-src") ||
      img.getAttribute("data-original") ||
      ""
    );

  } catch (e) {

    return "";

  }

}


/* =========================================================
   이미지 추출
   ========================================================= */

function getImage(item) {

  if (!item) {
    return "";
  }


  /* 1 */

  if (item.image) {

    const url =
      cleanImageUrl(item.image);

    if (url) {
      return url;
    }

  }


  /* 2 */

  if (item.thumbnail) {

    const url =
      cleanImageUrl(item.thumbnail);

    if (url) {
      return url;
    }

  }


  /* 3 */

  if (item.enclosure) {

    if (
      typeof item.enclosure === "string"
    ) {

      const url =
        cleanImageUrl(
          item.enclosure
        );

      if (url) {
        return url;
      }

    }

    if (
      typeof item.enclosure === "object"
    ) {

      const url =
        cleanImageUrl(
          item.enclosure.link ||
          item.enclosure.url ||
          ""
        );

      if (url) {
        return url;
      }

    }

  }


  /* 4 */

  if (item.mediaContent) {

    const url =
      cleanImageUrl(
        item.mediaContent
      );

    if (url) {
      return url;
    }

  }


  /* 5 */

  if (item.description) {

    const url =
      extractImageFromHTML(
        item.description
      );

    if (url) {
      return url;
    }

  }


  return "";

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
              class="catBtn ${
                cat === c
                  ? "on"
                  : ""
              }"
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

  const image =
    getImage(item) ||
    FALLBACK_IMAGE;

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

            ${
              saved
                ? "🔖"
                : "♡"
            }

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
                esc(
                  formatDate(item.pub)
                )
              : ""
          }

        </div>

      </div>


      <div class="news-image-wrap">

        <img
          class="news-image"
          src="${esc(image)}"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="
            this.onerror=null;
            this.src='${FALLBACK_IMAGE}'
          "
        >

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

        잠시 후 새로고침해 주세요.

      </div>
    `;

  }


  const sorted =
    [...items].sort(
      function (a, b) {

        return (
          getTime(b) -
          getTime(a)
        );

      }
    );


  return sorted
    .slice(0, 50)
    .map(card)
    .join("");

}


/* =========================================================
   화면
   ========================================================= */

function render() {

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


  /* =======================================================
     홈
     ======================================================= */

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

            return match(
              item,
              cat
            );

          }
        )
      )}

    `;

  }


  /* =======================================================
     뉴스
     ======================================================= */

  else if (page === "news") {

    html += `

      <div class="title">
        최신 뉴스
      </div>

      ${cats()}

      ${list(
        news.filter(
          function (item) {

            return match(
              item,
              cat
            );

          }
        )
      )}

    `;

  }


  /* =======================================================
     저장됨
     ======================================================= */

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


  /* =======================================================
     알림
     ======================================================= */

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
          5분마다 자동으로 업데이트됩니다.
        </p>

      </div>

    `;

  }


  /* =======================================================
     설정
     ======================================================= */

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
            localStorage.getItem(
              "notify"
            ) !== "off"
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


  /* =======================================================
     검색
     ======================================================= */

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
          id="searchSubmit">

          검색

        </button>

      </div>

      <div id="res"></div>

    `;

  }


  html +=
    "</div>";


  main.innerHTML =
    html;


  bindContentEvents();

}


/* =========================================================
   원문 기사 열기
   ========================================================= */

function openArticle(link) {

  if (!link) {
    return;
  }

  window.open(
    link,
    "_blank",
    "noopener,noreferrer"
  );

}


/* =========================================================
   화면 내부 이벤트
   ========================================================= */

function bindContentEvents() {


  /* -------------------------------------------------------
     카테고리
  ------------------------------------------------------- */

  document
    .querySelectorAll(".catBtn")
    .forEach(
      function (button) {

        button.onclick =
          function (event) {

            event.preventDefault();

            event.stopPropagation();

            cat =
              button.dataset.category ||
              "전체";

            page =
              "news";

            render();

          };

      }
    );


  /* -------------------------------------------------------
     기사 클릭
  ------------------------------------------------------- */

  document
    .querySelectorAll(".news-card")
    .forEach(
      function (cardElement) {

        cardElement.onclick =
          function () {

            openArticle(
              cardElement.dataset.link
            );

          };

      }
    );


  /* -------------------------------------------------------
     저장
  ------------------------------------------------------- */

  document
    .querySelectorAll(
      "[data-save-link]"
    )
    .forEach(
      function (button) {

        button.onclick =
          function (event) {

            event.preventDefault();

            event.stopPropagation();

            const link =
              button.dataset.saveLink;

            let item =
              news.find(
                function (x) {

                  return (
                    x.link === link
                  );

                }
              );


            if (!item) {

              item =
                getSaved().find(
                  function (x) {

                    return (
                      x.link === link
                    );

                  }
                );

            }


            if (item) {

              toggle(item);

            }

          };

      }
    );


  /* -------------------------------------------------------
     뒤로
  ------------------------------------------------------- */

  const back =
    document.querySelector(
      "#backHome"
    );

  if (back) {

    back.onclick =
      function () {

        page =
          "home";

        render();

      };

  }


  /* -------------------------------------------------------
     검색 버튼
  ------------------------------------------------------- */

  const searchSubmit =
    document.querySelector(
      "#searchSubmit"
    );

  if (searchSubmit) {

    searchSubmit.onclick =
      searchQ;

  }


  /* -------------------------------------------------------
     알림
  ------------------------------------------------------- */

  const notify =
    document.querySelector(
      "#notifyToggle"
    );

  if (notify) {

    notify.onchange =
      function () {

        localStorage.setItem(
          "notify",
          notify.checked
            ? "on"
            : "off"
        );

      };

  }

}


/* =========================================================
   검색
   ========================================================= */

function searchQ() {

  const input =
    document.querySelector(
      "#q"
    );

  if (!input) {
    return;
  }

  const q =
    input.value
      .trim()
      .toLowerCase();


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
   네트워크 요청
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
      "HTTP " +
      response.status
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
   RSS XML 이미지
   ========================================================= */

function getXMLImage(item) {


  /* media:content */

  const media =
    item.querySelector(
      "media\\:content, content"
    );


  if (media) {

    const url =
      cleanImageUrl(
        media.getAttribute("url")
      );

    if (url) {
      return url;
    }

  }


  /* media:thumbnail */

  const thumbnail =
    item.querySelector(
      "media\\:thumbnail, thumbnail"
    );


  if (thumbnail) {

    const url =
      cleanImageUrl(
        thumbnail.getAttribute("url")
      );

    if (url) {
      return url;
    }

  }


  /* enclosure */

  const enclosure =
    item.querySelector(
      "enclosure"
    );


  if (enclosure) {

    const type =
      enclosure.getAttribute(
        "type"
      ) || "";


    const url =
      cleanImageUrl(
        enclosure.getAttribute(
          "url"
        )
      );


    if (
      url &&
      (
        !type ||
        type.startsWith("image/")
      )
    ) {

      return url;

    }

  }


  /* description */

  const description =
    item.querySelector(
      "description"
    );


  if (description) {

    const url =
      extractImageFromHTML(
        description.textContent || ""
      );

    if (url) {
      return url;
    }

  }


  return "";

}


/* =========================================================
   RSS 파싱
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
    xml.querySelector(
      "parsererror"
    )
  ) {

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


          const image =
            getXMLImage(item);


          return {

            title:
              title,

            link:
              link,

            source:
              source,

            pub:
              pub,

            description:
              description,

            image:
              image

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
   RSS2JSON
   ========================================================= */

async function getFromRSS2JSON() {

  const url =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(
      RSS
    );


  const response =
    await fetchText(
      url
    );


  const data =
    JSON.parse(
      response
    );


  if (
    !data ||
    !Array.isArray(
      data.items
    )
  ) {

    throw new Error(
      "RSS2JSON 오류"
    );

  }


  const result =
    data.items
      .map(
        function (item) {

          let image = "";


          /* thumbnail */

          if (
            item.thumbnail
          ) {

            image =
              item.thumbnail;

          }


          /* enclosure */

          if (
            !image &&
            item.enclosure
          ) {

            if (
              typeof item.enclosure ===
              "string"
            ) {

              image =
                item.enclosure;

            } else {

              image =
                item.enclosure.link ||
                item.enclosure.url ||
                "";

            }

          }


          /* media */

          if (
            !image &&
            item.mediaContent
          ) {

            image =
              item.mediaContent;

          }


          /* description */

          if (
            !image &&
            item.description
          ) {

            image =
              extractImageFromHTML(
                item.description
              );

          }


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
              item.description ||
              "",

            image:
              cleanImageUrl(
                image
              )

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
   AllOrigins
   ========================================================= */

async function getFromAllOrigins() {

  const url =
    "https://api.allorigins.win/raw?url=" +
    encodeURIComponent(
      RSS
    );


  const xmlText =
    await fetchText(
      url
    );


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
   데이터 정리
   ========================================================= */

function normalizeNews(items) {

  const map =
    new Map();


  (items || []).forEach(
    function (item) {

      if (
        !item ||
        !item.title ||
        !item.link
      ) {

        return;

      }


      const clean =
        {

          title:
            item.title || "",

          link:
            item.link || "",

          source:
            item.source ||
            "Google News",

          pub:
            item.pub ||
            item.pubDate ||
            "",

          description:
            item.description ||
            "",

          image:
            getImage(item)

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

      return (
        getTime(b) -
        getTime(a)
      );

    }
  );

}


/* =========================================================
   뉴스 적용
   ========================================================= */

function applyNews(result) {

  const normalized =
    normalizeNews(
      result
    );


  if (
    normalized.length === 0
  ) {

    throw new Error(
      "기사 데이터 없음"
    );

  }


  news =
    normalized;


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
   새로고침
   ========================================================= */

async function refresh() {

  if (isRefreshing) {
    return;
  }


  isRefreshing = true;


  const status =
    document.querySelector(
      "#status"
    );


  if (status) {

    status.textContent =
      "최신 뉴스 확인 중...";

  }


  /* -------------------------------------------------------
     1. RSS2JSON
  ------------------------------------------------------- */

  try {

    const result =
      await getFromRSS2JSON();


    applyNews(
      result
    );


    isRefreshing =
      false;

    return;

  } catch (error) {

    console.log(
      "RSS2JSON 실패",
      error
    );

  }


  /* -------------------------------------------------------
     2. AllOrigins
  ------------------------------------------------------- */

  try {

    const result =
      await getFromAllOrigins();


    applyNews(
      result
    );


    isRefreshing =
      false;

    return;

  } catch (error) {

    console.log(
      "AllOrigins 실패",
      error
    );

  }


  /* -------------------------------------------------------
     3. 직접 RSS
  ------------------------------------------------------- */

  try {

    const result =
      await getDirect();


    applyNews(
      result
    );


    isRefreshing =
      false;

    return;

  } catch (error) {

    console.log(
      "직접 RSS 실패",
      error
    );

  }


  /* -------------------------------------------------------
     4. 기존 데이터
  ------------------------------------------------------- */

  try {

    const savedNews =
      JSON.parse(
        localStorage.getItem(
          "news"
        ) || "[]"
      );


    news =
      Array.isArray(
        savedNews
      )
        ? normalizeNews(
            savedNews
          )
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


  isRefreshing =
    false;

}


/* =========================================================
   상단 새로고침
   ========================================================= */

const refreshButton =
  document.querySelector(
    "#refresh"
  );


if (refreshButton) {

  refreshButton.onclick =
    function () {

      refresh();

    };

}


/* =========================================================
   지금 새로고침
   ========================================================= */

const quickButton =
  document.querySelector(
    "#quick"
  );


if (quickButton) {

  quickButton.onclick =
    function () {

      refresh();

    };

}


/* =========================================================
   검색
   ========================================================= */

const searchButton =
  document.querySelector(
    "#search"
  );


if (searchButton) {

  searchButton.onclick =
    function () {

      page =
        "search";

      render();

    };

}


/* =========================================================
   하단 메뉴
   ========================================================= */

document
  .querySelectorAll(
    "nav button"
  )
  .forEach(
    function (button) {

      button.onclick =
        function () {

          page =
            button.dataset.p ||
            "home";

          render();

        };

    }
  );


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
   기존 뉴스 불러오기
   ========================================================= */

try {

  const oldNews =
    JSON.parse(
      localStorage.getItem(
        "news"
      ) || "[]"
    );


  if (
    Array.isArray(
      oldNews
    )
  ) {

    news =
      normalizeNews(
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
   앱 시작
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
