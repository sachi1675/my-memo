const CACHE_NAME = 'memo-app-v3'; // ← アップデート時はここをv3, v4と増やしていきます

// キャッシュするファイルリスト
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // 他にアイコン画像などがあればここに追加
];

// ① インストール時：ファイルをキャッシュし、即座に新しいSWを強制有効化する
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    // 待機状態を作らず、インストール後すぐに古いSWを追い出して有効化する
    self.skipWaiting(); 
});

// ② アクティブ時：古いバージョンのキャッシュをきれいに削除する
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            // 現在開いているすべての画面（クライアント）を即座にこのSWの支配下に置く
            return self.clients.claim();
        })
    );
});

// ③ フェッチ時：共有データをPOSTで受け取ったらアプリに転送する
self.addEventListener('fetch', (event) => {
    // 共有データがPOSTで送られてきた場合
    if (event.request.method === 'POST' && event.request.url.includes('./')) {
        event.respondWith((async () => {
            const formData = await event.request.formData();
            const data = {
                title: formData.get('title'),
                content: formData.get('text') || formData.get('url'),
                url: formData.get('url')
            };

            // アプリ本体（クライアント）を探してデータを送信
            const clients = await self.clients.matchAll();
            for (const client of clients) {
                client.postMessage({ type: 'SHARED_DATA', data });
            }

            // 処理後、トップページへリダイレクト
            return Response.redirect('./');
        })());
        return;
    }

    // 通常のフェッチ処理
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
