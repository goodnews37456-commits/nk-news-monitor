/* =====================================================
   북한 NEWS Monitor
   Service Worker - 안정화 버전
   ===================================================== */

const CACHE_NAME = "nknews-pwa-v10";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];


/* =====================================================
   설치
   ===================================================== */

self.addEventListener("install", function (event) {

  event.waitUntil(

    caches
      .open(CACHE_NAME)
      .then(function (cache) {

        return cache.addAll(APP_FILES);

      })
      .then(function () {

        /*
          새 Service Worker를
          즉시 대기 상태에서 활성화
        */

        return self.skipWaiting();

      })

  );

});


/* =====================================================
   활성화
   ===================================================== */

self.addEventListener("activate", function (event) {

  event.waitUntil(

    caches.keys()
      .then(function (cacheNames) {

        return Promise.all(

          cacheNames.map(function (cacheName) {

            /*
              현재 버전이 아닌
              이전 PWA 캐시 삭제
            */

            if (
              cacheName !== CACHE_NAME
            ) {

              return caches.delete(
                cacheName
              );

            }

            return null;

          })

        );

      })
      .then(function () {

        /*
          현재 열려 있는 페이지에도
          새 Service Worker 즉시 적용
        */

        return self.clients.claim();

      })

  );

});


/* =====================================================
   네트워크 요청
   ===================================================== */

self.addEventListener(
  "fetch",
  function (event) {

    const request =
      event.request;


    /*
      GET 요청만 처리
    */

    if (
      request.method !== "GET"
    ) {

      return;

    }


    /*
      외부 RSS/API 요청은
      Service Worker 캐시를 사용하지 않습니다.

      이것이 중요합니다.

      Google News
      RSS2JSON
      AllOrigins

      같은 외부 뉴스 데이터는
      항상 네트워크에서 가져오도록 합니다.
    */

    const url =
      new URL(
        request.url
      );


    if (
      url.hostname !==
        location.hostname
    ) {

      return;

    }


    /*
      앱 파일은
      네트워크 우선 방식으로 처리합니다.

      즉,

      1. 인터넷에서 최신 app.js 등을 가져옴
      2. 성공하면 캐시에 저장
      3. 인터넷이 안 되면 기존 캐시 사용

      이렇게 하면 오래된 app.js가
      계속 사용되는 문제를 줄일 수 있습니다.
    */

    event.respondWith(

      fetch(
        request,
        {
          cache: "no-store"
        }
      )
      .then(function (response) {

        /*
          정상 응답이면 캐시에 저장
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
          인터넷이 끊겼을 때
          캐시에서 가져오기
        */

        return caches.match(
          request
        );

      })

    );

  }
);
