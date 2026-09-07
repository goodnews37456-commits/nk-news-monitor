/* =========================================================
   북한 NEWS Monitor
   app.js - FINAL
   GitHub Pages / PWA
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     설정
     ======================================================= */

  const CONFIG = {
    NEWS_JSON: "./news.json",
    NEWS_YML: "./news.yml",

    STORAGE_NEWS: "nk_news_monitor_news",
    STORAGE_SAVED: "nk_news_monitor_saved",
    STORAGE_UPDATED: "nk_news_monitor_updated",

    MAX_NEWS: 100
  };

  /* =======================================================
     상태
     ======================================================= */

  let allNews = [];
  let currentCategory = "전체";
  let searchKeyword = "";

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (selector) => document.querySelector(selector);

  const newsContainer =
    $("#newsList") ||
    $("#news-container") ||
    $(".news-list") ||
    $(".content");

  /* =======================================================
     유틸
     ======================================================= */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");

    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  function getTime(value) {
    if (!value) return 0;

    const time = new Date(value).getTime();

    return Number.isNaN(time) ? 0 : time;
  }

  function uniqueNews(items) {
    const map = new Map();

    items.forEach((item) => {
      const key =
        item.id ||
        item.link ||
        `${item.title || ""}_${item.date || ""}`;

      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }

  /* =======================================================
     뉴스 데이터 정규화
     ======================================================= */

  function normalizeNews(item, index = 0) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const title =
      item.title ||
      item.headline ||
      item.name ||
      "";

    if (!normalizeText(title)) {
      return null;
    }

    const source =
      item.source ||
      item.publisher ||
      item.press ||
      item.site ||
      "출처 미상";

    const category =
      item.category ||
      item.categoryName ||
      "기타";

    const date =
      item.date ||
      item.pubDate ||
      item.published ||
      item.publishedAt ||
      "";

    const link =
      item.link ||
      item.url ||
      item.href ||
      "#";

    return {
      id:
        item.id ||
        link ||
        `news-${index}-${Date.now()}`,

      title: normalizeText(title),

      source: normalizeText(source),

      category: normalizeText(category),

      date: date,

      link: link,

      description:
        normalizeText(
          item.description ||
          item.summary ||
          ""
        )
    };
  }

  function normalizeNewsArray(data) {
    let items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data && Array.isArray(data.news)) {
      items = data.news;
    } else if (data && Array.isArray(data.items)) {
      items = data.items;
    } else if (data && Array.isArray(data.articles)) {
      items = data.articles;
    }

    return items
      .map((item, index) => normalizeNews(item, index))
      .filter(Boolean);
  }

  /* =======================================================
     JSON 로딩
     ======================================================= */

  async function loadJSON() {
    const url =
      `${CONFIG.NEWS_JSON}?v=${Date.now()}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(
        `news.json HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const news = normalizeNewsArray(data);

    if (!news.length) {
      throw new Error("news.json에 뉴스가 없습니다.");
    }

    return news;
  }

  /* =======================================================
     간단한 YAML 로딩
     -------------------------------------------------------
     news.yml은 아래와 같은 단순 구조를 지원합니다.

     news:
       - title: "기사 제목"
         source: "연합뉴스"
         category: "정치/외교"
         date: "2026-09-05 12:00"
         link: "https://..."

     JSON이 있으면 JSON을 우선 사용합니다.
     ======================================================= */

  function parseSimpleYAML(text) {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split("\n");

    const items = [];
    let current = null;

    function cleanValue(value) {
      let v = String(value ?? "").trim();

      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }

      return v
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
    }

    for (let rawLine of lines) {
      const line = rawLine.trim();

      if (!line) continue;

      if (line.startsWith("#")) continue;

      if (
        line === "news:" ||
        line === "items:" ||
        line === "articles:"
      ) {
        continue;
      }

      if (line.startsWith("- ")) {
        if (current) {
          items.push(current);
        }

        current = {};

        const first = line.substring(2).trim();

        if (first.includes(":")) {
          const index = first.indexOf(":");

          const key = first
            .substring(0, index)
            .trim();

          const value = first
            .substring(index + 1)
            .trim();

          current[key] = cleanValue(value);
        }

        continue;
      }

      if (!current) continue;

      const colonIndex = line.indexOf(":");

      if (colonIndex === -1) continue;

      const key = line
        .substring(0, colonIndex)
        .trim();

      const value = line
        .substring(colonIndex + 1)
        .trim();

      current[key] = cleanValue(value);
    }

    if (current) {
      items.push(current);
    }

    return items;
  }

  async function loadYAML() {
    const url =
      `${CONFIG.NEWS_YML}?v=${Date.now()}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(
        `news.yml HTTP ${response.status}`
      );
    }

    const text = await response.text();

    const data = parseSimpleYAML(text);

    const news = normalizeNewsArray(data);

    if (!news.length) {
      throw new Error("news.yml에 뉴스가 없습니다.");
    }

    return news;
  }

  /* =======================================================
     로컬 저장 뉴스
     ======================================================= */

  function loadLocalNews() {
    try {
      const raw =
        localStorage.getItem(CONFIG.STORAGE_NEWS);

      if (!raw) return [];

      const data = JSON.parse(raw);

      return normalizeNewsArray(data);
    } catch (error) {
      console.warn(
        "로컬 뉴스 불러오기 실패:",
        error
      );

      return [];
    }
  }

  function saveLocalNews(news) {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_NEWS,
        JSON.stringify(news)
      );
    } catch (error) {
      console.warn(
        "로컬 뉴스 저장 실패:",
        error
      );
    }
  }

  /* =======================================================
     저장 기사
     ======================================================= */

  function getSavedIds() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.STORAGE_SAVED
        );

      if (!raw) return [];

      const data = JSON.parse(raw);

      return Array.isArray(data)
        ? data
        : [];
    } catch {
      return [];
    }
  }

  function saveSavedIds(ids) {
    localStorage.setItem(
      CONFIG.STORAGE_SAVED,
      JSON.stringify(ids)
    );
  }

  function isSaved(id) {
    return getSavedIds().includes(id);
  }

  function toggleSaved(id) {
    const ids = getSavedIds();

    const index = ids.indexOf(id);

    if (index >= 0) {
      ids.splice(index, 1);
    } else {
      ids.push(id);
    }

    saveSavedIds(ids);

    renderNews();
  }

  /* =======================================================
     업데이트 시간
     ======================================================= */

  function saveUpdateTime(date = new Date()) {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_UPDATED,
        date.toISOString()
      );
    } catch {}
  }

  function getUpdateTime() {
    try {
      return localStorage.getItem(
        CONFIG.STORAGE_UPDATED
      );
    } catch {
      return null;
    }
  }

  /* =======================================================
     상태 표시
     ======================================================= */

  function setStatus(text, type = "normal") {
    const status =
      $(".status");

    if (!status) return;

    const textNodes =
      status.querySelectorAll(
        "span, strong, b, em"
      );

    let target = null;

    for (const node of textNodes) {
      if (
        node !== status.querySelector("button")
      ) {
        target = node;
        break;
      }
    }

    if (!target) {
      target = status;
    }

    target.textContent = text;

    status.dataset.status = type;
  }

  function updateLastUpdatedText() {
    const time = getUpdateTime();

    if (!time) return;

    const formatted =
      formatDate(time);

    const status =
      $(".status");

    if (!status) return;

    const candidates =
      status.querySelectorAll(
        "span, strong, b, em"
      );

    for (const node of candidates) {
      if (
        !node.querySelector("button") &&
        !node.closest("button")
      ) {
        node.textContent =
          `마지막 업데이트: ${formatted}`;

        break;
      }
    }
  }

  /* =======================================================
     새 기사 알림
     ======================================================= */

  function renderNotice(count = 0) {
    const notice =
      $(".notice");

    if (!notice) return;

    const title =
      notice.querySelector("b");

    const muted =
      notice.querySelector(".muted");

    if (title) {
      if (count > 0) {
        title.textContent =
          `새로운 기사가 ${count}건 도착했습니다`;
      } else {
        title.textContent =
          "최신 북한 관련 뉴스";
      }
    }

    if (muted) {
      muted.textContent =
        count > 0
          ? "새로 업데이트된 기사를 확인하세요"
          : "최신 북한 관련 뉴스를 확인하세요";
    }
  }

  /* =======================================================
     카테고리
     ======================================================= */

  function getCategories() {
    const categories = [
      "전체"
    ];

    allNews.forEach((item) => {
      if (
        item.category &&
        !categories.includes(item.category)
      ) {
        categories.push(item.category);
      }
    });

    return categories;
  }

  function renderCategories() {
    let container =
      $(".cats");

    if (!container) return;

    container.innerHTML = "";

    const categories =
      getCategories();

    categories.forEach((category) => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "catBtn" +
        (
          category === currentCategory
            ? " on"
            : ""
        );

      button.textContent =
        category;

      button.addEventListener(
        "click",
        () => {
          currentCategory =
            category;

          renderCategories();
          renderNews();
        }
      );

      container.appendChild(button);
    });
  }

  /* =======================================================
     필터
     ======================================================= */

  function getFilteredNews() {
    let result =
      [...allNews];

    if (
      currentCategory !== "전체"
    ) {
      result =
        result.filter(
          (item) =>
            item.category ===
            currentCategory
        );
    }

    if (searchKeyword) {
      const keyword =
        searchKeyword.toLowerCase();

      result =
        result.filter((item) => {
          const text =
            [
              item.title,
              item.source,
              item.category,
              item.description
            ]
              .join(" ")
              .toLowerCase();

          return text.includes(keyword);
        });
    }

    return result;
  }

  /* =======================================================
     기사 카드
     -------------------------------------------------------
     이미지 없음
     ======================================================= */

  function createNewsCard(item) {
    const article =
      document.createElement("article");

    article.className =
      "card news-card";

    article.dataset.id =
      item.id;

    const saved =
      isSaved(item.id);

    article.innerHTML = `
      <div class="news-text">

        <div class="card-top">

          <span class="category-badge">
            ${escapeHTML(item.category)}
          </span>

          <button
            class="save"
            type="button"
            aria-label="기사 저장"
            title="기사 저장"
          >
            ${saved ? "♥" : "♡"}
          </button>

        </div>

        <div class="news-title">
          ${escapeHTML(item.title)}
        </div>

        <div class="source">
          ${escapeHTML(item.source)}
          ${
            item.date
              ? ` · ${escapeHTML(
                  formatDate(item.date)
                )}`
              : ""
          }
        </div>

      </div>
    `;

    const saveButton =
      article.querySelector(
        ".save"
      );

    saveButton.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        toggleSaved(item.id);
      }
    );

    article.addEventListener(
      "click",
      () => {
        if (
          item.link &&
          item.link !== "#"
        ) {
          window.open(
            item.link,
            "_blank",
            "noopener,noreferrer"
          );
        }
      }
    );

    return article;
  }

  /* =======================================================
     뉴스 표시
     ======================================================= */

  function renderNews() {
    const container =
      document.querySelector(
        "#newsList"
      ) ||
      document.querySelector(
        ".news-list"
      ) ||
      document.querySelector(
        ".content"
      );

    if (!container) {
      console.warn(
        "뉴스 표시 영역을 찾지 못했습니다."
      );

      return;
    }

    let list =
      getFilteredNews();

    list.sort(
      (a, b) =>
        getTime(b.date) -
        getTime(a.date)
    );

    /*
     * 기존 HTML에서 .content를 뉴스 컨테이너로
     * 사용하는 경우 헤더/notice/cats를 지우면 안 됩니다.
     */

    let listContainer =
      document.querySelector(
        "#newsList"
      ) ||
      document.querySelector(
        ".news-list"
      );

    if (!listContainer) {
      listContainer =
        document.createElement(
          "div"
        );

      listContainer.id =
        "newsList";

      listContainer.className =
        "news-list";

      const cats =
        document.querySelector(
          ".cats"
        );

      if (cats) {
        cats.after(listContainer);
      } else {
        container.appendChild(
          listContainer
        );
      }
    }

    listContainer.innerHTML =
      "";

    if (!list.length) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "empty";

      empty.innerHTML = `
        <div>표시할 기사가 없습니다.</div>
        <small>
          새로고침하거나 다른 카테고리를 선택해 주세요.
        </small>
      `;

      listContainer.appendChild(
        empty
      );

      renderNotice(0);

      return;
    }

    list.forEach((item) => {
      listContainer.appendChild(
        createNewsCard(item)
      );
    });

    renderNotice(
      Math.min(list.length, 99)
    );
  }

  /* =======================================================
     검색
     ======================================================= */

  function setupSearch() {
    const searchButton =
      document.querySelector(
        ".actions button:first-child"
      );

    if (!searchButton) return;

    searchButton.addEventListener(
      "click",
      () => {
        const keyword =
          window.prompt(
            "검색할 기사를 입력하세요.",
            searchKeyword
          );

        if (
          keyword === null
        ) {
          return;
        }

        searchKeyword =
          keyword.trim();

        renderNews();
      }
    );
  }

  /* =======================================================
     새로고침 버튼
     ======================================================= */

  function setupRefresh() {
    const buttons =
      document.querySelectorAll(
        ".actions button"
      );

    buttons.forEach(
      (button) => {
        const label =
          `${button.textContent} ${
            button.getAttribute(
              "aria-label"
            ) || ""
          } ${
            button.title || ""
          }`;

        if (
          label.includes("새로") ||
          label.includes("refresh") ||
          label.includes("갱신")
        ) {
          button.addEventListener(
            "click",
            () => {
              refreshNews(true);
            }
          );
        }
      }
    );

    const statusButton =
      document.querySelector(
        ".status button"
      );

    if (statusButton) {
      statusButton.addEventListener(
        "click",
        () => {
          refreshNews(true);
        }
      );
    }
  }

  /* =======================================================
     데이터 병합
     ======================================================= */

  function mergeNews(newItems) {
    const oldItems =
      allNews.length
        ? allNews
        : loadLocalNews();

    const merged =
      uniqueNews([
        ...newItems,
        ...oldItems
      ]);

    merged.sort(
      (a, b) =>
        getTime(b.date) -
        getTime(a.date)
    );

    allNews =
      merged.slice(
        0,
        CONFIG.MAX_NEWS
      );

    saveLocalNews(allNews);
  }

  /* =======================================================
     뉴스 새로고침
     ======================================================= */

  async function refreshNews(
    showLoading = true
  ) {
    if (showLoading) {
      setStatus(
        "최신 뉴스 확인 중...",
        "loading"
      );
    }

    try {
      let news = [];

      /*
       * 1순위: news.json
       */
      try {
        news =
          await loadJSON();

        console.log(
          "news.json 로딩 성공:",
          news.length
        );
      } catch (jsonError) {
        console.warn(
          "news.json 로딩 실패:",
          jsonError
        );

        /*
         * 2순위: news.yml
         */
        try {
          news =
            await loadYAML();

          console.log(
            "news.yml 로딩 성공:",
            news.length
          );
        } catch (yamlError) {
          console.warn(
            "news.yml 로딩 실패:",
            yamlError
          );

          throw new Error(
            "뉴스 데이터 파일을 불러올 수 없습니다."
          );
        }
      }

      mergeNews(news);

      saveUpdateTime();

      renderCategories();
      renderNews();
      updateLastUpdatedText();

      setStatus(
        `뉴스 ${allNews.length}건 업데이트 완료`,
        "success"
      );

      /*
       * 서비스워커에게 캐시 정리를 요청
       */
      if (
        navigator.serviceWorker &&
        navigator.serviceWorker.controller
      ) {
        navigator.serviceWorker.controller.postMessage(
          {
            type: "CLEAR_NEWS_CACHE"
          }
        );
      }

      return true;

    } catch (error) {
      console.error(
        "뉴스 업데이트 오류:",
        error
      );

      /*
       * 네트워크 오류라도 기존 뉴스가 있으면 표시
       */
      const localNews =
        loadLocalNews();

      if (localNews.length) {
        allNews =
          localNews;

        renderCategories();
        renderNews();
        updateLastUpdatedText();

        setStatus(
          "연결 오류 · 저장된 기사 표시",
          "offline"
        );

        return false;
      }

      allNews = [];

      renderCategories();
      renderNews();

      setStatus(
        "뉴스를 불러오지 못했습니다",
        "error"
      );

      return false;
    }
  }

  /* =======================================================
     저장됨 화면
     ======================================================= */

  function showSavedNews() {
    const ids =
      getSavedIds();

    const saved =
      allNews.filter(
        (item) =>
          ids.includes(item.id)
      );

    const listContainer =
      document.querySelector(
        "#newsList"
      ) ||
      document.querySelector(
        ".news-list"
      );

    if (!listContainer) return;

    listContainer.innerHTML =
      "";

    if (!saved.length) {
      listContainer.innerHTML = `
        <div class="empty">
          <div>저장된 기사가 없습니다.</div>
          <small>
            하트 버튼을 눌러 기사를 저장해 보세요.
          </small>
        </div>
      `;

      return;
    }

    saved.forEach((item) => {
      listContainer.appendChild(
        createNewsCard(item)
      );
    });
  }

  /* =======================================================
     하단 메뉴
     ======================================================= */

  function setupNavigation() {
    const navButtons =
      document.querySelectorAll(
        "nav button"
      );

    navButtons.forEach(
      (button, index) => {
        button.addEventListener(
          "click",
          () => {

            navButtons.forEach(
              (btn) =>
                btn.classList.remove(
                  "active"
                )
            );

            button.classList.add(
              "active"
            );

            /*
             * 홈
             */
            if (index === 0) {
              currentCategory =
                "전체";

              searchKeyword =
                "";

              renderCategories();
              renderNews();

              return;
            }

            /*
             * 뉴스
             */
            if (index === 1) {
              currentCategory =
                "전체";

              renderCategories();
              renderNews();

              return;
            }

            /*
             * 저장됨
             */
            if (index === 2) {
              showSavedNews();

              return;
            }

            /*
             * 알림
             */
            if (index === 3) {
              alert(
                "새로운 뉴스 알림은 최신 뉴스 업데이트 상태를 기준으로 표시됩니다."
              );

              return;
            }

            /*
             * 설정
             */
            if (index === 4) {
              alert(
                "설정 기능은 현재 기본 PWA 설정을 사용합니다."
              );

              return;
            }
          }
        );
      }
    );
  }

  /* =======================================================
     서비스워커 등록
     ======================================================= */

  async function registerServiceWorker() {
    if (
      !("serviceWorker" in navigator)
    ) {
      console.warn(
        "이 브라우저는 Service Worker를 지원하지 않습니다."
      );

      return;
    }

    try {
      const registration =
        await navigator.serviceWorker.register(
          "./sw.js",
          {
            updateViaCache: "none"
          }
        );

      console.log(
        "Service Worker 등록 완료:",
        registration.scope
      );

      /*
       * 새 서비스워커 확인
       */
      registration.update()
        .catch(() => {});

    } catch (error) {
      console.warn(
        "Service Worker 등록 실패:",
        error
      );
    }
  }

  /* =======================================================
     앱 초기화
     ======================================================= */

  async function init() {
    console.log(
      "북한 NEWS Monitor 시작"
    );

    /*
     * 우선 저장된 뉴스 표시
     * → 화면이 빈 상태로 오래 기다리지 않음
     */
    const localNews =
      loadLocalNews();

    if (localNews.length) {
      allNews =
        localNews;

      renderCategories();
      renderNews();
      updateLastUpdatedText();

      setStatus(
        "저장된 기사 표시 · 최신 뉴스 확인 중...",
        "loading"
      );
    } else {
      setStatus(
        "최신 뉴스 확인 중...",
        "loading"
      );
    }

    setupSearch();
    setupRefresh();
    setupNavigation();

    await registerServiceWorker();

    /*
     * 실제 최신 데이터 확인
     */
    await refreshNews(
      false
    );

    /*
     * 5분마다 자동 업데이트
     */
    setInterval(
      () => {
        refreshNews(false);
      },
      5 * 60 * 1000
    );

    /*
     * 앱으로 다시 돌아왔을 때 업데이트
     */
    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          refreshNews(false);
        }
      }
    );

    /*
     * 온라인 복귀
     */
    window.addEventListener(
      "online",
      () => {
        refreshNews(true);
      }
    );
  }

  /* =======================================================
     실행
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
