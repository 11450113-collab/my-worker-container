/**
 * cloudflare-worker-youtube-dl.js
 * Get direct links to YouTube videos using Cloudflare Workers.
 *
 * Usage:
 *   GET /?v=dQw4w9WgXcQ
 *   -> Returns a JSON list of supported formats
 *
 *   GET /?v=dQw4w9WgXcQ&f=251
 *   -> Returns a stream of the specified format ID
 */

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

const parseQueryString = queryString =>
  Object.assign(
    {},
    ...queryString.split("&").map(kvp => {
      kva = kvp.split("=").map(decodeURIComponent);
      return {
        [kva[0]]: kva[1]
      };
    })
  );

const getJsPlayer = async videoPage => {
  let playerURL = JSON.parse(
    /"assets":.+?"js":\s*("[^"]+")/gm.exec(videoPage)[1]
  );
  if (playerURL.startsWith("//")) playerURL = "https:" + playerURL;
  else if (!playerURL.startsWith("http"))
    playerURL = "https://www.youtube.com" + playerURL;

  const jsPlayerFetch = await fetch(playerURL);
  const jsPlayer = await jsPlayerFetch.text();
  return jsPlayer;
};

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  try {
    const query = parseQueryString(request.url.split("?")[1]);
    console.log("Parsed query", query);

    const videoId = query["v"];
    const videoPageReq = await fetch(
      `https://www.youtube.com/watch?v=${encodeURIComponent(
        videoId
      )}&gl=US&hl=en&has_verified=1&bpctr=9999999999`
    );
    const videoPage = await videoPageReq.text();

    const playerConfigRegex = /;ytplayer\.config\s*=\s*({.+?});ytplayer|;ytplayer\.config\s*=\s*({.+?});/gm;
    const playerConfig = JSON.parse(playerConfigRegex.exec(videoPage)[1]);
    const playerResponse = JSON.parse(playerConfig.args.player_response);
    const jsPlayer = await getJsPlayer(videoPage);
    const formatURLs = playerResponse.streamingData.adaptiveFormats.map(
      format => {
        let url = format.url;
        const cipher = format.signatureCipher || format.cipher;
        if (!!cipher) {
          const components = parseQueryString(cipher);

          const sig = applyActions(extractActions(jsPlayer), components.s);
          url =
            components["url"] +
            `&${encodeURIComponent(components.sp)}=${encodeURIComponent(sig)}`;
        }

        return {
          ...format,
          _decryptedURL: url
        };
      }
    );

    if ("f" in query) {
      const format = formatURLs.find(
        format => format.itag === parseInt(query.f)
      );
      const stream = await fetch(format._decryptedURL);
      const { readable, writable } = new TransformStream();
      stream.body.pipeTo(writable);
      return new Response(readable, stream);
    } else {
      return new Response(
        JSON.stringify(
          formatURLs.map(({ _decryptedURL, ...format }) => format),
          null,
          2
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(`hello world, ${JSON.stringify(query)}`, {
      status: 200
    });
  } catch (ex) {
    return new Response(
      JSON.stringify({ ok: false, message: ex.toString(), payload: ex.trace }),
      { status: 500 }
    );
  }
}

/**
 * The following code snippet taken from https://github.com/fent/node-ytdl-core
 * https://github.com/fent/node-ytdl-core/blob/5b458b8a2d9016293458330eba466ccaa9d676e2/lib/sig.js
 *
 * MIT License
 *
 * Copyright (C) 2012-present by fent
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const jsVarStr = "[a-zA-Z_\\$][a-zA-Z_0-9]*";
const jsSingleQuoteStr = `'[^'\\\\]*(:?\\\\[\\s\\S][^'\\\\]*)*'`;
const jsDoubleQuoteStr = `"[^"\\\\]*(:?\\\\[\\s\\S][^"\\\\]*)*"`;
const jsQuoteStr = `(?:${jsSingleQuoteStr}|${jsDoubleQuoteStr})`;
const jsKeyStr = `(?:${jsVarStr}|${jsQuoteStr})`;
const jsPropStr = `(?:\\.${jsVarStr}|\\[${jsQuoteStr}\\])`;
const jsEmptyStr = `(?:''|"")`;
const reverseStr =
  ":function\\(a\\)\\{" + "(?:return )?a\\.reverse\\(\\)" + "\\}";
const sliceStr = ":function\\(a,b\\)\\{" + "return a\\.slice\\(b\\)" + "\\}";
const spliceStr = ":function\\(a,b\\)\\{" + "a\\.splice\\(0,b\\)" + "\\}";
const swapStr =
  ":function\\(a,b\\)\\{" +
  "var c=a\\[0\\];a\\[0\\]=a\\[b(?:%a\\.length)?\\];a\\[b(?:%a\\.length)?\\]=c(?:;return a)?" +
  "\\}";
const actionsObjRegexp = new RegExp(
  `var (${jsVarStr})=\\{((?:(?:${jsKeyStr}${reverseStr}|${jsKeyStr}${sliceStr}|${jsKeyStr}${spliceStr}|${jsKeyStr}${swapStr}),?\\r?\\n?)+)\\};`
);
const actionsFuncRegexp = new RegExp(
  `${`function(?: ${jsVarStr})?\\(a\\)\\{` +
    `a=a\\.split\\(${jsEmptyStr}\\);\\s*` +
    `((?:(?:a=)?${jsVarStr}`}${jsPropStr}\\(a,\\d+\\);)+)` +
    `return a\\.join\\(${jsEmptyStr}\\)` +
    `\\}`
);
const reverseRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${reverseStr}`, "m");
const sliceRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${sliceStr}`, "m");
const spliceRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${spliceStr}`, "m");
const swapRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${swapStr}`, "m");

const swapHeadAndPosition = (arr, position) => {
  const first = arr[0];
  arr[0] = arr[position % arr.length];
  arr[position] = first;
  return arr;
};

const extractActions = body => {
  const objResult = actionsObjRegexp.exec(body);
  const funcResult = actionsFuncRegexp.exec(body);
  if (!objResult || !funcResult) {
    return null;
  }

  const obj = objResult[1].replace(/\$/g, "\\$");
  const objBody = objResult[2].replace(/\$/g, "\\$");
  const funcBody = funcResult[1].replace(/\$/g, "\\$");

  let result = reverseRegexp.exec(objBody);
  const reverseKey =
    result && result[1].replace(/\$/g, "\\$").replace(/\$|^'|^"|'$|"$/g, "");
  result = sliceRegexp.exec(objBody);
  const sliceKey =
    result && result[1].replace(/\$/g, "\\$").replace(/\$|^'|^"|'$|"$/g, "");
  result = spliceRegexp.exec(objBody);
  const spliceKey =
    result && result[1].replace(/\$/g, "\\$").replace(/\$|^'|^"|'$|"$/g, "");
  result = swapRegexp.exec(objBody);
  const swapKey =
    result && result[1].replace(/\$/g, "\\$").replace(/\$|^'|^"|'$|"$/g, "");

  const keys = `(${[reverseKey, sliceKey, spliceKey, swapKey].join("|")})`;
  const myreg =
    `(?:a=)?${obj}(?:\\.${keys}|\\['${keys}'\\]|\\["${keys}"\\])` +
    `\\(a,(\\d+)\\)`;
  const tokenizeRegexp = new RegExp(myreg, "g");
  const tokens = [];
  while ((result = tokenizeRegexp.exec(funcBody)) !== null) {
    let key = result[1] || result[2] || result[3];
    switch (key) {
      case swapKey:
        tokens.push(`w${result[4]}`);
        break;
      case reverseKey:
        tokens.push("r");
        break;
      case sliceKey:
        tokens.push(`s${result[4]}`);
        break;
      case spliceKey:
        tokens.push(`p${result[4]}`);
        break;
    }
  }
  return tokens;
};

const applyActions = (tokens, _sig) => {
  let sig = _sig.split("");
  for (let i = 0, len = tokens.length; i < len; i++) {
    let token = tokens[i],
      pos;
    switch (token[0]) {
      case "r":
        sig = sig.reverse();
        break;
      case "w":
        pos = ~~token.slice(1);
        sig = swapHeadAndPosition(sig, pos);
        break;
      case "s":
        pos = ~~token.slice(1);
        sig = sig.slice(pos);
        break;
      case "p":
        pos = ~~token.slice(1);
        sig.splice(0, pos);
        break;
    }
  }
  return sig.join("");
};