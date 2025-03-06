const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();
const port = 3000;
const router = express.Router();

app.use(cors());

const ENTRY_DOMAIN = process.env.ENTRY_DOMAIN;
const RD_TOKEN = process.env.RD_TOKEN;

var ALLOW_MANIFEST = false;
const MANIFEST = {
  catalogs: [],
  description: "Files from Google Drive",
  id: "billybishop4.stremio.googledrive",
  logo: "https://fonts.gstatic.com/s/i/productlogos/drive_2020q4/v8/web-512dp/logo_drive_2020q4_color_1x_web_512dp.png",
  name: "GDrive",
  resources: ["stream"],
  types: ["movie", "series"],
  version: "3.0.0",
};
var ACTIVITY = [];

router.get("/manifest.json", (req, res) => {
  if (req.query.a) {
    if (req.query.a == "y") {
      ALLOW_MANIFEST = true;
    } else if (req.query.a == "n") {
      ALLOW_MANIFEST = false;
    } else {
      res.send("null");
      return;
    }
  }

  if (ALLOW_MANIFEST) {
    res.json(MANIFEST);
  } else {
    res.send("null");
  }
});

router.get("/stream/:type/:tt.json", async (req, res) => {
  res.json(await getTorrentio(req.params.type, req.params.tt));
});

router.get("/unrestrict/:b64url", async (req, res) => {
  res.redirect(302, await unrestrictTorrentio(req.params.b64url));
  saveActivity(req.params.b64url, req.ip);
});

router.get("/activity", async (req, res) => {
  const activity = [...ACTIVITY];
  activity.reverse();
  res.json(activity);
});

app.use("/gdrive", router);
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function getTorrentio(type, tt) {
  const url = `https://torrentio.strem.fun/sort=size|debridoptions=nodownloadlinks,nocatalog|realdebrid=${RD_TOKEN}/stream/${type}/${tt}.json`;
  return fetch(url)
    .then((res) => res.json())
    .then((res) => {
      res.streams.forEach((x) => {
        x.name = x.name
          .replace("Torrentio\n", "")
          .replace("[RD+] ", "GDrive\n")
          .replace("[RD download] ", "GDrive[download]\n");

        x.url = `http://${ENTRY_DOMAIN}/gdrive/unrestrict/${btoa(
          x.url.replace(RD_TOKEN, "RD_TOKEN")
        )}`;
      });
      return res;
    });
}

function unrestrictTorrentio(b64url) {
  return fetch(atob(b64url).replace("RD_TOKEN", RD_TOKEN), {
    redirect: "manual",
  }).then((res) => {
    const urlObj = new URL(res.headers.get("location"));
    const currentHost = urlObj.hostname;
    urlObj.hostname = ENTRY_DOMAIN;
    urlObj.protocol = "http:";

    return `${urlObj.toString()}?domain=${currentHost}`;
  });
}

async function saveActivity(b64url, ip) {
  const fileUrl = atob(b64url);
  const fileName = decodeURIComponent(
    fileUrl.substring(fileUrl.lastIndexOf("/") + 1)
  );
  const date = new Date();
  const dateTime = date.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });

  if (
    ACTIVITY.length > 0 &&
    ACTIVITY[ACTIVITY.length - 1].fileName == fileName
  ) {
    return;
  }

  ACTIVITY.push({
    fileName,
    dateTime,
    ip,
  });

  if (ACTIVITY.length == 30) {
    ACTIVITY.shift();
  }
}
