/* =========================================================
   북한 NEWS Monitor - Service Worker
   캐시 문제 방지 버전
   ========================================================= */

"use strict";


/* =========================================================
   캐시 버전
   ========================================================= */

const CACHE_NAME =
  "north-korea-news-v20260905-01";


/* =========================================================
   앱 파일
   ========================================================= */

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json"
];


/* =========================================================
   설치
   ========================================================= */

self.addEventListener(
  "install",
  function (event) {

    console.log(
      "[SW] install"
    );


    event.waitUntil(

      caches.open(
        CACHE_NAME
      )
      .then(
        function (cache) {

          return cache.addAll(
            APP_FILES
          );

        }
      )
      .catch(
        function (error) {

          console.log(
            "[SW] 초기 캐시 실패:",
            error
          );

        }
      )

    );


    /*
       새 SW 즉시 활성화
    */

    self.skipWaiting();

  }
);


/* =========================================================
   활성화
   ========================================================= */

self.addEventListener(
  "activate",
  function (event) {

    console.log(
      "[SW] activate"
    );


    event.waitUntil(

      caches.keys()
        .then(
          function (keys) {

            return Promise.all(

              keys
                .filter(
                  function (key) {

                    return (
                      key !==
                      CACHE_NAME
                    );

                  }
                )
                .map(
                  function (key) {

                    console.log(
                      "[SW] 오래된 캐시 삭제:",
                      key
                    );


                    return caches.delete(
                      key
                    );

                  }
                )

            );

          }
        )
        .then(
          function () {

            /*
               현재 열려 있는 페이지까지
               새 SW를 즉시 적용
            */

            return self.clients.claim();

          }
        )

    );

  }
);


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener(
  "fetch",
  function (event) {

    const request =
      event.request;


    /*
       GET만 처리
    */

    if (
      request.method !== "GET"
    ) {

      return;

    }


    const url =
      new URL(
        request.url
      );


    /* =====================================================
       뉴스 API / RSS
       =====================================================

       절대로 캐시하지 않습니다.
    */

    if (
      url.hostname ===
        "api.rss2json.com" ||

      url.hostname ===
        "api.allorigins.win" ||

      url.hostname ===
        "news.google.com"
    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )

      );

      return;

    }


    /* =====================================================
       앱 HTML
       =====================================================

       항상 네트워크 우선.
       오래된 index.html 방지.
    */

    if (
      request.mode === "navigate" ||
      url.pathname.endsWith(
        "/index.html"
      )
    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )
        .then(
          function (response) {

            /*
               최신 HTML 저장
            */

            const copy =
              response.clone();


            caches.open(
              CACHE_NAME
            )
            .then(
              function (cache) {

                cache.put(
                  request,
                  copy
                );

              }
            );


            return response;

          }
        )
        .catch(
          function () {

            /*
               네트워크가 완전히 끊긴 경우에만
               캐시 사용
            */

            return caches.match(
              request
            );

          }
        )

      );

      return;

    }


    /* =====================================================
       app.js / styles.css
       =====================================================

       항상 네트워크 우선.
       이전 버전 JS/CSS가 남는 것을 방지합니다.
    */

    if (
      url.pathname.endsWith(
        "/app.js"
      ) ||
      url.pathname.endsWith(
        "/styles.css"
      ) ||
      url.pathname.endsWith(
        "/manifest.json"
      )
    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )
        .then(
          function (response) {

            const copy =
              response.clone();


            caches.open(
              CACHE_NAME
            )
            .then(
              function (cache) {

                cache.put(
                  request,
                  copy
                );

              }
            );


            return response;

          }
        )
        .catch(
          function () {

            return caches.match(
              request
            );

          }
        )

      );

      return;

    }


    /* =====================================================
       기타 파일
       =====================================================

       일반적인 캐시 우선.
    */

    event.respondWith(

      caches.match(
        request
      )
      .then(
        function (cached) {

          if (cached) {

            return cached;

          }


          return fetch(
            request
          );

        }
      )

    );

  }
);


/* =========================================================
   메시지
   ========================================================= */

self.addEventListener(
  "message",
  function (event) {

    if (
      event.data &&
      event.data.type ===
        "SKIP_WAITING"
    ) {

      self.skipWaiting();

    }

  }
);
