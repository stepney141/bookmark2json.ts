import * as fs from "fs";
import * as cheerio from "cheerio";

const inputFile: string = "imports/bookmarks_2024_05_31.html"; // 入力HTMLファイルのパス
const outputFile: string = "exports/bookmarks_2024_05_31.json"; // 出力JSONファイルのパス

type Entries = (Bookmark | Directory)[];
interface Bookmark {
  type: "bookmark";
  title: string;
  url: string;
  addDate: string | null;
  lastModified: string | null;
  icon: string | null;
}
interface Directory {
  type: "directory";
  title: string;
  addDate: string | null;
  lastModified: string | null;
  children: (Bookmark | Directory)[];
}

function isBookmark(node: cheerio.Cheerio, item: Bookmark | Directory): item is Bookmark {
  return node.is("A") || item.type === "bookmark";
}
function isDirectory(node: cheerio.Cheerio, item: Bookmark | Directory): item is Directory {
  return node.is("H3") || node.children("A").length > 0 || item.type === "directory";
}

function processNode($: cheerio.Root, element: cheerio.Cheerio): any {
  let result: (Bookmark | Directory)[] = [];

  element.children("DT").each((_, elem) => {
    const node = $(elem);
    const item = {} as Bookmark | Directory;
    const titleElement = node.find("> A, > H3").first();

    if (isBookmark(titleElement, item)) {
      item.type = "bookmark";
      item.title = titleElement.text();
      item.url = titleElement.attr("href") || "";
      item.addDate = titleElement.attr("add_date") || null;
      item.lastModified = titleElement.attr("last_modified") || null;
      item.icon = titleElement.attr("icon") || null;
    } else if (isDirectory(titleElement, item)) {
      item.type = "directory";
      item.title = titleElement.text();
      item.addDate = titleElement.attr("add_date") || null;
      item.lastModified = titleElement.attr("last_modified") || null;
    }

    const nextDl = node.children("DL");
    if (isDirectory(titleElement, item)) {
      item.children = processNode($, nextDl);
    }

    if (Object.keys(item).length !== 0) {
      result.push(item);
    }
  });

  return result;
}

function removeDirectoryfromBookmarks(nodes: Entries, dirToRemove: string): Entries {
  const cp = [...nodes];
  return cp.filter((node) => {
    if (node.type === "directory") {
      if (node.title === dirToRemove) {
        return false;
      } else {
        node.children = removeDirectoryfromBookmarks(node.children, dirToRemove);
      }
    }
    return true;
  });
}

function convertBookmarksToJSON(inputPath: string): any {
  const rawBookmarks = fs.readFileSync(inputPath, "utf8");

  const $ = cheerio.load(rawBookmarks);
  const rootDl = $("DL").first();

  const bookmarksJSON = processNode($, rootDl);

  return bookmarksJSON;
}

function writeJson(bookmarksJSON: any, outputPath: string) {
  fs.writeFile(outputPath, JSON.stringify(bookmarksJSON, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
      console.log("Bookmarks converted to JSON successfully!");
    }
  });
}

try {
  const bookmarkJson = convertBookmarksToJSON(inputFile);
  const editedBookmark = removeDirectoryfromBookmarks(bookmarkJson, "accounts");
  writeJson(editedBookmark, outputFile);
  console.log("Bookmark JSON has been successfully created.");
} catch (error) {
  console.error("Error processing the file:", error);
}
