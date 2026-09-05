/* =========================================================
   북한 NEWS Monitor - app.js
   안정화 + 최신순 + 분야분류 + 원문바로가기 + 사진
   ========================================================= */

"use strict";


/* =========================================================
   기본 설정
   ========================================================= */

const RSS =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("북한 OR 김정은 OR 북핵 OR 미사일") +
  "&hl=ko&gl=KR&ceid=KR:ko";

const CACHE_KEY = "news";
const SAVED_KEY = "saved";

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
   URL 안전 처리
   ========================================================= */

function safeUrl(url) {
  try {
    const u = new URL(url, location.href);

    if (
      u.protocol === "http:" ||
      u.protocol === "https:"
    ) {
      return u.href;
    }

    return "";
  } catch (e) {
    return "";
  }
}


/* =========================================================
   저장된 기사
   ========================================================= */

function getSaved() {
  try {
    const data =
      JSON.parse(
        localStorage.getItem(SAVED_KEY) || "[]"
      );

    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}


function isSaved(item) {
  const saved = getSaved();

  return saved.some(function (x) {
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
    SAVED_KEY,
    JSON.stringify(saved)
  );

  render();
}


/* =========================================================
   날짜 처리
   ========================================================= */

function getTime(item) {
  const time = Date.parse(item.pub || "");

  return Number.isNaN(time)
    ? 0
    : time;
}


function formatDate(value) {
  if (!value) {
    return "최근";
  }

  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    return value;
  }

  return new Date(time).toLocaleString(
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
   기사 분류
   ========================================================= */

function classify(item) {

  const text = (
    (item.title || "") +
    " " +
    (item.description || "") +
    " " +
    (item.source || "")
  ).toLowerCase();


  /* 군사/안보를 먼저 검사
     미사일, 핵 등의 기사가 정치 단어를 함께 포함하는
     경우 군사/안보로 우선 분류 */

  const military =
    /미사일|탄도|icbm|핵무기|핵실험|핵탄두|잠수함|군사|군부|군대|무기|발사|포병|전투기|폭격기|훈련|방사포|전술핵|순항미사일|위성|정찰위성|국방|안보|미군/.test(text);

  if (military) {
    return "군사/안보";
  }


  const economy =
    /경제|무역|시장|식량|농업|산업|수출|수입|제재|공장|생산|전력|광업|경제개발|물가|통화|재정|기업|노동|농장/.test(text);

  if (economy) {
    return "경제";
  }


  const society =
    /사회|문화|교육|학교|학생|체육|스포츠|예술|주민|생활|보건|병원|의료|건강|관광|공연|영화|문학|청년|여성|아동/.test(text);

  if (society) {
    return "사회/문화";
  }


  const politics =
    /김정은|정치|외교|회담|정상회담|정상|북한|남북|한국|대한민국|미국|중국|러시아|일본|외무|정부|당대회|조선로동당|노동당|최고인민회의|대통령|국무|외교관|대사|관계|협상|대화/.test(text);

  if (politics) {
    return "정치/외교";
  }


  return "정치/외교";
}


/* =========================================================
   기사 데이터 정리
   ========================================================= */

function normalizeItem(item) {

  const title =
    String(item.title || "").trim();

  const link =
    safeUrl(item.link || "");

  const source =
    String(
      item.source ||
      item.author ||
      "Google News"
    ).trim();

  const pub =
    String(
      item.pub ||
      item.pubDate ||
      ""
    ).trim();

  const description =
    String(
      item.description ||
      item.content ||
      ""
    ).trim();

  let image =
    item.image ||
    item.thumbnail ||
    "";


  /* enclosure 이미지 */

  if (!image && item.enclosure) {
    if (typeof item.enclosure === "string") {
      image = item.enclosure;
    } else {
      image =
        item.enclosure.link ||
        item.enclosure.url ||
        "";
    }
  }


  /* 본문 HTML에서 이미지 추출 */

  if (!image && description) {
    const match =
      description.match(
        /<img[^>]+src=["']([^"']+)["']/i
      );

    if (match && match[1]) {
      image = match[1];
    }
  }


  image = safeUrl(image);


  const result = {
    title: title,
    link: link,
    source: source,
    pub: pub,
    description: description,
    image: image,
    category: ""
  };

  result.category =
    classify(result);

  return result;
}


/* =========================================================
   기사 중복 제거
   ========================================================= */

function uniqueNews(items) {

  const map = new Map();

  items.forEach(function (item) {

    if (!item || !item.title) {
      return;
    }

    const key =
      item.link ||
      item.title;

    if (!map.has(key)) {
      map.set(key, item);
    }

  });

  return Array.from(map.values());
}


/* =========================================================
   최신순 정렬
   ========================================================= */

function sortLatest(items) {

  return items.slice().sort(
    function (a, b) {

      return getTime(b) - getTime(a);

    }
  );
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
            class="category-btn ${cat === c ? "on" : ""}"
            data-category="${esc(c)}"
          >
            ${esc(c)}
          </button>
        `;

      }).join("")}

    </div>
  `;
}


/* =========================================================
   기사 이미지
   ========================================================= */

function articleImage(item) {

  if (item.image) {

    return `
      <div class="thumb">
        <img
          src="${esc(item.image)}"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.parentElement.classList.add('no-image');this.style.display='none';"
        >
        <div class="image-fallback">
          🇰🇵
        </div>
      </div>
    `;

  }


  return `
    <div class="thumb no-image">
      <div class="image-fallback">
        🇰🇵
      </div>
    </div>
  `;
}


/* =========================================================
   기사 카드
   ========================================================= */

function card(item) {

  const saved =
    isSaved(item);

  const category =
    item.category ||
    classify(item);

  return `
    <article
      class="card news-card"
      data-link="${esc(item.link)}"
    >

      <div class="article-body">

        <div class="article-info">

          <div class="article-top">

            <span class="category-badge">
              ${esc(category)}
            </span>

            <button
              type="button"
              class="save"
              data-action="save"
              aria-label="기사 저장"
            >
              ${saved ? "🔖" : "♡"}
            </button>

          </div>


          <h3>
            ${esc(item.title)}
          </h3>


          <div class="source">

            <span>
              ${esc(item.source || "출처 미상")}
            </span>

            <span>·</span>

            <span>
              ${esc(formatDate(item.pub))}
            </span>

          </div>

        </div>


        ${articleImage(item)}

      </div>

    </article>
  `;
}


/* =========================================================
   기사 목록
   ========================================================= */

function list(items) {

  if (!items || items.length === 0) {

    return `
      <div class="empty">
        표시할 기사가 없습니다.<br>
        새로고침을 눌러 다시 확인해 주세요.
      </div>
    `;
  }


  return sortLatest(items)
    .slice(0, 50)
    .map(card)
    .join("");
}


/* =========================================================
   화면 렌더링
   ========================================================= */

function render() {

  if (!main) {
    return;
  }


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
          return (
            cat === "전체" ||
            item.category === cat
          );
        })
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

        <b>🔔 새 기사 알림</b>

        <p class="muted">
          새로운 북한 관련 기사가 수집되면
          이 화면에서 확인할 수 있습니다.
        </p>

      </div>


      <div class="card">

        <b>자동 업데이트</b>

        <p class="muted">
          앱을 열면 최신 뉴스를 확인합니다.
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


      <div class="card setting-row">

        <div>
          <b>새 기사 알림</b>
        </div>

        <input
          id="notify"
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


  /* =====================================================
     검색
     ===================================================== */

  else if (page === "search") {

    html += `
      <button
        type="button"
        class="back"
        data-action="back"
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
          type="search"
          placeholder="북한, 김정은, 북핵, 미사일"
        >

        <button
          type="button"
          class="btn search-btn"
          data-action="search-q"
        >
          검색
        </button>

      </div>


      <div id="res"></div>
    `;
  }


  html += "</div>";


  main.innerHTML =
    html;
}


/* =========================================================
   검색
   ========================================================= */

function searchQ() {

  const input =
    document.querySelector("#q");

  const resultBox =
    document.querySelector("#res");

  if (!input || !resultBox) {
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

      const text = (
        (item.title || "") +
        " " +
        (item.source || "") +
        " " +
        (item.description || "")
      ).toLowerCase();

      return text.includes(q);

    });


  resultBox.innerHTML =
    list(result);
}


/* =========================================================
   기사 바로가기
   ========================================================= */

function openArticle(item) {

  const link =
    safeUrl(item.link);

  if (!link) {
    return;
  }


  /*
     현재 창에서 원문을 열어
     모바일에서 새 탭 차단 문제가 생기는 것을 방지
  */

  window.location.href =
    link;
}


/* =========================================================
   RSS 가져오기
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


  if (!text || text.length < 50) {

    throw new Error(
      "빈 응답"
    );

  }


  return text;
}


/* =========================================================
   RSS 이미지 추출
   ========================================================= */

function getXMLImage(item) {

  let image = "";


  /* media:content */

  const media =
    item.getElementsByTagNameNS(
      "*",
      "content"
    );


  for (let i = 0; i < media.length; i++) {

    const url =
      media[i].getAttribute("url");

    if (url) {
      image = url;
      break;
    }

  }


  /* media:thumbnail */

  if (!image) {

    const thumb =
      item.getElementsByTagNameNS(
        "*",
        "thumbnail"
      );

    if (
      thumb.length > 0 &&
      thumb[0].getAttribute("url")
    ) {

      image =
        thumb[0].getAttribute("url");

    }

  }


  /* enclosure */

  if (!image) {

    const enclosure =
      item.querySelector("enclosure");

    if (enclosure) {

      const type =
        enclosure.getAttribute("type") || "";

      const url =
        enclosure.getAttribute("url") || "";

      if (
        url &&
        (
          type.startsWith("image/") ||
          /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)
        )
      ) {
        image = url;
      }

    }

  }


  /* description 안의 img */

  if (!image) {

    const description =
      item.querySelector("description");

    if (description) {

      const html =
        description.textContent || "";

      const match =
        html.match(
          /<img[^>]+src=["']([^"']+)["']/i
        );

      if (match && match[1]) {
        image = match[1];
      }

    }

  }


  return safeUrl(image);
}


/* =========================================================
   XML RSS 파싱
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


  const result =
    items.map(function (item) {

      const title =
        item.querySelector("title")?.textContent?.trim() ||
        "";


      const link =
        item.querySelector("link")?.textContent?.trim() ||
        "";


      const source =
        item.querySelector("source")?.textContent?.trim() ||
        "Google News";


      const pub =
        item.querySelector("pubDate")?.textContent?.trim() ||
        "";


      const description =
        item.querySelector("description")?.textContent?.trim() ||
        "";


      const image =
        getXMLImage(item);


      return normalizeItem({
        title: title,
        link: link,
        source: source,
        pub: pub,
        description: description,
        image: image
      });

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


  return sortLatest(
    uniqueNews(result)
  );
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
    data.items.map(function (item) {

      let image = "";


      if (item.thumbnail) {
        image = item.thumbnail;
      }


      if (!image && item.enclosure) {

        if (
          typeof item.enclosure === "string"
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


      if (!image && item.content) {

        const match =
          String(item.content).match(
            /<img[^>]+src=["']([^"']+)["']/i
          );

        if (match && match[1]) {
          image = match[1];
        }

      }


      if (!image && item.description) {

        const match =
          String(item.description).match(
            /<img[^>]+src=["']([^"']+)["']/i
          );

        if (match && match[1]) {
          image = match[1];
        }

      }


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
          item.pubDate || "",

        description:
          item.description ||
          item.content ||
          "",

        image:
          image

      });

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


  return sortLatest(
    uniqueNews(result)
  );
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


  return parseRSS(xmlText);
}


/* =========================================================
   Google RSS 직접 요청
   ========================================================= */

async function getDirect() {

  const xmlText =
    await fetchText(RSS);


  return parseRSS(xmlText);
}


/* =========================================================
   뉴스 저장
   ========================================================= */

function saveNews(items) {

  news =
    sortLatest(
      uniqueNews(
        items.map(function (item) {
          return normalizeItem(item);
        })
      )
    );


  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify(news)
  );
}


/* =========================================================
   상태 표시
   ========================================================= */

function setStatus(text) {

  const status =
    document.querySelector("#status");

  if (status) {
    status.textContent =
      text;
  }
}


/* =========================================================
   뉴스 새로고침
   ========================================================= */

async function refresh() {

  setStatus(
    "최신 뉴스 확인 중..."
  );


  /*
     화면에 기존 뉴스가 있으면
     데이터를 가져오는 동안 기존 화면 유지
  */

  try {

    const result =
      await getFromRSS2JSON();


    if (result.length > 0) {

      saveNews(result);

      setStatus(
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

      return;
    }

  } catch (error) {

    console.log(
      "RSS2JSON 실패:",
      error
    );

  }


  /* =====================================================
     두 번째 방법
     ===================================================== */

  try {

    const result =
      await getFromAllOrigins();


    if (result.length > 0) {

      saveNews(result);

      setStatus(
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

      return;
    }

  } catch (error) {

    console.log(
      "AllOrigins 실패:",
      error
    );

  }


  /* =====================================================
     세 번째 방법
     ===================================================== */

  try {

    const result =
      await getDirect();


    if (result.length > 0) {

      saveNews(result);

      setStatus(
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

      return;
    }

  } catch (error) {

    console.log(
      "Google RSS 직접 요청 실패:",
      error
    );

  }


  /* =====================================================
     네트워크 실패
     ===================================================== */

  try {

    const savedNews =
      JSON.parse(
        localStorage.getItem(CACHE_KEY) || "[]"
      );


    if (Array.isArray(savedNews)) {

      news =
        sortLatest(
          uniqueNews(
            savedNews.map(
              normalizeItem
            )
          )
        );

    }

  } catch (error) {

    news = [];

  }


  setStatus(
    news.length > 0
      ? "네트워크 오류 · 저장된 기사 표시"
      : "뉴스 데이터를 가져오지 못했습니다"
  );


  render();
}


/* =========================================================
   메인 영역 이벤트 위임
   ========================================================= */

if (main) {

  main.addEventListener(
    "click",
    function (event) {

      /* -----------------------------------------------
         분야 버튼
         ----------------------------------------------- */

      const categoryButton =
        event.target.closest(
          ".category-btn"
        );


      if (categoryButton) {

        event.preventDefault();
        event.stopPropagation();


        const selected =
          categoryButton.dataset.category;


        if (selected) {

          cat =
            selected;

          page =
            "news";

          render();

        }

        return;
      }


      /* -----------------------------------------------
         저장 버튼
         ----------------------------------------------- */

      const saveButton =
        event.target.closest(
          '[data-action="save"]'
        );


      if (saveButton) {

        event.preventDefault();
        event.stopPropagation();


        const article =
          saveButton.closest(
            ".news-card"
          );


        if (!article) {
          return;
        }


        const link =
          article.dataset.link;


        const item =
          news.find(
            function (x) {
              return x.link === link;
            }
          );


        if (item) {
          toggle(item);
        }


        return;
      }


      /* -----------------------------------------------
         뒤로
         ----------------------------------------------- */

      const backButton =
        event.target.closest(
          '[data-action="back"]'
        );


      if (backButton) {

        event.preventDefault();

        page =
          "home";

        render();

        return;
      }


      /* -----------------------------------------------
         검색
         ----------------------------------------------- */

      const searchAction =
        event.target.closest(
          '[data-action="search-q"]'
        );


      if (searchAction) {

        event.preventDefault();

        searchQ();

        return;
      }


      /* -----------------------------------------------
         기사 카드
         ----------------------------------------------- */

      const article =
        event.target.closest(
          ".news-card"
        );


      if (article) {

        const link =
          article.dataset.link;


        if (link) {

          window.location.href =
            safeUrl(link);

        }

      }

    }
  );


  /* 검색창 Enter */

  main.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Enter" &&
        event.target &&
        event.target.id === "q"
      ) {

        event.preventDefault();

        searchQ();

      }

    }
  );

}


/* =========================================================
   상단 새로고침 버튼
   ========================================================= */

const refreshButton =
  document.querySelector("#refresh");


if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    function (event) {

      event.preventDefault();

      refresh();

    }
  );

}


/* =========================================================
   지금 새로고침
   ========================================================= */

const quickButton =
  document.querySelector("#quick");


if (quickButton) {

  quickButton.addEventListener(
    "click",
    function (event) {

      event.preventDefault();

      refresh();

    }
  );

}


/* =========================================================
   검색 버튼
   ========================================================= */

const searchButton =
  document.querySelector("#search");


if (searchButton) {

  searchButton.addEventListener(
    "click",
    function (event) {

      event.preventDefault();

      page =
        "search";

      render();

      setTimeout(
        function () {

          const input =
            document.querySelector("#q");

          if (input) {
            input.focus();
          }

        },
        50
      );

    }
  );

}


/* =========================================================
   하단 메뉴
   ========================================================= */

document
  .querySelectorAll("nav button")
  .forEach(function (button) {

    button.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        const target =
          button.dataset.p;

        if (!target) {
          return;
        }


        page =
          target;


        if (
          page === "home"
        ) {

          cat =
            "전체";

        }


        render();

      }
    );

  });


/* =========================================================
   설정 체크박스
   ========================================================= */

document.addEventListener(
  "change",
  function (event) {

    if (
      event.target &&
      event.target.id === "notify"
    ) {

      localStorage.setItem(
        "notify",
        event.target.checked
          ? "on"
          : "off"
      );

    }

  }
);


/* =========================================================
   Service Worker
   ========================================================= */

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register(
      "./sw.js",
      {
        updateViaCache: "none"
      }
    )
    .then(
      function (registration) {

        registration.update();

      }
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
      localStorage.getItem(CACHE_KEY) || "[]"
    );


  if (Array.isArray(oldNews)) {

    news =
      sortLatest(
        uniqueNews(
          oldNews.map(
            normalizeItem
          )
        )
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
