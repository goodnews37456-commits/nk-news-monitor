/* =========================================================
   북한 NEWS Monitor
   Service Worker
   PWA 안정화 버전
   ========================================================= */

const CACHE_NAME = "nknews-pwa-v3";

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
   설치
   ========================================================= */

self.addEventListener(
  "install",
  function (event) {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(function (cache) {

          return cache.addAll(APP_FILES);

        })

    );

    self.skipWaiting();

  }
);


/* =========================================================
   활성화
   ========================================================= */

self.addEventListener(
  "activate",
  function (event) {

    event.waitUntil(

      caches
        .keys()
        .then(function (cacheNames) {

          return Promise.all(

            cacheNames
              .filter(function (name) {

                return name !== CACHE_NAME;

              })
              .map(function (name) {

                return caches.delete(name);

              })

          );

        })

    );

    self.clients.claim();

  }
);


/* =========================================================
   요청 처리
   ========================================================= */

self.addEventListener(
  "fetch",
  function (event) {

    const request =
      event.request;

    /*
       GET 요청만 처리
    */

    if (request.method !== "GET") {
      return;
    }


    const url =
      new URL(request.url);


    /*
       외부 뉴스 서버 / API는
       Service Worker 캐시를 사용하지 않습니다.

       → 항상 최신 데이터를 가져오도록 함
    */

    if (
      url.hostname !== location.hostname
    ) {

      return;

    }


    /*
       우리 사이트의 파일만 처리
    */

    event.respondWith(

      fetch(request)
        .then(function (response) {

          /*
             정상 응답이면 최신 파일을
             캐시에 저장
          */

          if (
            response &&
            response.status === 200
          ) {

            const copy =
              response.clone();

            caches
              .open(CACHE_NAME)
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
             인터넷이 없을 때만
             캐시 사용
          */

          return caches.match(request)
            .then(function (cached) {

              if (cached) {
                return cached;
              }

              return caches.match(
                "./index.html"
              );

            });

        })

    );

  }
);
