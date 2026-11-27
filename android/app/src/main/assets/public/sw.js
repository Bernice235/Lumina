/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "92751f66a3b3f1ec37b5625e6f8b33e7"
  }, {
    "url": "index.html",
    "revision": "8b78d440356d7cfe1f8aaf3e7cb65702"
  }, {
    "url": "icon-512.png",
    "revision": "2835846c8afdf779a4f9d851a9f5011e"
  }, {
    "url": "icon-192.png",
    "revision": "fc7294d6979812394b1c3d4f9f9c068f"
  }, {
    "url": "favicon.svg",
    "revision": "b07a17832608471ce7fff5414342c906"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "7e94fea4414d8d6dc709687707d237ee"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/web-W3AdQ_ZU.js",
    "revision": null
  }, {
    "url": "assets/web-Iu5L3QPt.js",
    "revision": null
  }, {
    "url": "assets/web-Bi3nfZ4n.js",
    "revision": null
  }, {
    "url": "assets/web-60iz_ZQ9.js",
    "revision": null
  }, {
    "url": "assets/vendor-ui-Dc8ZgOCt.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-D3BqaqQI.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-COSMvYwD.js",
    "revision": null
  }, {
    "url": "assets/native-C5GRp5ZU.js",
    "revision": null
  }, {
    "url": "assets/index-BHO1VgQG.css",
    "revision": null
  }, {
    "url": "assets/index-B2LyjN6s.js",
    "revision": null
  }, {
    "url": "assets/base-Df00fWgs.js",
    "revision": null
  }, {
    "url": "assets/YogaTutorials-xjBlqEJv.js",
    "revision": null
  }, {
    "url": "assets/Wellness-BrvV2Bf5.js",
    "revision": null
  }, {
    "url": "assets/WaterTracker-7ufIE-kn.js",
    "revision": null
  }, {
    "url": "assets/Settings-BAb840G2.js",
    "revision": null
  }, {
    "url": "assets/SelfCare-XLE2O2JQ.js",
    "revision": null
  }, {
    "url": "assets/QrCodeCanvas-DlA0oCdp.js",
    "revision": null
  }, {
    "url": "assets/PrivacyDashboard-DpfOJZt_.js",
    "revision": null
  }, {
    "url": "assets/PregnancyTracker-C01VoR3z.js",
    "revision": null
  }, {
    "url": "assets/PartnerMode-Dv3LKMvM.js",
    "revision": null
  }, {
    "url": "assets/MusicRoom-Kl551hDR.js",
    "revision": null
  }, {
    "url": "assets/Education-Dvy44ely.js",
    "revision": null
  }, {
    "url": "assets/DoctorReport-DCUOM8Zy.js",
    "revision": null
  }, {
    "url": "assets/Diary-CPfYfUh-.js",
    "revision": null
  }, {
    "url": "assets/Cyclepedia-BYEai8RL.js",
    "revision": null
  }, {
    "url": "assets/AnalyticsDashboardModal-4BCQXaaA.js",
    "revision": null
  }, {
    "url": "assets/yoga/supportive-child.svg",
    "revision": null
  }, {
    "url": "assets/yoga/seated-side-bend.svg",
    "revision": null
  }, {
    "url": "assets/yoga/pelvic-floor.svg",
    "revision": null
  }, {
    "url": "assets/yoga/pelvic-bridge.svg",
    "revision": null
  }, {
    "url": "assets/yoga/legs-up-wall.svg",
    "revision": null
  }, {
    "url": "assets/yoga/diaphragmatic-breath.svg",
    "revision": null
  }, {
    "url": "assets/yoga/childs-pose.svg",
    "revision": null
  }, {
    "url": "assets/yoga/chest-opener.svg",
    "revision": null
  }, {
    "url": "assets/yoga/cat-cow.svg",
    "revision": null
  }, {
    "url": "assets/yoga/bound-angle.svg",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_6778_f510d71e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_6777_ef9383ef.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "7e94fea4414d8d6dc709687707d237ee"
  }, {
    "url": "favicon.svg",
    "revision": "b07a17832608471ce7fff5414342c906"
  }, {
    "url": "icon-192.png",
    "revision": "fc7294d6979812394b1c3d4f9f9c068f"
  }, {
    "url": "icon-512.png",
    "revision": "2835846c8afdf779a4f9d851a9f5011e"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "92751f66a3b3f1ec37b5625e6f8b33e7"
  }, {
    "url": "manifest.webmanifest",
    "revision": "a01c18b1d6f581bc7080ebfe84eb2ec1"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
