/* =========================================
   북한 NEWS Monitor
   Service Worker
   안정화 버전
========================================= */

const CACHE_NAME = "nknews-pwa-v2";

const STATIC_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];


/* =========================================
   설치
========================================= */

self.addEventListener("install", function (event) {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(function (cache) {

        return cache.addAll(STATIC_FILES);

      })
      .then(function () {

        return self.skipWaiting();

      })

  );

});


/* =========================================
   활성화
   기존 캐시 삭제
========================================= */

self.addEventListener("activate", function (event) {

  event.waitUntil(

    caches.keys()
      .then(function (cacheNames) {

        return Promise.all(

          cacheNames.map(function (cacheName) {

            if (cacheName !== CACHE_NAME) {

              return caches.delete(cacheName);

            }

          })

        );

      })
      .then(function () {

        return self.clients.claim();

      })

  );

});


/* =========================================
   요청 처리
========================================= */

self.addEventListener("fetch", function (event) {

  const request = event.request;

  /*
     GET 요청만 처리
  */

  if (request.method !== "GET") {
    return;
  }


  /*
     외부 뉴스 API / RSS 요청은
     Service Worker가 캐시하지 않습니다.

     반드시 인터넷에서 직접 가져옵니다.
  */

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

    );

    return;
  }


  /*
     앱 파일은
     최신 파일을 먼저 인터넷에서 가져옵니다.

     인터넷이 안 되면
     기존 캐시를 사용합니다.
  */

  event.respondWith(

    fetch(request, {
      cache: "no-store"
    })

      .then(function (response) {

        /*
           정상 응답이면
           최신 파일을 캐시에 저장
        */

        if (response && response.ok) {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(function (cache) {

              cache.put(request, copy);

            });

        }

        return response;

      })

      .catch(function () {

        /*
           인터넷 연결 실패 시
           기존 캐시 사용
        */

        return caches.match(request);

      })

  );

});
