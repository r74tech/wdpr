import { jsxRenderer } from "hono/jsx-renderer";
import { getClientScriptPath } from "./client-manifest";

export const renderer = jsxRenderer(({ children }) => {
  const clientScript = import.meta.env.PROD ? getClientScriptPath() : "/src/client/main.ts";
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>WikidotMock</title>
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body id="html-body">
        <div id="skrollr-body">
          <a name="page-top" />
          <div id="container-wrap-wrap">
            <div id="container-wrap">
              <div id="container">
                <div id="header">
                  <h1>
                    <a href="/">
                      <span>WikidotMock</span>
                    </a>
                  </h1>
                  <h2>
                    <span />
                  </h2>
                  <div id="search-top-box" class="form-search">
                    <form id="search-top-box-form" action="dummy" class="input-append">
                      <input
                        id="search-top-box-input"
                        class="text empty search-query"
                        type="text"
                        name="query"
                        value="Search this site"
                      />
                      <input class="button btn" type="submit" name="search" value="Search" />
                    </form>
                  </div>
                  <div id="top-bar" />
                  <div id="login-status">
                    <span />
                  </div>
                  <div id="header-extra-div-1">
                    <span />
                  </div>
                  <div id="header-extra-div-2">
                    <span />
                  </div>
                  <div id="header-extra-div-3">
                    <span />
                  </div>
                </div>
                <div id="content-wrap">
                  <div id="side-bar">
                    <div id="side-bar-actions">
                      <p>
                        <a id="btn-new-page" href="javascript:;">
                          + New Page
                        </a>
                      </p>
                    </div>
                  </div>
                  <div id="main-content">
                    <div id="page-title" />
                    <div id="page-content">{children}</div>
                    <div id="page-info-break" />
                    <div id="page-options-container">
                      <div id="page-info" />
                      <div id="page-options-bottom" class="page-options-bottom" />
                    </div>
                    <div id="page-options-area-bottom" />
                    <div id="action-area" />
                  </div>
                </div>
                <div id="footer" style={{ display: "block", visibility: "visible" }}>
                  <div class="options" style={{ display: "block", visibility: "visible" }} />
                  Powered by @wdpr commit[{import.meta.env.VITE_GIT_COMMIT_HASH}]
                </div>
                <div id="license-area" class="license-area" />
                <div id="extrac-div-1" />
                <div id="extrac-div-2" />
                <div id="extrac-div-3" />
              </div>
            </div>
            <div id="extra-div-1">
              <span />
            </div>
            <div id="extra-div-2">
              <span />
            </div>
            <div id="extra-div-3">
              <span />
            </div>
            <div id="extra-div-4">
              <span />
            </div>
            <div id="extra-div-5">
              <span />
            </div>
          </div>
        </div>
        <script type="module" src={clientScript} />
      </body>
    </html>
  );
});
