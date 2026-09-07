/* =========================================================
   북한 NEWS Monitor - sw.js
   PWA Service Worker
   캐시 문제 해결 최종본
   ========================================================= */

const CACHE_NAME = "nknews-pwa-v4";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", function (event) {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(function (cache) {

        return cache.addAll(APP_FILES);

      })
      .then(function () {

        /*
           새 Service Worker를 바로 대기 상태에서
           활성 상태로 전환할 수 있도록 합니다.
        */

        return self.skipWaiting();

      })

  );

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", function (event) {

  event.waitUntil(

    caches.keys()
      .then(function (cacheNames) {

        return Promise.all(

          cacheNames
            .filter(function (cacheName) {

              return (
                cacheName !== CACHE_NAME &&
                cacheName.startsWith("nknews-pwa-")
              );

            })
            .map(function (cacheName) {

              return caches.delete(cacheName);

            })

        );

      })
      .then(function () {

        /*
           현재 열려 있는 페이지에도
           새 Service Worker를 즉시 적용
        */

        return self.clients.claim();

      })

  );

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", function (event) {

  const request = event.request;

  /*
     GET 요청만 처리
  */

  if (request.method !== "GET") {
    return;
  }


  const url = new URL(request.url);


  /*
     외부 API / RSS / 뉴스 데이터는
     Service Worker 캐시를 사용하지 않습니다.

     항상 최신 데이터를 네트워크에서 가져옵니다.
  */

  if (
    url.hostname.includes("rss2json.com") ||
    url.hostname.includes("allorigins.win") ||
    url.hostname.includes("news.google.com")
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

    );

    return;
  }


  /*
     app.js / index.html / styles.css /
     manifest는 Network First 방식

     GitHub Pages에 새 파일이 올라오면
     이전 캐시보다 최신 파일을 우선 사용합니다.
  */

  const pathname = url.pathname;

  if (
    pathname.endsWith("/") ||
    pathname.endsWith("index.html") ||
    pathname.endsWith("app.js") ||
    pathname.endsWith("styles.css") ||
    pathname.endsWith("manifest.webmanifest")
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

        .then(function (response) {

          /*
             정상 응답이면 최신 파일을 캐시에 저장
          */

          if (
            response &&
            response.ok
          ) {

            const copy =
              response.clone();

            caches.open(CACHE_NAME)
              .then(function (cache) {

                cache.put(
                  request,
                  copy
                );

              });

          }

          return response;

        })

        .catch(function () {

          /*
             네트워크가 안 되는 경우에만
             기존 캐시 사용
          */

          return caches.match(request);

        })

    );

    return;
  }


  /*
     이미지 / 아이콘 등 정적 파일

     Cache First 방식
  */

  event.respondWith(

    caches.match(request)
      .then(function (cached) {

        if (cached) {

          return cached;

        }


        return fetch(request)
          .then(function (response) {

            if (
              response &&
              response.ok
            ) {

              const copy =
                response.clone();

              caches.open(CACHE_NAME)
                .then(function (cache) {

                  cache.put(
                    request,
                    copy
                  );

                });

            }

            return response;

          });

      })

  );

});


/* =========================================================
   MESSAGE
   ========================================================= */

self.addEventListener("message", function (event) {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});
