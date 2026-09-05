/* =========================================
   북한 NEWS Monitor - app.js
   뉴스 수집 + 자동 분야 분류 안정화 버전
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
   자동 분야 분류
========================================= */

function classifyArticle(item) {

  const text = (

    (item.title || "") +
    " " +
    (item.description || "") +
    " " +
    (item.source || "")

  ).toLowerCase();


  const rules = {

    "정치/외교": [

      "정치",
      "외교",
      "회담",
      "정상회담",
      "정상",
      "남북",
      "북미",
      "북한미국",
      "미국",
      "중국",
      "러시아",
      "일본",
      "한국",
      "대한민국",
      "외무",
      "외교부",
      "정부",
      "대통령",
      "국무",
      "당대회",
      "노동당",
      "김정은",
      "지도자",
      "관계",
      "협상",
      "협력",
      "방문",
      "대화",
      "정세"
    ],

    "군사/안보": [

      "미사일",
      "탄도미사일",
      "순항미사일",
      "핵",
      "핵무기",
      "핵실험",
      "군사",
      "군",
      "무기",
      "발사",
      "안보",
      "잠수함",
      "탄도",
      "icbm",
      "slbm",
      "전략무기",
      "전술무기",
      "방사포",
      "포병",
      "전투기",
      "공군",
      "해군",
      "육군",
      "훈련",
      "군부",
      "국방",
      "무력",
      "도발",
      "군사훈련",
      "위성",
      "정찰위성"
    ],

    "경제": [

      "경제",
      "무역",
      "시장",
      "식량",
      "농업",
      "제재",
      "산업",
      "수출",
      "수입",
      "공장",
      "기업",
      "금융",
      "은행",
      "화폐",
      "원화",
      "달러",
      "물가",
      "가격",
      "생산",
      "농장",
      "축산",
      "어업",
      "건설",
      "경제개발",
      "관광",
      "무역량",
      "경제협력"
    ],

    "사회/문화": [

      "사회",
      "문화",
      "교육",
      "교원",
      "학교",
      "학생",
      "대학",
      "청소년",
      "체육",
      "스포츠",
      "주민",
      "생활",
      "보건",
      "의료",
      "병원",
      "예술",
      "공연",
      "음악",
      "영화",
      "문학",
      "도서",
      "방송",
      "문화예술",
      "체육대회",
      "교육대회",
      "전국교원대회",
      "생활환경",
      "복지"
    ]

  };


  const scores = {

    "정치/외교": 0,
    "군사/안보": 0,
    "경제": 0,
    "사회/문화": 0

  };


  Object.keys(rules).forEach(function (category) {

    rules[category].forEach(function (keyword) {

      if (text.includes(keyword.toLowerCase())) {

        /*
          중요한 단어는 가중치를 높게 줍니다.
        */

        let weight = 1;


        if (
          keyword === "미사일" ||
          keyword === "핵" ||
          keyword === "핵무기" ||
          keyword === "군사" ||
          keyword === "무기"
        ) {

          weight = 3;

        }


        if (
          keyword === "회담" ||
          keyword === "정상회담" ||
          keyword === "외교" ||
          keyword === "남북"
        ) {

          weight = 3;

        }


        if (
          keyword === "경제" ||
          keyword === "무역" ||
          keyword === "제재"
        ) {

          weight = 3;

        }


        if (
          keyword === "교육" ||
          keyword === "교원" ||
          keyword === "학교" ||
          keyword === "체육"
        ) {

          weight = 3;

        }


        scores[category] += weight;

      }

    });

  });


  /*
     가장 높은 점수의 분야를 선택
  */

  let bestCategory = "사회/문화";
  let bestScore = 0;


  Object.keys(scores).forEach(function (category) {

    if (scores[category] > bestScore) {

      bestScore = scores[category];
      bestCategory = category;

    }

  });


  /*
     아무 키워드도 없으면
     북한 정치 관련 기사로 분류
  */

  if (bestScore === 0) {

    bestCategory = "정치/외교";

  }


  return bestCategory;

}


/* =========================================
   기사 데이터 정리
========================================= */

function normalizeArticle(item) {

  const article = {

    title: item.title || "",
    link: item.link || "",
    source: item.source || "Google News",
    pub: item.pub || "",
    description: item.description || ""

  };


  /*
     기사마다 자동 분야 부여
  */

  article.category =
    item.category ||
    classifyArticle(article);


  return article;

}


/* =========================================
   카테고리 일괄 재분류
========================================= */

function reclassifyAll(items) {

  return items.map(function (item) {

    return normalizeArticle(item);

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

      ${categories
        .map(function (c) {

          return `

            <button
              class="${cat === c ? "on" : ""}"
              onclick="
                cat=${JSON.stringify(c)};
                page='news';
                render();
              "
            >
              ${esc(c)}
            </button>

          `;

        })
        .join("")}

    </div>

  `;

}


/* =========================================
   기사 필터
========================================= */

function filterNews(items) {

  if (cat === "전체") {

    return items;

  }


  return items.filter(function (item) {

    return item.category === cat;

  });

}


/* =========================================
   기사 카드
========================================= */

function card(item) {

  const json = JSON.stringify(item)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "&#39;");


  return `

    <div
      class="card"
      onclick='detail(${json})'
    >

      <div class="top">

        <span class="new">
          ${esc(item.category || "NEWS")}
        </span>


        <button
          class="save"
          onclick='
            event.stopPropagation();
            toggle(${json})
          '
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

        다른 분야를 선택하거나
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


  /* ---------------------------------------
     홈
  --------------------------------------- */

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
        filterNews(news)
      )}

    `;

  }


  /* ---------------------------------------
     뉴스
  --------------------------------------- */

  else if (page === "news") {

    html += `

      <div class="title">
        최신 뉴스
      </div>


      ${cats()}


      ${list(
        filterNews(news)
      )}

    `;

  }


  /* ---------------------------------------
     저장됨
  --------------------------------------- */

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


  /* ---------------------------------------
     알림
  --------------------------------------- */

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


  /* ---------------------------------------
     설정
  --------------------------------------- */

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


  /* ---------------------------------------
     검색
  --------------------------------------- */

  else if (page === "search") {

    html += `

      <button
        class="back"
        onclick="
          page='home';
          render();
        "
      >
        ‹ 뒤로
      </button>


      <div class="title">
        뉴스 검색
      </div>


      <div class="row">
