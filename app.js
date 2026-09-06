/* =========================================================
   북한 NEWS Monitor
   app.js
   - news.yml에서 기사 읽기
   - 이미지 사용하지 않음
   - GitHub Pages 하위 경로 대응
   - 5분 자동 갱신
   - 새로고침 버튼 지원
   - 저장 기사 localStorage
   - 서비스워커 업데이트 지원
   ========================================================= */

(() => {
  "use strict";

  const NEWS_FILE = "./news.yml";
  const REFRESH_INTERVAL = 5 * 60 * 1000;

  let articles = [];
  let currentCategory = "전체";
  let refreshTimer = null;
  let isLoading = false;

  const STORAGE_KEY = "nk-news-saved-v2";

  /* -------------------------------------------------------
     DOM
     ------------------------------------------------------- */

  const $ = (selector) => document.querySelector(selector);

  function getSavedIds() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setSavedIds(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  /* -------------------------------------------------------
     경로
     ------------------------------------------------------- */

  function appUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  /* -------------------------------------------------------
     상태 표시
     ------------------------------------------------------- */

  function setStatus(message, type = "normal") {
    const statusText =
      document.querySelector(".status span") ||
      document.querySelector(".status");

    if (!statusText) return;

    if (statusText.tagName === "SPAN") {
      statusText.textContent = message;
    } else {
      const span = statusText.querySelector("span");
      if (span) span.textContent = message;
    }

    const dot = document.querySelector(".status i");

    if (dot) {
      dot.style.background =
        type === "error"
          ? "#ef4444"
          : type === "loading"
            ? "#f59e0b"
            : "#21d66b";
    }
  }

  /* -------------------------------------------------------
     YAML / JSON 파서
     
     news.yml은 JSON 형식으로 작성해도 YAML 규격상
     유효하기 때문에 가장 안정적으로 처리할 수 있습니다.

     동시에 간단한 일반 YAML도 처리하도록 보조 파서 포함.
     ------------------------------------------------------- */

  function parseNewsFile(text) {
    const clean = text.replace(/^\uFEFF/, "").trim();

    /* 1차: JSON */
    try {
      const parsed = JSON.parse(clean);

      if (Array.isArray(parsed)) {
        return normalizeArticles(parsed);
      }

      if (parsed && Array.isArray(parsed.articles)) {
        return normalizeArticles(parsed.articles);
      }

      if (parsed && Array.isArray(parsed.news)) {
        return normalizeArticles(parsed.news);
      }
    } catch (_) {
      /* JSON이 아니면 아래 YAML 방식으로 진행 */
    }

    return parseSimpleYaml(clean);
  }

  function parseSimpleYaml(text) {
    const lines = text.split(/\r?\n/);

    const result = [];
    let item = null;

    for (const originalLine of lines) {
      const line = originalLine.trim();

      if (!line || line.startsWith("#")) continue;

      if (line === "-" || line.startsWith("- ")) {
        if (item) result.push(item);

        item = {};

        const rest = line.substring(1).trim();

        if (rest.includes(":")) {
          const index = rest.indexOf(":");
          const key = rest.substring(0, index).trim();
          const value = rest.substring(index + 1).trim();

          item[key] = cleanYamlValue(value);
        }

        continue;
      }

      if (!item) continue;

      const colon = line.indexOf(":");

      if (colon === -1) continue;

      const key = line.substring(0, colon).trim();
      const value = line.substring(colon + 1).trim();

      item[key] = cleanYamlValue(value);
    }

    if (item) result.push(item);

    return normalizeArticles(result);
  }

  function cleanYamlValue(value) {
    let v = value.trim();

    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.substring(1, v.length - 1);
    }

    return v
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n");
  }

  /* -------------------------------------------------------
     기사 데이터 정규화
     ------------------------------------------------------- */

  function normalizeArticles(list) {
    if (!Array.isArray(list)) return [];

    return list
      .map((item, index) => {
        const title =
          item.title ||
          item.headline ||
          item.name ||
          "";

        const source =
          item.source ||
          item.publisher ||
          item.press ||
          "출처 미상";

        const url =
          item.url ||
          item.link ||
          item.href ||
          "#";

        const category =
          item.category ||
          item.section ||
          "기타";

        const date =
          item.date ||
          item.published ||
          item.pubDate ||
          item.time ||
          "";

        const id =
          item.id ||
          makeId(`${title}|${source}|${date}|${index}`);

        return {
          id: String(id),
          title: String(title).trim(),
          source: String(source).trim(),
          url: String(url).trim(),
          category: String(category).trim(),
          date: String(date).trim()
        };
      })
      .filter((item) => item.title);
  }

  function makeId(value) {
    let hash = 0;

    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    return `news-${Math.abs(hash)}`;
  }

  /* -------------------------------------------------------
     news.yml 가져오기
     ------------------------------------------------------- */

  async function loadNews(options = {}) {
    if (isLoading) return;

    isLoading = true;

    setStatus("최신 뉴스 확인 중...", "loading");

    try {
      /*
       * cache: no-store
       *
       * 서비스워커가 news.yml을 오래된 캐시에서
       * 가져오지 않도록 요청 단계에서도 캐시를 사용하지 않습니다.
       */
      const url =
        `${appUrl(NEWS_FILE)}?v=${Date.now()}`;

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

      const loaded = parseNewsFile(text);

      if (!loaded.length) {
        throw new Error("기사 데이터가 없습니다.");
      }

      articles = loaded;

      render();

      const now = new Date();

      setStatus(
        `마지막 업데이트: ${formatTime(now)}`,
        "normal"
      );

    } catch (error) {
      console.error("[NEWS]", error);

      /*
       * 기존 기사가 있으면 화면은 유지합니다.
       */
      if (articles.length) {
        setStatus(
          "업데이트 실패 · 기존 기사 표시",
          "error"
        );
      } else {
        setStatus(
          "연결 오류 · 저장된 기사 표시",
          "error"
        );

        renderEmpty(
          "뉴스 데이터를 불러오지 못했습니다.<br>" +
          "잠시 후 다시 새로고침해 주세요."
        );
      }
    } finally {
      isLoading = false;
    }
  }

  /* -------------------------------------------------------
     시간
     ------------------------------------------------------- */

  function formatTime(date) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  /* -------------------------------------------------------
     카테고리
     ------------------------------------------------------- */

  function getCategories() {
    const categories = new Set(["전체"]);

    articles.forEach((article) => {
      if (article.category) {
        categories.add(article.category);
      }
    });

    return [...categories];
  }

  function renderCategories() {
    const container =
      document.querySelector(".cats");

    if (!container) return;

    container.innerHTML = "";

    getCategories().forEach((category) => {
      const button = document.createElement("button");

      button.className =
        "catBtn" +
        (category === currentCategory ? " on" : "");

      button.textContent = category;

      button.addEventListener("click", () => {
        currentCategory = category;
        renderCategories();
        renderArticles();
      });

      container.appendChild(button);
    });
  }

  /* -------------------------------------------------------
     기사 렌더링
     ------------------------------------------------------- */

  function render() {
    renderCategories();
    renderArticles();
  }

  function renderArticles() {
    const content =
      document.querySelector(".content");

    if (!content) return;

    let list =
      currentCategory === "전체"
        ? articles
        : articles.filter(
            (article) =>
              article.category === currentCategory
          );

    /*
     * 기존 HTML에 news-list가 없더라도 자동 생성
     */
    let listContainer =
      document.querySelector("#news-list");

    if (!listContainer) {
      listContainer = document.createElement("div");
      listContainer.id = "news-list";
      listContainer.className = "news-list";

      const categories =
        document.querySelector(".cats");

      if (categories) {
        categories.after(listContainer);
      } else {
        content.appendChild(listContainer);
      }
    }

    listContainer.innerHTML = "";

    if (!list.length) {
      listContainer.innerHTML =
        `<div class="empty">
          표시할 기사가 없습니다.
        </div>`;

      return;
    }

    list.forEach((article) => {
      listContainer.appendChild(
        createArticleCard(article)
      );
    });
  }

  function createArticleCard(article) {
    const card = document.createElement("article");

    card.className = "card news-card";

    const saved =
      getSavedIds().includes(article.id);

    /*
     * 이미지 영역을 아예 만들지 않습니다.
     */
    card.innerHTML = `
      <div class="news-text">

        <div class="card-top">

          <span class="category-badge">
            ${escapeHtml(article.category)}
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

        <h2 class="news-title">
          ${escapeHtml(article.title)}
        </h2>

        <div class="source">
          <span>
            ${escapeHtml(article.source)}
          </span>
          ${
            article.date
              ? ` · ${escapeHtml(formatDate(article.date))}`
              : ""
          }
        </div>

      </div>
    `;

    const saveButton =
      card.querySelector(".save");

    saveButton.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        toggleSaved(article.id);
        renderArticles();
      }
    );

    card.addEventListener("click", () => {
      if (
        article.url &&
        article.url !== "#"
      ) {
        window.open(
          article.url,
          "_blank",
          "noopener,noreferrer"
        );
      }
    });

    return card;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* -------------------------------------------------------
     저장
     ------------------------------------------------------- */

  function toggleSaved(id) {
    const ids = getSavedIds();

    const index = ids.indexOf(id);

    if (index >= 0) {
      ids.splice(index, 1);
    } else {
      ids.push(id);
    }

    setSavedIds(ids);
  }

  /* -------------------------------------------------------
     빈 화면
     ------------------------------------------------------- */

  function renderEmpty(message) {
    const list =
      document.querySelector("#news-list");

    if (!list) return;

    list.innerHTML = `
      <div class="empty">
        ${message}
      </div>
    `;
  }

  /* -------------------------------------------------------
     새로고침 버튼
     ------------------------------------------------------- */

  function setupRefreshButtons() {
    const buttons =
      document.querySelectorAll(
        ".actions button, #refreshBtn, [data-action='refresh']"
      );

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        loadNews({
          force: true
        });
      });
    });

    /*
     * 기존 화면의 "지금 새로고침" 버튼도 대응
     */
    document.addEventListener("click", (event) => {
      const target =
        event.target.closest("button");

      if (!target) return;

      const text =
        target.textContent.trim();

      if (
        text.includes("새로고침") ||
        text.includes("갱신")
      ) {
        loadNews({
          force: true
        });
      }
    });
  }

  /* -------------------------------------------------------
     자동 갱신
     ------------------------------------------------------- */

  function startAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(() => {
      loadNews();
    }, REFRESH_INTERVAL);
  }

  /* -------------------------------------------------------
     서비스 워커
     ------------------------------------------------------- */

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
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
        "[SW] registered:",
        registration.scope
      );

      /*
       * 새 sw.js가 있으면 즉시 업데이트 확인
       */
      await registration.update();

      /*
       * 새 SW가 waiting 상태라면 바로 활성화 요청
       */
      if (registration.waiting) {
        registration.waiting.postMessage({
          type: "SKIP_WAITING"
        });
      }

      registration.addEventListener(
        "updatefound",
        () => {
          const worker =
            registration.installing;

          if (!worker) return;

          worker.addEventListener(
            "statechange",
            () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                worker.postMessage({
                  type: "SKIP_WAITING"
                });
              }
            }
          );
        }
      );

    } catch (error) {
      console.error(
        "[SW] registration failed:",
        error
      );
    }
  }

  /* -------------------------------------------------------
     앱 시작
     ------------------------------------------------------- */

  async function init() {
    setupRefreshButtons();

    startAutoRefresh();

    /*
     * 서비스워커와 뉴스 파일 로딩을 분리합니다.
     * SW가 실패해도 뉴스 앱 자체는 계속 실행됩니다.
     */
    registerServiceWorker();

    await loadNews();
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
