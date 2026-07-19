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

// ③ フェッチ時：共有データをPOSTで受け取ったら直接データベースに保存して起動
self.addEventListener('fetch', (event) => {
    if (event.request.method === 'POST') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const data = {
                    title: formData.get('title') || '',
                    content: formData.get('text') || formData.get('url') || '',
                    url: formData.get('url') || ''
                };

                // 💡画面を介さず、SWが直接IndexedDB（ブラウザの安全な倉庫）を開いてデータを保存する
                await new Promise((resolve, reject) => {
                    const request = indexedDB.open("PWARequestStorage", 1);
                    request.onupgradeneeded = (e) => {
                        e.target.result.createObjectStore("requests", { keyPath: "id" });
                    };
                    request.onsuccess = (e) => {
                        const db = e.target.result;
                        const tx = db.transaction("requests", "readwrite");
                        tx.objectStore("requests").put({ id: "shared_data", value: data });
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject();
                    };
                    request.onerror = () => reject();
                });

            } catch (err) {
                console.error("SWでの共有データ直接保存に失敗:", err);
            }

            // データ保存後、真っ新なトップページを安全に起動
            return Response.redirect('./', 303);
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
