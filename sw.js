const CACHE_NAME = "nknews-pwa-v2";

const APP_FILES = [
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

self.addEventListener(
  "install",
  function (event) {

    event.waitUntil(

      caches.open(CACHE_NAME)
        .then(function (cache) {

          return cache.addAll(APP_FILES);

        })

    );


    self.skipWaiting();

  }
);


/* =========================================
   활성화
   이전 캐시 삭제
========================================= */

self.addEventListener(
  "activate",
  function (event) {

    event.waitUntil(

      caches.keys()
        .then(function (keys) {

          return Promise.all(

            keys.map(function (key) {

              if (key !== CACHE_NAME) {

                return caches.delete(key);

              }

            })

          );

        })
        .then(function () {

          return self.clients.claim();

        })

    );

  }
);


/* =========================================
   요청 처리
========================================= */

self.addEventListener(
  "fetch",
  function (event) {

    /*
       뉴스 API / RSS는
       Service Worker 캐시를 사용하지 않음
    */

    if (
      event.request.url.includes(
        "rss2json.com"
      ) ||
      event.request.url.includes(
        "allorigins.win"
      ) ||
      event.request.url.includes(
        "news.google.com"
      )
    ) {

      event.respondWith(

        fetch(event.request)
          .catch(function () {

            return new Response(
              "",
              {
                status: 503,
                statusText: "Offline"
              }
            );

          })

      );

      return;

    }


    /*
       앱 파일은
       네트워크 우선으로 가져옴
    */

    event.respondWith(

      fetch(event.request)
        .then(function (response) {

          /*
             정상 응답이면 캐시 갱신
          */

          if (
            response &&
            response.status === 200
          ) {

            const copy =
              response.clone();

            caches.open(CACHE_NAME)
              .then(function (cache) {

                cache.put(
                  event.request,
                  copy
                );

              });

          }

          return response;

        })
        .catch(function () {

          /*
             인터넷이 안 될 경우
             캐시 사용
          */

          return caches.match(
            event.request
          );

        })

    );

  }
);
